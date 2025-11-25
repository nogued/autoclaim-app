from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db, engine
from app.models import (
    Claim, DamageAssessment, RepairEstimate, SeniorReview, SystemLog, DamageCostReference, RepairShop
)
from app.agents.mock_agent import MockAgent

app = FastAPI(title="Claims Processing API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agent
agent = MockAgent()




class DamageAssessmentItem(BaseModel):
    damage_type: str
    severity: str

class GenerateEstimateRequest(BaseModel):
    damage_assessment_id: Optional[int] = None
    damage_labels: Optional[List[str]] = None
    # Kept for backward compatibility/fallback purposes when damage_assessments is not provided
    damage_severity: Optional[str] = None  # minor or major (deprecated, use damage_assessments)
    damage_assessments: Optional[List[DamageAssessmentItem]] = None


class ClaimApprovalAuthorizationRequest(BaseModel):
    """Request model for Claim Approval & Authorization stage."""
    estimate_id: Optional[int] = None
    estimate_data: Optional[Dict[str, Any]] = None


class ClaimDenialRequest(BaseModel):
    """Request model for Claim Approval & Authorization: claim denial."""
    estimate_id: Optional[int] = None
    denial_comments: str


@app.get("/")
def root():
    return {"message": "Claims Processing API"}


@app.post("/api/analyze-damage")
async def analyze_damage(
    image: UploadFile = File(...),
    policy_number: Optional[str] = Form(None),
    accident_description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Analyze damage from claim submission with uploaded image."""
    try:
        # Validate image file
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image for basic analysis
        image_filename = image.filename or "unknown"
        image_content_type = image.content_type or "image/unknown"
        image_bytes = await image.read()
        
        # Call agent with image data for basic analysis
        payload = {
            "policy_number": policy_number,
            "accident_description": accident_description,
            "image_filename": image_filename,
            "image_content_type": image_content_type,
            "image_bytes": image_bytes  # Pass image bytes for analysis
        }
        result = agent.analyze_damage(payload)

        # Create or get claim
        claim = Claim(policy_number=policy_number)
        db.add(claim)
        db.flush()

        # Store damage assessment
        assessment = DamageAssessment(
            claim_id=claim.id,
            assessment_data=result
        )
        db.add(assessment)
        db.flush()

        # Log to system
        log = SystemLog(
            log_type="damage_analysis",
            log_data={"claim_id": claim.id, "result": result, "image_filename": image_filename}
        )
        db.add(log)

        db.commit()

        return {
            "success": True,
            "assessment_id": assessment.id,
            "claim_id": claim.id,
            "result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-estimate")
async def generate_estimate(
    request: GenerateEstimateRequest,
    db: Session = Depends(get_db)
):
    """Generate repair estimate from damage assessment using cost reference table."""
    try:
        # Use damage_assessments if provided, otherwise fall back to damage_labels + damage_severity
        if request.damage_assessments and len(request.damage_assessments) > 0:
            # Query for each assessment separately
            cost_refs = []
            for assessment in request.damage_assessments:
                # Normalize damage_type
                damage_type = assessment.damage_type
                if damage_type == 'structural damage':
                    damage_type = 'structural_damage'
                
                if damage_type not in ['scratches', 'dents', 'structural_damage']:
                    continue
                
                if assessment.severity not in ['minor', 'major']:
                    continue
                
                ref = db.query(DamageCostReference).filter(
                    DamageCostReference.damage_type == damage_type,
                    DamageCostReference.damage_severity == assessment.severity
                ).first()
                
                if ref:
                    cost_refs.append(ref)
        else:
            # Fallback to old method for backward compatibility
            if not request.damage_labels or len(request.damage_labels) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="damage_labels or damage_assessments are required"
                )
            
            if not request.damage_severity or request.damage_severity not in ['minor', 'major']:
                raise HTTPException(
                    status_code=400,
                    detail="damage_severity must be 'minor' or 'major' when using damage_labels"
                )

            # Map frontend labels to database values
            label_mapping = {
                'scratches': 'scratches',
                'dents': 'dents',
                'structural damage': 'structural_damage',
                'structural_damage': 'structural_damage'
            }
            
            # Normalize damage labels
            normalized_labels = []
            for label in request.damage_labels:
                normalized = label_mapping.get(label.lower(), label.lower())
                if normalized in ['scratches', 'dents', 'structural_damage']:
                    normalized_labels.append(normalized)

            if not normalized_labels:
                raise HTTPException(
                    status_code=400,
                    detail="No valid damage labels provided. Must be: scratches, dents, or structural damage"
                )

            # Query damage_cost_reference table
            cost_refs = db.query(DamageCostReference).filter(
                DamageCostReference.damage_type.in_(normalized_labels),
                DamageCostReference.damage_severity == request.damage_severity
            ).all()

        if not cost_refs:
            raise HTTPException(
                status_code=404,
                detail="No cost reference found for the provided damage assessments"
            )

        # Calculate totals
        total_base_cost = sum(ref.base_cost for ref in cost_refs)
        total_parts_cost = sum(ref.parts_cost for ref in cost_refs)
        total_labor_hours = sum(float(ref.labor_hours) for ref in cost_refs)
        total_labor_cost = total_labor_hours * 100  # $100/hour

        # Build line items
        line_items = []
        for ref in cost_refs:
            line_items.append({
                "damage_type": ref.damage_type,
                "damage_severity": ref.damage_severity,
                "base_cost": ref.base_cost,
                "parts_cost": ref.parts_cost,
                "labor_hours": float(ref.labor_hours),
                "labor_cost": float(ref.labor_hours) * 100,
                "notes": ref.notes
            })

        # Build result
        result = {
            "total_base_cost": total_base_cost,
            "total_parts_cost": total_parts_cost,
            "total_labor_hours": total_labor_hours,
            "total_labor_cost": total_labor_cost,
            "line_items": line_items
        }

        # Get damage assessment if provided
        damage_assessment_id = request.damage_assessment_id
        claim_id = None
        if damage_assessment_id:
            assessment = db.query(DamageAssessment).filter(
                DamageAssessment.id == damage_assessment_id
            ).first()
            if assessment:
                claim_id = assessment.claim_id

        # Store repair estimate
        estimate = RepairEstimate(
            claim_id=claim_id,
            damage_assessment_id=damage_assessment_id,
            estimate_data=result
        )
        db.add(estimate)
        db.flush()

        # Log to system
        log = SystemLog(
            log_type="estimate_generation",
            log_data={"estimate_id": estimate.id, "result": result}
        )
        db.add(log)

        db.commit()

        return {
            "success": True,
            "estimate_id": estimate.id,
            "result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/review-estimate")
async def approve_and_authorize_claim(
    request: ClaimApprovalAuthorizationRequest,
    db: Session = Depends(get_db)
):
    """Claim Approval & Authorization: Review and approve/reject estimate."""
    try:
        # Call agent for Claim Approval & Authorization
        payload = request.model_dump()
        result = agent.review_estimate(payload)  # Agent interface method name unchanged for compatibility

        # Get repair estimate if provided
        estimate_id = request.estimate_id
        claim_id = None
        if estimate_id:
            estimate = db.query(RepairEstimate).filter(
                RepairEstimate.id == estimate_id
            ).first()
            if estimate:
                claim_id = estimate.claim_id

        # Store Claim Approval & Authorization review
        review = SeniorReview(
            claim_id=claim_id,
            repair_estimate_id=estimate_id,
            review_data=result
        )
        db.add(review)
        db.flush()

        # Log to system
        log = SystemLog(
            log_type="claim_approval_authorization",  # Claim Approval & Authorization stage
            log_data={"review_id": review.id, "result": result}
        )
        db.add(log)

        db.commit()

        return {
            "success": True,
            "review_id": review.id,
            "result": result
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/deny-claim")
async def deny_claim_authorization(
    request: ClaimDenialRequest,
    db: Session = Depends(get_db)
):
    """Claim Approval & Authorization: Deny a claim with comments."""
    try:
        # Store denial in database
        claim_id = None
        if request.estimate_id:
            estimate = db.query(RepairEstimate).filter(
                RepairEstimate.id == request.estimate_id
            ).first()
            if estimate:
                claim_id = estimate.claim_id

        # Store Claim Approval & Authorization denial review
        review = SeniorReview(
            claim_id=claim_id,
            repair_estimate_id=request.estimate_id,
            review_data={
                "status": "denied",
                "denial_comments": request.denial_comments,
                "review_timestamp": datetime.utcnow().isoformat()
            }
        )
        db.add(review)
        db.flush()

        # Log to system
        log = SystemLog(
            log_type="claim_denial",
            log_data={"review_id": review.id, "comments": request.denial_comments}
        )
        db.add(log)

        db.commit()

        return {
            "success": True,
            "review_id": review.id,
            "status": "denied"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/approved-repair-shops")
async def get_approved_repair_shops(db: Session = Depends(get_db)):
    """Claim Approval & Authorization: Get all approved repair shops."""
    try:
        shops = db.query(RepairShop).filter(RepairShop.is_approved == True).all()
        return {
            "success": True,
            "repair_shops": [
                {
                    "id": shop.id,
                    "name": shop.name,
                    "address": shop.address,
                    "phone": shop.phone
                }
                for shop in shops
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

