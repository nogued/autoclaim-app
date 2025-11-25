# Claims Processing Workflow Application

A workflow web application for processing insurance claims with AI-assisted damage analysis, cost estimation, and senior agent approval workflows.

## Architecture

- **Backend**: FastAPI (Python) with PostgreSQL database
- **Frontend**: Next.js (React) with TypeScript
- **Database**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **Agent System**: Modular agent interface with mock implementation (easily swappable for real AI services)

## Workflow Overview

The application consists of four sequential pages that guide users through the complete claim processing workflow:

1. **Initial Claim Report** (`pages/index.tsx`) - Placeholder page where policyholders would submit claim information
2. **Claim Damage & Cost Assessment** (`pages/claim-damage-cost-assessment.tsx`) - Jr Agent workflow for damage analysis and cost estimation
3. **Claim Approval & Authorization** (`pages/claim-approval-authorization.tsx`) - Sr Agent workflow for reviewing and approving/denying claims
4. **Repair & Claim Closure** (`pages/repair-claim-closure.tsx`) - Placeholder page for repair shop coordination and claim closure

## Automation Modes

The Claim Damage & Cost Assessment page supports three processing modes:

### 1. Assisted Cost Estimate
- User manually triggers damage analysis after uploading an image
- User manually triggers cost estimation after confirming damage analysis
- Full manual control over each step

### 2. Automated Cost Estimate
- After image upload, automatically:
  - Analyzes damage (calls `/api/analyze-damage`)
  - Generates cost estimate (calls `/api/generate-estimate`)
  - Shows processing modal with status updates
  - Navigates to Claim Approval & Authorization page
- User still needs to manually approve/deny in the Sr Agent page

### 3. Fully Automated Cost Estimate and Approval
- After image upload, automatically:
  - Analyzes damage (calls `/api/analyze-damage`)
  - Generates cost estimate (calls `/api/generate-estimate`)
  - Navigates to Claim Approval & Authorization page
  - Automatically approves the claim (calls `/api/review-estimate` and `/api/approved-repair-shops`)
- Complete end-to-end automation with no manual intervention

## Agent Workflows

### Jr Agent Flow (Claim Damage & Cost Assessment)

The Jr Agent is responsible for:
1. **Image Upload**: Upload vehicle damage images
2. **Damage Analysis**: 
   - AI analyzes the uploaded image to detect damage types (scratches, dents, structural damage)
   - AI classifies severity (minor/major) for each damage type
   - AI provides reasoning text explaining the analysis
   - Jr Agent can override AI results with manual selections
3. **Cost Estimation**:
   - System queries `damage_cost_reference` table based on confirmed damage assessments
   - Calculates total costs (parts, labor, base cost)
   - Jr Agent can override costs for individual damage items
4. **Submission**: Sends completed assessment to Sr Agent for review

**Override Capabilities**:
- Damage Analysis override: Select different damage types/severities and add notes
- Cost Estimation override: Adjust parts and labor costs per damage item
- All overrides include notes that are appended to AI reasoning for future model training

### Sr Agent Flow (Claim Approval & Authorization)

The Sr Agent reviews the Jr Agent's work:
1. **Review Summary**: Displays uploaded image, damage assessments, reasoning, and cost estimates
2. **Decision**: Can approve or deny the claim
3. **Approval**: 
   - Calls `/api/review-estimate` to record approval
   - Fetches approved repair shops via `/api/approved-repair-shops`
   - Displays approved amount and repair shop list
4. **Denial**: 
   - Requires denial comments
   - Calls `/api/deny-claim` to record denial
   - Claim is closed (no further workflow)

## Data Persistence

### Frontend State Management
- **React State**: Component-level state for UI interactions
- **localStorage**: Persists claim data between page navigations
  - Keys follow pattern: `claimDamageCostAssessment_*` for Jr Agent data
  - Keys like `confirmedDamageAssessments`, `costEstimate`, `uploadedImagePreview` for cross-page data
  - `fullyAutomatedMode` flag triggers auto-approval in Sr Agent page

### Backend Database
- All API calls write to PostgreSQL database
- JSON fields store complete request/response data for audit trails
- System logs record all operations for debugging and analytics

## API Endpoints

