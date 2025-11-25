import { useRouter } from 'next/router'

export default function InitialClaimReport() {
  const router = useRouter()

  return (
    <div className="container">
      <div className="step-container">
        <div className="step-header">
          <div className="step-header-content">
            <div className="step-number">1</div>
            <h1 className="step-title">Initial Claim Report</h1>
          </div>
        </div>

        <div style={{ lineHeight: '1.8', marginBottom: '2rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            This is where a policyholder would submit information such as:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
            <li>Policy number</li>
            <li>Accident description</li>
            <li>Media (photos, videos, etc.)</li>
          </ul>
          <p style={{ fontStyle: 'italic', color: '#666' }}>
            This is a placeholder page. No functionality is required.
          </p>
        </div>

        <div className="navigation">
          <button
            className="btn btn-primary"
            onClick={() => router.push('/claim-damage-cost-assessment')}
          >
            Proceed to Claim Damage & Cost Assessment →
          </button>
        </div>
      </div>
    </div>
  )
}

