from typing import Dict, Any
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
from app.agents.agent_interface import AgentInterface


class MockAgent(AgentInterface):
    """Mock implementation of the agent interface with hardcoded responses."""

    def analyze_damage(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Return mock damage analysis based on basic image analysis."""
        damage_labels = []
        damage_assessments = []
        
        # Try to analyze the image if bytes are provided
        image_bytes = payload.get("image_bytes")
        if image_bytes:
            try:
                # Load image
                img = Image.open(BytesIO(image_bytes))
                img = img.convert('RGB')
                
                # Resize for faster processing (max 800px on longest side)
                img.thumbnail((800, 800), Image.Resampling.LANCZOS)
                
                # Convert to numpy array for analysis
                img_array = np.array(img)
                
                # Basic image analysis
                # 1. Detect edges (potential scratches)
                gray = img.convert('L')
                edges = gray.filter(ImageFilter.FIND_EDGES)
                edge_array = np.array(edges)
                edge_intensity = np.mean(edge_array)
                
                # 2. Detect dark spots (potential dents)
                dark_threshold = 50  # Pixels darker than this
                dark_pixels = np.sum(img_array[:, :, :].mean(axis=2) < dark_threshold)
                dark_ratio = dark_pixels / (img_array.shape[0] * img_array.shape[1])
                
                # 3. Detect contrast variations (potential damage areas)
                contrast = ImageEnhance.Contrast(gray)
                high_contrast = contrast.enhance(2.0)
                contrast_array = np.array(high_contrast)
                contrast_variance = np.var(contrast_array)
                
                # 4. Detect linear features (scratches)
                # Use edge detection and look for linear patterns
                edge_threshold = 100
                strong_edges = np.sum(edge_array > edge_threshold)
                edge_ratio = strong_edges / (edge_array.shape[0] * edge_array.shape[1])
                
                # Determine damage types based on analysis
                # Scratches: High edge intensity and linear patterns
                if edge_intensity > 30 or edge_ratio > 0.05:
                    scratches_severity = "major" if edge_intensity > 50 or edge_ratio > 0.1 else "minor"
                    damage_labels.append("scratches")
                    damage_assessments.append({"damage_type": "scratches", "severity": scratches_severity})
                
                # Dents: Dark spots/areas
                if dark_ratio > 0.02:
                    dents_severity = "major" if dark_ratio > 0.05 else "minor"
                    damage_labels.append("dents")
                    damage_assessments.append({"damage_type": "dents", "severity": dents_severity})
                
                # Structural damage: High contrast variance (indicates significant damage)
                if contrast_variance > 500:
                    structural_severity = "major" if contrast_variance > 1000 else "minor"
                    damage_labels.append("structural_damage")
                    damage_assessments.append({"damage_type": "structural_damage", "severity": structural_severity})
                
            except Exception as e:
                # If analysis fails, fall back to filename-based variation
                pass
        
        # Fallback to filename-based variation if no image analysis or no damage detected
        if not damage_labels:
            image_filename = payload.get("image_filename", "default.jpg")
            filename_hash = hash(image_filename) % 4
            
            variations = [
                {
                    "damage_labels": ["scratches", "dents"],
                    "damage_assessments": [
                        {"damage_type": "scratches", "severity": "minor"},
                        {"damage_type": "dents", "severity": "major"}
                    ],
                    "reasoning": "Analysis of the vehicle image reveals multiple surface-level scratches consistent with contact damage, along with several minor dents in the front bumper area. The scratches appear to be primarily paint-deep with no underlying structural concerns visible. The dents are localized and do not appear to affect critical structural components."
                },
                {
                    "damage_labels": ["scratches"],
                    "damage_assessments": [
                        {"damage_type": "scratches", "severity": "major"}
                    ],
                    "reasoning": "The image analysis indicates extensive paint scratches across the vehicle's surface. The damage appears to be deep scratches that may require repainting of affected panels. No structural damage is detected."
                },
                {
                    "damage_labels": ["dents", "structural_damage"],
                    "damage_assessments": [
                        {"damage_type": "dents", "severity": "minor"},
                        {"damage_type": "structural_damage", "severity": "minor"}
                    ],
                    "reasoning": "Assessment reveals multiple dents in various locations, with some minor structural concerns detected in the frame alignment. The dents are relatively shallow but the structural component requires professional evaluation."
                },
                {
                    "damage_labels": ["scratches", "dents", "structural_damage"],
                    "damage_assessments": [
                        {"damage_type": "scratches", "severity": "major"},
                        {"damage_type": "dents", "severity": "major"},
                        {"damage_type": "structural_damage", "severity": "major"}
                    ],
                    "reasoning": "Comprehensive analysis shows significant damage across multiple categories. Deep scratches are present along with substantial dents. Most concerning is the detection of major structural damage that will require extensive repair work and professional assessment."
                }
            ]
            
            selected = variations[filename_hash]
            damage_labels = selected["damage_labels"]
            damage_assessments = selected["damage_assessments"]
            reasoning = selected["reasoning"]
        else:
            # Generate reasoning based on detected damage
            reasoning_parts = []
            if "scratches" in damage_labels:
                scratches_assess = next((a for a in damage_assessments if a["damage_type"] == "scratches"), None)
                severity = scratches_assess["severity"] if scratches_assess else "minor"
                if severity == "major":
                    reasoning_parts.append("Extensive paint scratches detected across the vehicle surface, indicating significant contact damage.")
                else:
                    reasoning_parts.append("Surface-level scratches identified, primarily affecting the paint layer.")
            
            if "dents" in damage_labels:
                dents_assess = next((a for a in damage_assessments if a["damage_type"] == "dents"), None)
                severity = dents_assess["severity"] if dents_assess else "minor"
                if severity == "major":
                    reasoning_parts.append("Substantial dents detected in multiple areas, suggesting significant impact.")
                else:
                    reasoning_parts.append("Minor dents identified in localized areas.")
            
            if "structural_damage" in damage_labels:
                structural_assess = next((a for a in damage_assessments if a["damage_type"] == "structural_damage"), None)
                severity = structural_assess["severity"] if structural_assess else "minor"
                if severity == "major":
                    reasoning_parts.append("Major structural damage detected, requiring professional evaluation and extensive repair work.")
                else:
                    reasoning_parts.append("Minor structural concerns identified that may require professional assessment.")
            
            if not reasoning_parts:
                reasoning_parts.append("Image analysis completed. No significant damage patterns detected.")
            
            reasoning = " ".join(reasoning_parts)
        
        return {
            "status": "success",
            "damage_labels": damage_labels,
            "damage_assessments": damage_assessments,
            "reasoning": reasoning
        }

    def generate_estimate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Return mock repair estimate."""
        return {
            "status": "success",
            "total_cost": 2450.00,
            "currency": "USD",
            "breakdown": {
                "parts": 1200.00,
                "labor": 1000.00,
                "paint": 200.00,
                "misc": 50.00
            },
            "estimated_repair_time_days": 5,
            "parts_required": [
                {"name": "Front Bumper Cover", "cost": 800.00},
                {"name": "Headlight Assembly", "cost": 400.00}
            ]
        }

    def review_estimate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Claim Approval & Authorization: Return mock review result based on the estimate data."""
        # Calculate approved amount from estimate data if available
        approved_amount = 2450.00  # Default fallback
        estimate_data = payload.get("estimate_data", {})
        
        if estimate_data:
            # Use total_parts_cost + total_labor_cost if available
            total_parts_cost = estimate_data.get("total_parts_cost", 0)
            total_labor_cost = estimate_data.get("total_labor_cost", 0)
            if total_parts_cost or total_labor_cost:
                approved_amount = total_parts_cost + total_labor_cost
            # Fallback to total_base_cost if parts/labor not available
            elif "total_base_cost" in estimate_data:
                approved_amount = estimate_data["total_base_cost"]
        
        return {
            "status": "approved",
            "reviewer_id": "senior_reviewer_001",
            "review_timestamp": "2024-01-15T10:30:00Z",
            "approved_amount": approved_amount,
            "notes": "Estimate within acceptable range. Approved for processing.",
            "requires_additional_approval": False
        }