### Claim Damage & Cost Assessment APIs

**`POST /api/analyze-damage`**
- Accepts: Image file (multipart/form-data), optional policy_number, optional accident_description
- Returns: Assessment ID, claim ID, and damage analysis result (labels, severity, reasoning)
- Writes to: `claims`, `damage_assessments`, `system_logs` tables

**`POST /api/generate-estimate`**
- Accepts: `damage_assessments` array (damage_type + severity), optional `damage_assessment_id`
- Returns: Estimate ID, total costs (base, parts, labor), and line items
- Reads from: `damage_cost_reference` table for cost lookup
- Writes to: `repair_estimates`, `system_logs` tables

### Claim Approval & Authorization APIs

**`POST /api/review-estimate`**
- Accepts: Optional `estimate_id`, optional `estimate_data`
- Returns: Review ID and approval result (status, approved_amount, reasoning)
- Writes to: `senior_reviews`, `system_logs` tables

**`POST /api/deny-claim`**
- Accepts: Optional `estimate_id`, required `denial_comments`
- Returns: Review ID and denied status
- Writes to: `senior_reviews`, `system_logs` tables

**`GET /api/approved-repair-shops`**
- Returns: Array of approved repair shops (id, name, address, phone)
- Reads from: `repair_shops` table (filtered by `is_approved = True`)

## Database Models

### Core Tables

**`claims`**
- Root claim record with policy_number and timestamps

**`damage_assessments`**
- Stores AI damage analysis results (JSON: labels, severity, reasoning)
- Linked to claims via `claim_id`

**`repair_estimates`**
- Stores cost estimates (JSON: totals, line items)
- Linked to claims and damage_assessments

**`senior_reviews`**
- Stores Sr Agent approval/denial decisions (JSON: status, comments, approved_amount)
- Linked to claims and repair_estimates

**`system_logs`**
- Audit log for all API operations
- Stores operation type and complete request/response data

### Reference Tables

**`damage_cost_reference`**
- Reference data for cost lookup by damage_type and damage_severity
- Columns: damage_type, damage_severity, base_cost, parts_cost, labor_hours, notes
- Seeded with standard repair costs

**`repair_shops`**
- Approved repair shop information
- Columns: name, is_approved, address, phone

## Modular AI Agent Interface

The application uses a modular agent architecture that allows easy swapping of AI implementations:

### Agent Interface (`app/agents/agent_interface.py`)
Defines three abstract methods:
- `analyze_damage(payload)` - Analyzes vehicle damage from image
- `generate_estimate(payload)` - Generates cost estimate from damage data
- `review_estimate(payload)` - Reviews and approves/denies estimate

### Mock Agent (`app/agents/mock_agent.py`)
Current implementation provides:
- Basic image analysis using Pillow and NumPy
- Varied responses based on image properties
- Hardcoded cost calculations and approval logic
- Can be replaced with real AI service (OpenAI, Anthropic, etc.) without changing API code

## Override System and Model Improvement

The application includes an override system that allows agents to correct AI decisions:

### How Overrides Work

1. **Damage Analysis Override**:
   - Jr Agent can manually select damage types and severities
   - Optional notes field for override reasoning
   - Override notes are appended to AI reasoning text
   - Original AI analysis is cleared, only manual selections remain

2. **Cost Estimation Override**:
   - Jr Agent can adjust parts and labor costs per damage item
   - Optional notes field for override reasoning
   - Override values replace AI estimates in calculations
   - Falls back to original estimates if override fields are empty

3. **Claim Denial**:
   - Sr Agent can deny claims with required comments
   - Denial comments explain why AI/previous decisions were incorrect

### Contribution to Model Improvement

All overrides include a message: *"Your override helps improve future AI performance. This information may be used for training and reinforcement learning."*

- Override data (selections, costs, notes) is stored in localStorage and can be collected for training
- Denial comments provide negative feedback for model improvement
- System logs record all override actions for analysis
- Future implementation can feed this data into model fine-tuning pipelines

## Naming Conventions

### Frontend Pages and Components
- `InitialClaimReport` - Component for Initial Claim Report page
- `ClaimDamageCostAssessment` - Component for Claim Damage & Cost Assessment page
- `ClaimApprovalAuthorization` - Component for Claim Approval & Authorization page
- `RepairClaimClosure` - Component for Repair & Claim Closure page

