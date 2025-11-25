import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

interface ApiResponse {
  success: boolean
  result?: any
  estimate_id?: number
  review_id?: number
}

export default function ClaimApprovalAuthorization() {
  const router = useRouter()
  
  // State for Sr Agent review
  const [review, setReview] = useState<ApiResponse | null>(null)
  const [claimStatus, setClaimStatus] = useState<'pending' | 'approved' | 'denied'>('pending')
  const [denyComments, setDenyComments] = useState('')
  const [showDenyForm, setShowDenyForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approvedRepairShops, setApprovedRepairShops] = useState<Array<{id: number, name: string, address?: string, phone?: string}>>([])
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  
  // Guard ref to prevent duplicate auto-approval execution
  const autoApprovalTriggeredRef = useRef(false)
  
  // Data from Claim Damage & Cost Assessment (Jr Agent)
  const [confirmedDamageAssessments, setConfirmedDamageAssessments] = useState<Array<{damage_type: string, severity: string}>>([])
  const [costEstimate, setCostEstimate] = useState<ApiResponse | null>(null)
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null)
  const [damageReasoning, setDamageReasoning] = useState<string | null>(null)
  const [overrideNotes, setOverrideNotes] = useState<string | null>(null)

  // Approve Claim - defined before useEffect so it can be called from there
  // Optional estimateData parameter allows passing data directly (for auto-approval from useEffect)
  const handleApproveClaim = async (estimateData?: ApiResponse | null) => {
    setLoading(true)
    setError(null)
    try {
      // Use provided estimateData or fall back to state
      const estimate = estimateData || costEstimate
      
      // Call review API first
      const payload: any = {}
      if (estimate?.estimate_id) {
        payload.estimate_id = estimate.estimate_id
      }
      if (estimate?.result) {
        payload.estimate_data = estimate.result
      }

      // Call Claim Approval & Authorization API: review-estimate endpoint
      const response = await fetch('http://localhost:8000/api/review-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to review estimate')
      }
      setReview(data)
      setClaimStatus('approved')
      
      // Fetch approved repair shops
      try {
        // Call Claim Approval & Authorization API: approved-repair-shops endpoint
        const shopsResponse = await fetch('http://localhost:8000/api/approved-repair-shops')
        const shopsData = await shopsResponse.json()
        if (shopsResponse.ok && shopsData.repair_shops) {
          setApprovedRepairShops(shopsData.repair_shops)
        }
      } catch (error) {
        console.error('Failed to fetch repair shops:', error)
      }

      // Clear fully automated mode flag after approval is complete
      const fullyAutomatedMode = localStorage.getItem('fullyAutomatedMode')
      if (fullyAutomatedMode === 'true') {
        localStorage.removeItem('fullyAutomatedMode')
        localStorage.removeItem('fullyAutomatedEstimate')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Load data from Claim Damage & Cost Assessment on mount
  useEffect(() => {
    const savedAssessments = localStorage.getItem('confirmedDamageAssessments')
    const savedEstimate = localStorage.getItem('costEstimate')
    const savedImagePreview = localStorage.getItem('uploadedImagePreview')
    const savedDamageReasoning = localStorage.getItem('claimDamageCostAssessment_damageReasoning')
    const savedOverrideNotes = localStorage.getItem('claimDamageCostAssessment_overrideNotes')
    
    if (savedAssessments) {
      setConfirmedDamageAssessments(JSON.parse(savedAssessments))
    }
    if (savedEstimate) {
      setCostEstimate(JSON.parse(savedEstimate))
    }
    if (savedImagePreview) {
      setUploadedImagePreview(savedImagePreview)
    }
    if (savedDamageReasoning) {
      setDamageReasoning(savedDamageReasoning)
    }
    if (savedOverrideNotes) {
      setOverrideNotes(savedOverrideNotes)
    }

    // Check for fully automated mode - auto-approve the claim
    const fullyAutomatedMode = localStorage.getItem('fullyAutomatedMode')
    const fullyAutomatedEstimate = localStorage.getItem('fullyAutomatedEstimate')

    if (fullyAutomatedMode === 'true' && fullyAutomatedEstimate && !autoApprovalTriggeredRef.current) {
      // Set guard flag immediately to prevent duplicate execution (even in React StrictMode)
      autoApprovalTriggeredRef.current = true
      // Parse estimate data and pass directly to handleApproveClaim to avoid state timing issues
      try {
        const estimateData = JSON.parse(fullyAutomatedEstimate)
        // Trigger auto-approval by calling handleApproveClaim with estimate data
        handleApproveClaim(estimateData)
      } catch (error) {
        console.error('Failed to parse fullyAutomatedEstimate:', error)
        // Fall back to calling without parameter (will use state)
        handleApproveClaim()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deny Claim
  const handleDenyClaim = async () => {
    // Validate required fields
    if (!denyComments.trim()) {
      setValidationMessage('Denial comments are required. Please provide comments explaining why this claim is being denied before submitting.')
      setShowValidationModal(true)
      return
    }
    
    // Call backend to record denial
    try {
      const payload: any = {}
      if (costEstimate?.estimate_id) {
        payload.estimate_id = costEstimate.estimate_id
      }
      payload.denial_comments = denyComments

      // Call Claim Approval & Authorization API: deny-claim endpoint
      await fetch('http://localhost:8000/api/deny-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Failed to record denial:', error)
    }
    
    setClaimStatus('denied')
    setShowDenyForm(false)
  }

  // Send approved claim to Policyholder
  const handleSendToPolicyholder = () => {
    router.push('/repair-claim-closure')
  }

  // Start New Claim - Clear all data and navigate to Initial Claim Report
  const handleStartNewClaim = () => {
    // Clear all localStorage data
    localStorage.clear()
    // Navigate to Initial Claim Report
    router.push('/')
  }

  return (
    <div className="container">
      <div className="step-container">
        <div className="step-header">
          <div className="step-header-content">
            <div className="step-number">3</div>
            <h1 className="step-title">
              Claim Approval & Authorization <span className="agent-badge">Sr Agent</span>
            </h1>
          </div>
          <button
            className="btn btn-secondary"
            onClick={handleStartNewClaim}
            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            Start New Claim
          </button>
        </div>

        <div className="stage-content">
          {/* Claim Summary - Always shown when status is pending */}
          {claimStatus === 'pending' && !showDenyForm && (
            <div className="review-summary">
              <h3>Claim Summary for Review</h3>
              
              {/* Damaged Vehicle Image */}
              {uploadedImagePreview && (
                <div className="image-container" style={{ marginBottom: '2rem' }}>
                  <img
                    src={uploadedImagePreview}
                    alt="Uploaded vehicle damage"
                    className="damage-image"
                  />
                </div>
              )}
              
              {/* Damage Assessment Summary */}
              {confirmedDamageAssessments.length > 0 && (
                <div className="summary-section">
                  <h4>Damage Assessment</h4>
                  <div className="labels-container">
                    {confirmedDamageAssessments.map((assess, index) => (
                      <span key={index} className="damage-label-with-severity">
                        <span className="damage-type">{assess.damage_type.replace(/_/g, ' ')}</span>
                        <span className={`severity-badge ${assess.severity}`}>
                          {assess.severity}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Damage Analysis Reasoning */}
              {damageReasoning && (
                <div className="summary-section">
                  <h4>Damage Analysis Reasoning</h4>
                  <p style={{ margin: 0, color: '#555', lineHeight: '1.6' }}>{damageReasoning}</p>
                </div>
              )}

              {/* Cost Estimate Summary */}
              {costEstimate?.result && (
                <div className="summary-section">
                  <h4>Cost Estimate</h4>
                  <div className="summary-costs">
                    <div className="summary-cost-item">
                      <span>Total Cost:</span>
                      <span>USD ${costEstimate.result.total_base_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}</span>
                    </div>
                    <div className="summary-cost-item">
                      <span>Parts:</span>
                      <span>${costEstimate.result.total_parts_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}</span>
                    </div>
                    <div className="summary-cost-item">
                      <span>Labor:</span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div>${costEstimate.result.total_labor_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}</div>
                        <div style={{ fontSize: '0.9em', color: '#666', marginTop: '0.25rem' }}>
                          {costEstimate.result.total_labor_hours?.toFixed(2) || '0.00'} hours
                        </div>
                      </span>
                    </div>
                  </div>
                  
                  {/* Override Note */}
                  {overrideNotes && overrideNotes.trim() !== '' && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                      <h5 style={{ marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '600', color: '#555' }}>Override Note</h5>
                      <p style={{ margin: 0, color: '#555', lineHeight: '1.6' }}>{overrideNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Approve/Deny Buttons - Shown immediately */}
              <div className="stage-actions" style={{ marginTop: '2rem' }}>
                <button
                  className="btn btn-success"
                  onClick={handleApproveClaim}
                  disabled={loading}
                >
                  ✓ Approve Claim
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDenyForm(true)}
                  disabled={loading}
                >
                  ✗ Deny Claim
                </button>
              </div>
            </div>
          )}

          {loading && <div className="loading">Processing approval...</div>}
          {error && <div className="error">{error}</div>}

          {/* Validation Modal */}
          {showValidationModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center'
              }}>
                <h3 style={{ marginBottom: '1rem', color: '#dc3545' }}>Validation Required</h3>
                <p style={{ marginBottom: '1.5rem', color: '#333' }}>{validationMessage}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowValidationModal(false)}
                  style={{ minWidth: '100px' }}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Deny Form - Similar to Cost Estimation override */}
          {showDenyForm && (
            <div className="override-form">
              <h4 style={{ marginBottom: '1rem', color: '#dc3545' }}>Deny Claim</h4>
              <p style={{ marginBottom: '1rem', color: '#856404' }}>
                Please provide comments explaining why this claim is being denied. Once denied, the claim will be closed.
              </p>
              <label>
                Denial Comments (Required):
                <textarea
                  value={denyComments}
                  onChange={(e) => setDenyComments(e.target.value)}
                  className="override-input"
                  placeholder="Enter reason for denial..."
                  rows={4}
                  required
                />
              </label>
              {!denyComments.trim() && (
                <small style={{ display: 'block', marginTop: '0.5rem', color: '#dc3545' }}>
                  Please provide denial comments
                </small>
              )}
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.9em', color: '#495057' }}>
                Your override helps improve future AI performance. This information may be used for training and reinforcement learning.
              </div>
              <div className="override-actions">
                <button
                  className="btn btn-danger"
                  onClick={handleDenyClaim}
                >
                  Confirm Denial
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDenyForm(false)
                    setDenyComments('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Approved Status Message - Shown after approval */}
          {claimStatus === 'approved' && review && (
            <div className="claim-status-message approved">
              <div className="review-result">
                <h3>Review Status: APPROVED</h3>
                
                {review.result && (
                  <div className="review-display">
                    {/* Status Badge */}
                    <div className={`review-status ${review.result.status?.toLowerCase() || 'pending'}`}>
                      <div className="review-status-label">Review Status</div>
                      <div className="review-status-value">
                        {review.result.status?.toUpperCase() || 'PENDING'}
                      </div>
                    </div>

                    {/* Approved Amount - Always use original estimate from localStorage */}
                    {costEstimate?.result && (() => {
                      // Calculate approved amount from original estimate: total_parts_cost + total_labor_cost
                      const originalPartsCost = costEstimate.result.total_parts_cost || 0
                      const originalLaborCost = costEstimate.result.total_labor_cost || 0
                      const approvedAmount = originalPartsCost + originalLaborCost
                      
                      return (
                        <div className="review-approved-amount">
                          <div className="review-approved-label">Approved Amount</div>
                          <div className="review-approved-value">
                            USD ${approvedAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Review Details */}
                    <div className="review-details">
                      {review.result.reviewer_id && (
                        <div className="review-detail-item">
                          <span className="review-detail-label">Reviewer ID:</span>
                          <span className="review-detail-value">{review.result.reviewer_id}</span>
                        </div>
                      )}
                      
                      {review.result.review_timestamp && (
                        <div className="review-detail-item">
                          <span className="review-detail-label">Review Date:</span>
                          <span className="review-detail-value">
                            {new Date(review.result.review_timestamp).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Review Notes */}
                    {review.result.notes && (
                      <div className="review-notes">
                        <h4>Review Notes</h4>
                        <p>{review.result.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Approved Repair Shops */}
              {approvedRepairShops.length > 0 && (
                <div className="approved-repair-shops" style={{ marginTop: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: '#28a745' }}>
                    The policyholder can proceed to any of the following repair shops:
                  </h4>
                  <div className="repair-shops-list">
                    {approvedRepairShops.map((shop) => (
                      <div key={shop.id} className="repair-shop-item">
                        <div className="repair-shop-name">{shop.name}</div>
                        {shop.address && (
                          <div className="repair-shop-address">{shop.address}</div>
                        )}
                        {shop.phone && (
                          <div className="repair-shop-phone">{shop.phone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <p style={{ marginTop: '1rem' }}>The claim has been approved and is ready to be sent to the policyholder.</p>
              <button
                className="btn btn-primary"
                onClick={handleSendToPolicyholder}
                style={{ marginTop: '1rem' }}
              >
                Send approved claim to Policyholder
              </button>
            </div>
          )}

          {/* Denied Status Message */}
          {claimStatus === 'denied' && (
            <div className="claim-status-message denied">
              <h3>✗ Claim Denied</h3>
              <p>The claim has been denied and is now closed.</p>
              {denyComments && (
                <div className="denial-comments">
                  <h4>Denial Reason:</h4>
                  <p>{denyComments}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="navigation">
          <button
            className="btn btn-secondary"
            onClick={() => router.push('/claim-damage-cost-assessment')}
          >
            ← Back to Claim Damage & Cost Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
