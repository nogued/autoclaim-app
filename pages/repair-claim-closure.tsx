import { useRouter } from 'next/router'

export default function RepairClaimClosure() {
  const router = useRouter()

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
            <div className="step-number">4</div>
            <h1 className="step-title">Repair & Claim Closure</h1>
          </div>
          <button
            className="btn btn-secondary"
            onClick={handleStartNewClaim}
            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            Start New Claim
          </button>
        </div>

        <div style={{ lineHeight: '1.8', marginBottom: '2rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            This section acknowledges the repair and claim closure process where:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
            <li>Repair shops generate estimates</li>
            <li>Costs are negotiated</li>
            <li>Repairs are completed</li>
            <li>Claims are closed</li>
          </ul>
          <p style={{ fontStyle: 'italic', color: '#666' }}>
            This is a placeholder page. No functionality is required.
          </p>
        </div>

        <div className="navigation">
          <button
            className="btn btn-secondary"
            onClick={() => router.push('/claim-approval-authorization')}
          >
            ← Back to Claim Approval & Authorization
          </button>
        </div>
      </div>
    </div>
  )
}