### State Variables (camelCase)
- `damageAnalysisStatus` - Status of Damage Analysis section (locked/active/completed)
- `costEstimationStatus` - Status of Cost Estimation section (locked/active/completed)
- `showDamageAnalysisOverride` - Visibility flag for Damage Analysis override form
- `showCostEstimationOverride` - Visibility flag for Cost Estimation override form
- `damageAnalysisOverrideNotes` - Notes from Damage Analysis override

### localStorage Keys
- `claimDamageCostAssessment_*` - Prefix for all Jr Agent page data
- `claimDamageCostAssessment_damageAnalysisStatus` - Damage Analysis section status
- `claimDamageCostAssessment_costEstimationStatus` - Cost Estimation section status
- `claimDamageCostAssessment_damageAnalysisOverrideNotes` - Damage Analysis override notes
- `fullyAutomatedMode` - Flag for fully automated mode auto-approval

### Backend (snake_case)
- All Python functions and variables use snake_case
- Database table and column names use snake_case

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 18+
- PostgreSQL

### Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL database:
```bash
createdb claims_db
```

4. Configure database URL (optional, defaults to `postgresql://<username>@localhost:5432/claims_db`):
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. Run Alembic migrations:
```bash
alembic upgrade head
```

6. Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Application Structure

### Backend

- `app/main.py` - FastAPI application with all API endpoints
- `app/models.py` - SQLAlchemy ORM models for database tables
- `app/database.py` - Database connection and session management
- `app/agents/agent_interface.py` - Abstract agent interface definition
- `app/agents/mock_agent.py` - Mock agent implementation with basic image analysis
- `alembic/` - Database migration scripts

### Frontend

- `pages/index.tsx` - Initial Claim Report page
- `pages/claim-damage-cost-assessment.tsx` - Claim Damage & Cost Assessment page (Jr Agent)
- `pages/claim-approval-authorization.tsx` - Claim Approval & Authorization page (Sr Agent)
- `pages/repair-claim-closure.tsx` - Repair & Claim Closure page
- `styles/globals.css` - Global CSS styles

## How Automation Modes Operate

### Assisted Mode
1. User uploads image
2. User clicks "Analyze Damage" → calls `/api/analyze-damage`
3. User confirms or overrides damage analysis
4. User clicks "Generate Estimate" → calls `/api/generate-estimate`
5. User confirms or overrides cost estimate
6. User clicks "Send claim to Sr. Agent for Approval"
7. Navigates to Claim Approval & Authorization page

### Automated Mode
1. User uploads image
2. System automatically:
   - Shows processing modal
   - Calls `/api/analyze-damage`
   - Calls `/api/generate-estimate`
   - Saves data to localStorage
   - Navigates to Claim Approval & Authorization page
3. User manually approves/denies in Sr Agent page

### Fully Automated Mode
1. User uploads image
2. System automatically:
   - Shows processing modal
   - Calls `/api/analyze-damage`
   - Calls `/api/generate-estimate`
   - Sets `fullyAutomatedMode` flag in localStorage
   - Navigates to Claim Approval & Authorization page
3. Claim Approval & Authorization page detects flag and automatically:
   - Calls `/api/review-estimate` (approval)
   - Calls `/api/approved-repair-shops`
   - Clears `fullyAutomatedMode` flag
   - Displays approved claim with repair shops

## Extending the Application

### Adding a New AI Agent

1. Implement the three methods from `AgentInterface` in `app/agents/agent_interface.py`
2. Create a new agent class (e.g., `OpenAIAgent`, `AnthropicAgent`)
3. Update `app/main.py` to instantiate your agent instead of `MockAgent`
4. No other code changes required

### Adding New Workflow Steps

1. Create new page component in `pages/`
2. Add navigation routes in Next.js
3. Update localStorage keys if needed for data persistence
4. Add any required API endpoints in `app/main.py`
5. Update database models if new data structures are needed

### Customizing Cost Reference Data

1. Update `damage_cost_reference` table via Alembic migration
2. Modify seed data in migration files
3. Cost estimation will automatically use updated reference data
