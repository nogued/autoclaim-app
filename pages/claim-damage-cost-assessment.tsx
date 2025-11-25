import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface ApiResponse {
  success: boolean
  result?: any
  assessment_id?: number
  estimate_id?: number
  review_id?: number
  claim_id?: number
}

type SectionStatus = 'locked' | 'active' | 'completed'

type ProcessingMode = 'assisted' | 'automated' | 'fully_automated'

export default function ClaimDamageCostAssessment() {
  const router = useRouter()
  
  // Processing mode
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('assisted')
  const [showProcessingModal, setShowProcessingModal] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  
  // Section states
  const [damageAnalysisStatus, setDamageAnalysisStatus] = useState<SectionStatus>('locked')
  const [costEstimationStatus, setCostEstimationStatus] = useState<SectionStatus>('locked')
  
  // Damage Analysis
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [damageAnalysis, setDamageAnalysis] = useState<ApiResponse | null>(null)
  const [showDamageAnalysisOverride, setShowDamageAnalysisOverride] = useState(false)
  const [selectedOverrideLabels, setSelectedOverrideLabels] = useState<string[]>([])
  const [selectedOverrideSeverities, setSelectedOverrideSeverities] = useState<Record<string, string>>({})
  const [damageAnalysisOverrideNotes, setDamageAnalysisOverrideNotes] = useState('')
  const [confirmedDamageLabels, setConfirmedDamageLabels] = useState<string[]>([])
  const [confirmedDamageAssessments, setConfirmedDamageAssessments] = useState<Array<{damage_type: string, severity: string}>>([])
  const [damageReasoning, setDamageReasoning] = useState<string | null>(null)
  const [loading1, setLoading1] = useState(false)
  const [error1, setError1] = useState<string | null>(null)
  
  // Available damage label options
  const damageLabelOptions = ['scratches', 'dents', 'structural damage']
  const severityOptions = ['minor', 'major']
  
  // Cost Estimation
  const [costEstimate, setCostEstimate] = useState<ApiResponse | null>(null)
  const [showCostEstimationOverride, setShowCostEstimationOverride] = useState(false)
  const [overrideCosts, setOverrideCosts] = useState<Record<string, {parts: string, labor: string}>>({})
  const [overrideNotes, setOverrideNotes] = useState('')
  const [loading2, setLoading2] = useState(false)
  const [loading2Message, setLoading2Message] = useState<string | null>(null)
  const [error2, setError2] = useState<string | null>(null)
  
  // Labor rate for converting dollars to hours (standard auto repair rate)
  const LABOR_RATE_PER_HOUR = 100
  
  // Load Claim Damage & Cost Assessment state from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('claimDamageCostAssessment_processingMode')
    if (savedMode && ['assisted', 'automated', 'fully_automated'].includes(savedMode)) {
      setProcessingMode(savedMode as ProcessingMode)
    }

    const savedImagePreview = localStorage.getItem('claimDamageCostAssessment_imagePreview')
    const savedDamageAnalysis = localStorage.getItem('claimDamageCostAssessment_damageAnalysis')
    const savedConfirmedDamageLabels = localStorage.getItem('claimDamageCostAssessment_confirmedDamageLabels')
    const savedConfirmedDamageAssessments = localStorage.getItem('claimDamageCostAssessment_confirmedDamageAssessments')
    const savedDamageReasoning = localStorage.getItem('claimDamageCostAssessment_damageReasoning')
    const savedCostEstimate = localStorage.getItem('claimDamageCostAssessment_costEstimate')
    const savedOverrideCosts = localStorage.getItem('claimDamageCostAssessment_overrideCosts')
    const savedOverrideNotes = localStorage.getItem('claimDamageCostAssessment_overrideNotes')
    const savedDamageAnalysisOverrideNotes = localStorage.getItem('claimDamageCostAssessment_damageAnalysisOverrideNotes')
    const savedDamageAnalysisStatus = localStorage.getItem('claimDamageCostAssessment_damageAnalysisStatus')
    const savedCostEstimationStatus = localStorage.getItem('claimDamageCostAssessment_costEstimationStatus')
    
    if (savedImagePreview) {
      setImagePreview(savedImagePreview)
    }
    if (savedDamageAnalysis) {
      try {
        setDamageAnalysis(JSON.parse(savedDamageAnalysis))
      } catch (e) {
        console.error('Failed to parse saved damage analysis:', e)
      }
    }
    if (savedConfirmedDamageLabels) {
      try {
        setConfirmedDamageLabels(JSON.parse(savedConfirmedDamageLabels))
      } catch (e) {
        console.error('Failed to parse saved confirmed damage labels:', e)
      }
    }
    if (savedConfirmedDamageAssessments) {
      try {
        setConfirmedDamageAssessments(JSON.parse(savedConfirmedDamageAssessments))
      } catch (e) {
        console.error('Failed to parse saved confirmed damage assessments:', e)
      }
    }
    if (savedDamageReasoning) {
      setDamageReasoning(savedDamageReasoning)
    }
    if (savedCostEstimate) {
      try {
        setCostEstimate(JSON.parse(savedCostEstimate))
      } catch (e) {
        console.error('Failed to parse saved cost estimate:', e)
      }
    }
    if (savedOverrideCosts) {
      try {
        setOverrideCosts(JSON.parse(savedOverrideCosts))
      } catch (e) {
        console.error('Failed to parse saved override costs:', e)
      }
    }
    if (savedOverrideNotes) {
      setOverrideNotes(savedOverrideNotes)
    }
    if (savedDamageAnalysisOverrideNotes) {
      setDamageAnalysisOverrideNotes(savedDamageAnalysisOverrideNotes)
    }
    if (savedDamageAnalysisStatus && ['locked', 'active', 'completed'].includes(savedDamageAnalysisStatus)) {
      setDamageAnalysisStatus(savedDamageAnalysisStatus as SectionStatus)
    }
    if (savedCostEstimationStatus && ['locked', 'active', 'completed'].includes(savedCostEstimationStatus)) {
      setCostEstimationStatus(savedCostEstimationStatus as SectionStatus)
    }
  }, [])

  // Clear all claim data
  const clearAllData = () => {
    setDamageAnalysis(null)
    setConfirmedDamageLabels([])
    setConfirmedDamageAssessments([])
    setDamageReasoning(null)
    setCostEstimate(null)
    setShowDamageAnalysisOverride(false)
    setShowCostEstimationOverride(false)
    setSelectedOverrideLabels([])
    setSelectedOverrideSeverities({})
    setDamageAnalysisOverrideNotes('')
    setOverrideCosts({})
    setOverrideNotes('')
    setError1(null)
    setError2(null)
    setDamageAnalysisStatus('locked')
    setCostEstimationStatus('locked')
    setImagePreview(null)
    setUploadedImage(null)
    
    // Clear all Claim Damage & Cost Assessment localStorage data
    localStorage.removeItem('claimDamageCostAssessment_imagePreview')
    localStorage.removeItem('claimDamageCostAssessment_damageAnalysis')
    localStorage.removeItem('claimDamageCostAssessment_confirmedDamageLabels')
    localStorage.removeItem('claimDamageCostAssessment_confirmedDamageAssessments')
    localStorage.removeItem('claimDamageCostAssessment_damageReasoning')
    localStorage.removeItem('claimDamageCostAssessment_costEstimate')
    localStorage.removeItem('claimDamageCostAssessment_overrideCosts')
    localStorage.removeItem('claimDamageCostAssessment_overrideNotes')
    localStorage.removeItem('claimDamageCostAssessment_damageAnalysisOverrideNotes')
    localStorage.removeItem('claimDamageCostAssessment_damageAnalysisStatus')
    localStorage.removeItem('claimDamageCostAssessment_costEstimationStatus')
    localStorage.removeItem('claimDamageCostAssessment_processingMode')
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError1('Please upload an image file')
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError1('Image size must be less than 10MB')
        return
      }

      // Check if there's existing data and warn user
      const hasExistingData = damageAnalysis || costEstimate || confirmedDamageLabels.length > 0
      
      if (hasExistingData) {
        const confirmed = window.confirm(
          'Uploading a new image will replace all existing claim data (damage analysis, cost estimates, etc.).\n\nDo you want to continue?'
        )
        if (!confirmed) {
          // Reset the file input
          e.target.value = ''
          return
        }
      }

      // Preserve the current mode before clearing data
      const currentMode = processingMode

      // Clear all previous data (but preserve mode)
      clearAllData()
      // Restore the mode after clearing
      setProcessingMode(currentMode)
      localStorage.setItem('claimDamageCostAssessment_processingMode', currentMode)

      setUploadedImage(file)
      setError1(null)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        const previewUrl = reader.result as string
        setImagePreview(previewUrl)
        // Unlock Damage Analysis when image is uploaded
        setDamageAnalysisStatus('active')
        
        // Trigger automated flows based on mode
        // Use currentMode from closure to ensure we have the correct mode
        // Pass file and previewUrl directly to avoid state timing issues
        if (currentMode === 'automated') {
          runAutomatedCostEstimate(file, previewUrl)
        } else if (currentMode === 'fully_automated') {
          runFullyAutomated(file, previewUrl)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Damage Analysis: Analyze Damage
  const handleAnalyzeDamage = async () => {
    if (!uploadedImage) {
      setError1('Please upload an image first')
      return
    }

    setLoading1(true)
    setError1(null)
    try {
      // Create FormData to send the image file
      const formData = new FormData()
      formData.append('image', uploadedImage)
      formData.append('policy_number', 'POL-12345')
      formData.append('accident_description', 'Front-end collision')

      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      // Call Claim Damage & Cost Assessment API: analyze-damage endpoint
      const response = await fetch('http://localhost:8000/api/analyze-damage', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to analyze damage')
      }
      
      // Add 1.5 second delay to show analyzing spinner
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setDamageAnalysis(data)
      // Extract labels, assessments, and reasoning from result
      const result = data.result || {}
      const labels = result.damage_labels || []
      let assessments = result.damage_assessments || []
      
      // If assessments not provided but labels are, create assessments with default severity
      if (assessments.length === 0 && labels.length > 0) {
        assessments = labels.map((label: string) => ({
          damage_type: label === 'structural damage' ? 'structural_damage' : label,
          severity: 'minor' // default
        }))
      }
      
      const reasoning = result.reasoning || 'No reasoning provided.'
      
      setConfirmedDamageLabels(labels)
      setConfirmedDamageAssessments(assessments)
      setDamageReasoning(reasoning)
    } catch (error: any) {
      setError1(error.message || 'An error occurred')
    } finally {
      setLoading1(false)
    }
  }

  // Damage Analysis: Confirm and proceed
  const handleDamageAnalysisConfirm = () => {
    setDamageAnalysisStatus('locked') // Lock Damage Analysis when moving to Cost Estimation
    setCostEstimationStatus('active')
  }

  // Go back to Damage Analysis for editing
  const handleGoBackToDamageAnalysis = () => {
    // Reset all Cost Estimation data to initial state
    setCostEstimate(null)
    setShowCostEstimationOverride(false)
    setOverrideCosts({})
    setOverrideNotes('')
    setLoading2(false)
    setLoading2Message(null)
    setError2(null)
    setCostEstimationStatus('locked')
    setDamageAnalysisStatus('active')
  }

  // Start New Claim - Clear all data and navigate to Initial Claim Report
  const handleStartNewClaim = () => {
    // Clear all localStorage data
    localStorage.clear()
    // Navigate to Initial Claim Report
    router.push('/')
  }

  // Handle mode change - reset all data
  const handleModeChange = (newMode: ProcessingMode) => {
    if (newMode !== processingMode) {
      clearAllData()
      setProcessingMode(newMode)
      localStorage.setItem('claimDamageCostAssessment_processingMode', newMode)
    }
  }

  // Automated flow for "Automated Cost Estimate" mode
  const runAutomatedCostEstimate = async (imageFile: File, imagePreviewUrl: string) => {
    if (!imageFile) {
      console.error('No image file provided for automated processing')
      return
    }

    console.log('Starting automated cost estimate flow')
    setShowProcessingModal(true)
    setProcessingMessage('Processing image...')

    // Simulate 5 seconds of processing
    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      // Call analyze-damage
      setProcessingMessage('Analyzing damage...')
      const analyzePayload = new FormData()
      analyzePayload.append('image', imageFile)
      analyzePayload.append('filename', imageFile.name)
      analyzePayload.append('content_type', imageFile.type)

      // Call Claim Damage & Cost Assessment API: analyze-damage endpoint
      const analyzeResponse = await fetch('http://localhost:8000/api/analyze-damage', {
        method: 'POST',
        body: analyzePayload,
      })
      const analyzeData = await analyzeResponse.json()
      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.detail || 'Failed to analyze damage')
      }

      // Process damage analysis result
      const result = analyzeData.result || {}
      const labels = result.damage_labels || []
      const assessments = result.damage_assessments || []
      const reasoning = result.reasoning || 'No reasoning provided.'
      
      setDamageAnalysis(analyzeData)
      setConfirmedDamageLabels(labels)
      setConfirmedDamageAssessments(assessments.length > 0 ? assessments : labels.map((label: string) => ({
        damage_type: label === 'structural damage' ? 'structural_damage' : label,
        severity: 'minor'
      })))
      setDamageReasoning(reasoning)
      setDamageAnalysisStatus('locked')
      setCostEstimationStatus('active')

      // Call generate-estimate
      setProcessingMessage('Getting costs from Database\nSearching internal documents')
      await new Promise(resolve => setTimeout(resolve, 2000))

      const estimatePayload: any = {
        damage_labels: labels,
        damage_assessments: assessments.length > 0 ? assessments : labels.map((label: string) => ({
          damage_type: label === 'structural damage' ? 'structural_damage' : label,
          severity: 'minor'
        }))
      }
      if (analyzeData.assessment_id) {
        estimatePayload.damage_assessment_id = analyzeData.assessment_id
      }

      // Call Claim Damage & Cost Assessment API: generate-estimate endpoint
      const estimateResponse = await fetch('http://localhost:8000/api/generate-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimatePayload),
      })
      const estimateData = await estimateResponse.json()
      if (!estimateResponse.ok) {
        throw new Error(estimateData.detail || 'Failed to generate estimate')
      }

      setCostEstimate(estimateData)
      setCostEstimationStatus('completed')

      // Update modal and navigate
      setProcessingMessage('Damage analysis and cost estimate are ready!')
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Save data directly to localStorage for Claim Approval & Authorization (using values from function scope, not state)
      const finalAssessments = assessments.length > 0 ? assessments : labels.map((label: string) => ({
        damage_type: label === 'structural damage' ? 'structural_damage' : label,
        severity: 'minor'
      }))
      
      localStorage.setItem('confirmedDamageAssessments', JSON.stringify(finalAssessments))
      localStorage.setItem('costEstimate', JSON.stringify(estimateData))
      
      // Use the imagePreviewUrl passed as parameter
      if (imagePreviewUrl) {
        localStorage.setItem('uploadedImagePreview', imagePreviewUrl)
      }

      // Also save Claim Damage & Cost Assessment state for navigation back
      if (imagePreviewUrl) {
        localStorage.setItem('claimDamageCostAssessment_imagePreview', imagePreviewUrl)
      }
      localStorage.setItem('claimDamageCostAssessment_damageAnalysis', JSON.stringify(analyzeData))
      localStorage.setItem('claimDamageCostAssessment_confirmedDamageLabels', JSON.stringify(labels))
      localStorage.setItem('claimDamageCostAssessment_confirmedDamageAssessments', JSON.stringify(finalAssessments))
      localStorage.setItem('claimDamageCostAssessment_damageReasoning', reasoning)
      localStorage.setItem('claimDamageCostAssessment_costEstimate', JSON.stringify(estimateData))
      localStorage.setItem('claimDamageCostAssessment_damageAnalysisStatus', 'locked')
      localStorage.setItem('claimDamageCostAssessment_costEstimationStatus', 'completed')

      setShowProcessingModal(false)
      router.push('/claim-approval-authorization')
    } catch (error: any) {
      setError1(error.message || 'An error occurred')
      setShowProcessingModal(false)
    }
  }

  // Automated flow for "Fully Automated Cost Estimate and Approval" mode
  const runFullyAutomated = async (imageFile: File, imagePreviewUrl: string) => {
    if (!imageFile) {
      console.error('No image file provided for fully automated processing')
      return
    }

    setShowProcessingModal(true)
    setProcessingMessage('Processing image...')

    // Simulate 5 seconds of processing
    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      // Call analyze-damage
      setProcessingMessage('Analyzing damage...')
      const analyzePayload = new FormData()
      analyzePayload.append('image', imageFile)
      analyzePayload.append('filename', imageFile.name)
      analyzePayload.append('content_type', imageFile.type)

      // Call Claim Damage & Cost Assessment API: analyze-damage endpoint
      const analyzeResponse = await fetch('http://localhost:8000/api/analyze-damage', {
        method: 'POST',
        body: analyzePayload,
      })
      const analyzeData = await analyzeResponse.json()
      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.detail || 'Failed to analyze damage')
      }

      // Process damage analysis result
      const result = analyzeData.result || {}
      const labels = result.damage_labels || []
      const assessments = result.damage_assessments || []
      const reasoning = result.reasoning || 'No reasoning provided.'
      
      setDamageAnalysis(analyzeData)
      setConfirmedDamageLabels(labels)
      setConfirmedDamageAssessments(assessments.length > 0 ? assessments : labels.map((label: string) => ({
        damage_type: label === 'structural damage' ? 'structural_damage' : label,
        severity: 'minor'
      })))
      setDamageReasoning(reasoning)

      // Call generate-estimate
      setProcessingMessage('Getting costs from Database\nSearching internal documents')
      await new Promise(resolve => setTimeout(resolve, 2000))

      const estimatePayload: any = {
        damage_labels: labels,
        damage_assessments: assessments.length > 0 ? assessments : labels.map((label: string) => ({
          damage_type: label === 'structural damage' ? 'structural_damage' : label,
          severity: 'minor'
        }))
      }
      if (analyzeData.assessment_id) {
        estimatePayload.damage_assessment_id = analyzeData.assessment_id
      }

      // Call Claim Damage & Cost Assessment API: generate-estimate endpoint
      const estimateResponse = await fetch('http://localhost:8000/api/generate-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimatePayload),
      })
      const estimateData = await estimateResponse.json()
      if (!estimateResponse.ok) {
        throw new Error(estimateData.detail || 'Failed to generate estimate')
      }

      setCostEstimate(estimateData)

      // Save data for Claim Approval & Authorization
      const finalAssessments = assessments.length > 0 ? assessments : labels.map((label: string) => ({
        damage_type: label === 'structural damage' ? 'structural_damage' : label,
        severity: 'minor'
      }))
      
      localStorage.setItem('confirmedDamageAssessments', JSON.stringify(finalAssessments))
      localStorage.setItem('costEstimate', JSON.stringify(estimateData))
      if (imagePreviewUrl) {
        localStorage.setItem('uploadedImagePreview', imagePreviewUrl)
      }

      // Set flag for fully automated mode - Claim Approval & Authorization will auto-approve
      localStorage.setItem('fullyAutomatedMode', 'true')
      localStorage.setItem('fullyAutomatedEstimate', JSON.stringify(estimateData))

      // Navigate to Claim Approval & Authorization
      setProcessingMessage('Navigating to senior agent review...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      setShowProcessingModal(false)
      router.push('/claim-approval-authorization')
    } catch (error: any) {
      setError1(error.message || 'An error occurred')
      setShowProcessingModal(false)
    }
  }

  // Damage Analysis: Override
  const handleDamageAnalysisOverride = () => {
    // Preselect damage types and severities from AI analysis if available
    if (confirmedDamageAssessments.length > 0) {
      const preselectedLabels: string[] = []
      const preselectedSeverities: Record<string, string> = {}
      
      confirmedDamageAssessments.forEach(assess => {
        // Convert structural_damage back to "structural damage" for the label
        const label = assess.damage_type === 'structural_damage' ? 'structural damage' : assess.damage_type
        preselectedLabels.push(label)
        preselectedSeverities[label] = assess.severity
      })
      
      setSelectedOverrideLabels(preselectedLabels)
      setSelectedOverrideSeverities(preselectedSeverities)
    } else {
      // Fallback: if no assessments but we have labels, use those
      if (confirmedDamageLabels.length > 0) {
        const preselectedLabels: string[] = []
        const preselectedSeverities: Record<string, string> = {}
        
        confirmedDamageLabels.forEach(label => {
          preselectedLabels.push(label)
          // Default to minor if no severity info available
          preselectedSeverities[label] = 'minor'
        })
        
        setSelectedOverrideLabels(preselectedLabels)
        setSelectedOverrideSeverities(preselectedSeverities)
      } else {
        // Start with empty selection if no AI data available
        setSelectedOverrideLabels([])
        setSelectedOverrideSeverities({})
      }
    }
    
    // Load saved notes if available, otherwise start empty
    const savedNotes = localStorage.getItem('claimDamageCostAssessment_damageAnalysisOverrideNotes')
    setDamageAnalysisOverrideNotes(savedNotes || '')
    setShowDamageAnalysisOverride(true)
  }

  const handleLabelToggle = (label: string) => {
    setSelectedOverrideLabels(prev => {
      if (prev.includes(label)) {
        const newLabels = prev.filter(l => l !== label)
                // Remove severity when label is deselected
                setSelectedOverrideSeverities(prevSev => {
                  const newSev = {...prevSev}
                  delete newSev[label]
                  return newSev
                })
        return newLabels
      } else {
        // Default to 'minor' when label is selected
        setSelectedOverrideSeverities(prevSev => ({
          ...prevSev,
          [label]: 'minor'
        }))
        return [...prev, label]
      }
    })
  }

  const handleSeverityChange = (label: string, severity: string) => {
    setSelectedOverrideSeverities(prev => ({
      ...prev,
      [label]: severity
    }))
  }

  const handleDamageAnalysisOverrideSubmit = () => {
    // Validate required fields
    if (selectedOverrideLabels.length === 0) {
      setValidationMessage('Please select at least one damage label before submitting.')
      setShowValidationModal(true)
      return
    }
    
    // Build assessments array from selected labels and severities
    // Deduplicate by damage_type to prevent duplicates
    const assessmentsMap = new Map<string, {damage_type: string, severity: string}>()
    
    selectedOverrideLabels.forEach(label => {
      const damage_type = label === 'structural damage' ? 'structural_damage' : label
      const severity = selectedOverrideSeverities[label] || 'minor'
      // Only keep the last severity if same damage_type appears multiple times
      assessmentsMap.set(damage_type, { damage_type, severity })
    })
    
    const assessments = Array.from(assessmentsMap.values())
    const uniqueLabels = Array.from(new Set(selectedOverrideLabels))
    
    // Get the existing AI reasoning text (preserve original AI reasoning)
    const existingReasoning = damageReasoning || ''
    let combinedReasoning = existingReasoning
    
    // Append the override note to existing AI reasoning if note is provided
    if (damageAnalysisOverrideNotes && damageAnalysisOverrideNotes.trim() !== '') {
      if (combinedReasoning && combinedReasoning.trim() !== '') {
        combinedReasoning = combinedReasoning + '\n\nAgent Note: ' + damageAnalysisOverrideNotes.trim()
      } else {
        combinedReasoning = 'Agent Note: ' + damageAnalysisOverrideNotes.trim()
      }
    }
    
    // Clear the original AI analysis and replace with override
    setDamageAnalysis(null) // Clear AI-generated analysis
    setConfirmedDamageLabels(uniqueLabels) // Only the manually selected labels
    setConfirmedDamageAssessments(assessments) // Only the manually selected assessments
    setDamageReasoning(combinedReasoning) // Combined reasoning with appended note
    
    // Save combined reasoning to localStorage
    localStorage.setItem('claimDamageCostAssessment_damageReasoning', combinedReasoning)
    
    // Save Damage Analysis override notes to localStorage
    if (damageAnalysisOverrideNotes) {
      localStorage.setItem('claimDamageCostAssessment_damageAnalysisOverrideNotes', damageAnalysisOverrideNotes)
    } else {
      localStorage.removeItem('claimDamageCostAssessment_damageAnalysisOverrideNotes')
    }
    setShowDamageAnalysisOverride(false)
    // Don't lock Damage Analysis yet - let user see the updated result and confirm
  }

  // Cost Estimation: Generate Estimate
  const handleGenerateEstimate = async () => {
    setLoading2(true)
    setError2(null)
    try {
      // Show first message for 1 second
      setLoading2Message('Getting costs from Database')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Add second message (keeping the first one) for 1 more second
      setLoading2Message('Getting costs from Database\nSearching internal documents')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const payload: any = {
        damage_labels: confirmedDamageLabels,
        damage_assessments: confirmedDamageAssessments.length > 0 
          ? confirmedDamageAssessments 
          : confirmedDamageLabels.map(label => ({
              damage_type: label === 'structural damage' ? 'structural_damage' : label,
              severity: 'minor' // fallback if no assessments
            }))
      }
      if (damageAnalysis?.assessment_id) {
        payload.damage_assessment_id = damageAnalysis.assessment_id
      }

      // Call Claim Damage & Cost Assessment API: generate-estimate endpoint
      const response = await fetch('http://localhost:8000/api/generate-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate estimate')
      }
      setCostEstimate(data)
      setLoading2Message(null)
    } catch (error: any) {
      setError2(error.message || 'An error occurred')
      setLoading2Message(null)
    } finally {
      setLoading2(false)
    }
  }

  // Cost Estimation: Confirm and send to Sr Agent
  const handleCostEstimationConfirm = () => {
    setCostEstimationStatus('completed')
    
    // Save all Claim Damage & Cost Assessment state to localStorage for restoration when navigating back
    if (imagePreview) {
      localStorage.setItem('claimDamageCostAssessment_imagePreview', imagePreview)
      // Also save for Claim Approval & Authorization
      localStorage.setItem('uploadedImagePreview', imagePreview)
    }
    if (damageAnalysis) {
      localStorage.setItem('claimDamageCostAssessment_damageAnalysis', JSON.stringify(damageAnalysis))
    }
    if (confirmedDamageLabels.length > 0) {
      localStorage.setItem('claimDamageCostAssessment_confirmedDamageLabels', JSON.stringify(confirmedDamageLabels))
    }
    if (confirmedDamageAssessments.length > 0) {
      localStorage.setItem('claimDamageCostAssessment_confirmedDamageAssessments', JSON.stringify(confirmedDamageAssessments))
      // Also save for Claim Approval & Authorization
      localStorage.setItem('confirmedDamageAssessments', JSON.stringify(confirmedDamageAssessments))
    }
    if (damageReasoning) {
      localStorage.setItem('claimDamageCostAssessment_damageReasoning', damageReasoning)
    }
    if (costEstimate) {
      localStorage.setItem('claimDamageCostAssessment_costEstimate', JSON.stringify(costEstimate))
      // Also save for Claim Approval & Authorization
      localStorage.setItem('costEstimate', JSON.stringify(costEstimate))
    }
    if (Object.keys(overrideCosts).length > 0) {
      localStorage.setItem('claimDamageCostAssessment_overrideCosts', JSON.stringify(overrideCosts))
    }
    if (overrideNotes) {
      localStorage.setItem('claimDamageCostAssessment_overrideNotes', overrideNotes)
    }
    if (damageAnalysisOverrideNotes) {
      localStorage.setItem('claimDamageCostAssessment_damageAnalysisOverrideNotes', damageAnalysisOverrideNotes)
    }
    localStorage.setItem('claimDamageCostAssessment_damageAnalysisStatus', damageAnalysisStatus)
    localStorage.setItem('claimDamageCostAssessment_costEstimationStatus', 'completed')
    
    router.push('/claim-approval-authorization')
  }

  // Format number with commas
  const formatNumberWithCommas = (value: string): string => {
    // Remove all non-digit characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '')
    if (!numericValue) return ''
    
    // Split by decimal point
    const parts = numericValue.split('.')
    const integerPart = parts[0]
    const decimalPart = parts[1] || ''
    
    // Add commas to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    
    // Combine with decimal (limit to 2 decimal places)
    return decimalPart ? `${formattedInteger}.${decimalPart.slice(0, 2)}` : formattedInteger
  }

  // Parse formatted number back to numeric value
  const parseFormattedNumber = (value: string): number => {
    const numericValue = value.replace(/[^\d.]/g, '')
    return parseFloat(numericValue) || 0
  }

  // Get unique key for damage assessment
  const getAssessmentKey = (assess: {damage_type: string, severity: string}) => {
    return `${assess.damage_type}_${assess.severity}`
  }

  // Handle parts cost input with formatting for specific assessment
  const handlePartsCostChange = (key: string, value: string) => {
    const formatted = formatNumberWithCommas(value)
    setOverrideCosts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        parts: formatted,
        labor: prev[key]?.labor || ''
      }
    }))
  }

  // Handle labor cost input with formatting for specific assessment
  const handleLaborCostChange = (key: string, value: string) => {
    const formatted = formatNumberWithCommas(value)
    setOverrideCosts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        parts: prev[key]?.parts || '',
        labor: formatted
      }
    }))
  }

  // Calculate labor hours from labor cost for specific assessment
  const calculateLaborHours = (key: string): string => {
    const laborCost = parseFormattedNumber(overrideCosts[key]?.labor || '0')
    if (laborCost === 0) return '0.00'
    const hours = laborCost / LABOR_RATE_PER_HOUR
    return hours.toFixed(2)
  }

  // Cost Estimation: Override
  const handleCostEstimationOverride = () => {
    setShowCostEstimationOverride(true)
    // Initialize override costs from line items if available
    const initialCosts: Record<string, {parts: string, labor: string}> = {}
    
    if (costEstimate?.result?.line_items) {
      costEstimate.result.line_items.forEach((item: any) => {
        const key = `${item.damage_type}_${item.damage_severity}`
        initialCosts[key] = {
          parts: formatNumberWithCommas(item.parts_cost?.toString() || '0'),
          labor: formatNumberWithCommas(item.labor_cost?.toString() || '0')
        }
      })
    } else if (confirmedDamageAssessments.length > 0) {
      // Fallback: initialize with zeros for each assessment
      confirmedDamageAssessments.forEach(assess => {
        const key = getAssessmentKey(assess)
        initialCosts[key] = {
          parts: '0',
          labor: '0'
        }
      })
    }
    
    setOverrideCosts(initialCosts)
    setOverrideNotes('')
  }

  const handleCostEstimationOverrideSubmit = () => {
    // Validate that not all override values are zero or empty
    if (costEstimate?.result && confirmedDamageAssessments.length > 0) {
      let allValuesZero = true
      
      // Check if at least one override value is non-zero
      for (const assess of confirmedDamageAssessments) {
        const key = getAssessmentKey(assess)
        const partsOverride = overrideCosts[key]?.parts || ''
        const laborOverride = overrideCosts[key]?.labor || ''
        
        // Parse values and check if they're non-zero
        const partsValue = parseFormattedNumber(partsOverride)
        const laborValue = parseFormattedNumber(laborOverride)
        
        // If at least one value is non-zero, validation passes
        if (partsValue > 0 || laborValue > 0) {
          allValuesZero = false
          break
        }
      }
      
      // If all values are zero, show validation modal and prevent submission
      if (allValuesZero) {
        setValidationMessage('Repair costs cannot be $0. Please enter valid non-zero values for at least one cost field (parts or labor) to continue.')
        setShowValidationModal(true)
        return
      }
    }
    
    // Recalculate cost estimate with override values
    if (costEstimate?.result && confirmedDamageAssessments.length > 0) {
      let totalPartsCost = 0
      let totalLaborCost = 0
      let totalLaborHours = 0
      const updatedLineItems: any[] = []
      
      confirmedDamageAssessments.forEach((assess) => {
        const key = getAssessmentKey(assess)
        // Use override values if provided, otherwise use original estimate values
        const originalItem = costEstimate.result.line_items?.find((item: any) => 
          item.damage_type === assess.damage_type && item.damage_severity === assess.severity
        )
        
        const partsCostOverride = overrideCosts[key]?.parts
        const laborCostOverride = overrideCosts[key]?.labor
        
        // Use override if provided and not empty, otherwise use original
        const partsCost = (partsCostOverride && partsCostOverride.trim() !== '') 
          ? parseFormattedNumber(partsCostOverride) 
          : (originalItem?.parts_cost || 0)
        const laborCost = (laborCostOverride && laborCostOverride.trim() !== '') 
          ? parseFormattedNumber(laborCostOverride) 
          : (originalItem?.labor_cost || 0)
        const laborHours = laborCost / LABOR_RATE_PER_HOUR
        
        totalPartsCost += partsCost
        totalLaborCost += laborCost
        totalLaborHours += laborHours
        
        updatedLineItems.push({
          damage_type: assess.damage_type,
          damage_severity: assess.severity,
          base_cost: partsCost + laborCost,
          parts_cost: partsCost,
          labor_cost: laborCost,
          labor_hours: laborHours,
          notes: overrideNotes || originalItem?.notes || ''
        })
      })
      
      // Update cost estimate with override values
      const updatedEstimate = {
        ...costEstimate,
        result: {
          ...costEstimate.result,
          total_base_cost: totalPartsCost + totalLaborCost,
          total_parts_cost: totalPartsCost,
          total_labor_cost: totalLaborCost,
          total_labor_hours: totalLaborHours,
          line_items: updatedLineItems
        }
      }
      
      setCostEstimate(updatedEstimate)
    }
    
    setShowCostEstimationOverride(false)
    setCostEstimationStatus('completed')
  }



  return (
    <div className="container">
      <div className="step-container">
        <div className="step-header">
          <div className="step-header-content">
            <div className="step-number">2</div>
            <h1 className="step-title">
              Claim Damage & Cost Assessment <span className="agent-badge">Jr Agent</span>
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

        {/* Mode Selector */}
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
            Processing Mode:
          </label>
          <select
            value={processingMode}
            onChange={(e) => handleModeChange(e.target.value as ProcessingMode)}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}
          >
            <option value="assisted">Assisted Cost Estimate</option>
            <option value="automated">Automated Cost Estimate</option>
            <option value="fully_automated">Fully Automated Cost Estimate and Approval</option>
          </select>
        </div>

        {/* Processing Modal */}
        {showProcessingModal && (
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
              <div className="loading">
                <div className="spinner"></div>
                <p style={{ whiteSpace: 'pre-line' }}>{processingMessage || 'Processing...'}</p>
              </div>
            </div>
          </div>
        )}

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

        {/* Image Upload Section - Before Damage Analysis */}
        {!imagePreview && (
          <div className="image-upload-section" style={{ marginBottom: '2rem' }}>
            <h2 className="stage-title" style={{ marginBottom: '1rem' }}>Upload Vehicle Image</h2>
            <label className="file-upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-upload-input"
                style={{ display: 'none' }}
              />
              <div className="file-upload-button">
                <span>📷 Choose Image</span>
              </div>
            </label>
            <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem', textAlign: 'center' }}>
              Supported formats: JPG, PNG (Max 10MB)
            </p>
          </div>
        )}

        {/* Image Preview - Before Damage Analysis */}
        {imagePreview && (
          <div style={{ marginBottom: '2rem' }}>
            <div className="image-container">
              <img
                src={imagePreview}
                alt="Uploaded vehicle damage"
                className="damage-image"
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  // Check if there's existing data and warn user
                  const hasExistingData = damageAnalysis || costEstimate || confirmedDamageLabels.length > 0
                  
                  if (hasExistingData) {
                    const confirmed = window.confirm(
                      'Changing the image will replace all existing claim data (damage analysis, cost estimates, etc.).\n\nDo you want to continue?'
                    )
                    if (!confirmed) {
                      return
                    }
                  }

                  // Clear all data
                  clearAllData()
                  setUploadedImage(null)
                  setImagePreview(null)
                }}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                Change Image
              </button>
            </div>
          </div>
        )}

        {/* Damage Analysis */}
        <div className={`stage ${damageAnalysisStatus}`}>
          <div className="stage-header">
            <h2 className="stage-title">
              Damage Analysis
            </h2>
            {damageAnalysisStatus === 'locked' && <span className="stage-badge locked">Locked</span>}
            {damageAnalysisStatus === 'active' && <span className="stage-badge active">Active</span>}
            {damageAnalysisStatus === 'completed' && <span className="stage-badge completed">Completed</span>}
          </div>

          {damageAnalysisStatus !== 'locked' && (
            <div className="stage-content">

              {imagePreview && !damageAnalysis && !loading1 && (
                <button
                  className="btn btn-primary"
                  onClick={handleAnalyzeDamage}
                  disabled={loading1}
                >
                  Analyze Damage
                </button>
              )}

              {loading1 && (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Analyzing image...</p>
                </div>
              )}
              {error1 && <div className="error">{error1}</div>}

              {/* Show analysis result only when override form is NOT open */}
              {!showDamageAnalysisOverride && confirmedDamageLabels.length > 0 && damageReasoning && (
                <div className="analysis-result">
                  <h3>Damage Analysis Result</h3>
                  
                  {/* Damage Labels with Severity */}
                  <div className="damage-labels">
                    <h4>Detected Damage Types:</h4>
                    <div className="labels-container">
                      {confirmedDamageAssessments.length > 0 ? (
                        confirmedDamageAssessments.map((assess, index) => (
                          <span key={index} className="damage-label-with-severity">
                            <span className="damage-type">{assess.damage_type.replace(/_/g, ' ')}</span>
                            <span className={`severity-badge ${assess.severity}`}>
                              {assess.severity}
                            </span>
                          </span>
                        ))
                      ) : (
                        confirmedDamageLabels.map((label, index) => (
                          <span key={index} className="damage-label">
                            {label}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="reasoning-text">
                    <h4>Analysis Reasoning:</h4>
                    <p>{damageReasoning}</p>
                  </div>
                  
                  <div className="stage-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleDamageAnalysisConfirm}
                    >
                      Yes, proceed to next step
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleDamageAnalysisOverride}
                    >
                      No, override
                    </button>
                  </div>
                </div>
              )}

              {/* Override form */}
              {showDamageAnalysisOverride && (
                <div className="override-form">
                      <h4 style={{ marginBottom: '1rem', color: '#856404' }}>Select Damage Labels and Severity:</h4>
                      <div className="checkbox-group">
                        {damageLabelOptions.map((label) => (
                          <div key={label} className="checkbox-with-severity">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedOverrideLabels.includes(label)}
                                onChange={() => handleLabelToggle(label)}
                                className="checkbox-input"
                              />
                              <span className="checkbox-text">{label}</span>
                            </label>
                            {selectedOverrideLabels.includes(label) && (
                              <div className="severity-selector">
                                <label className="severity-label">Severity:</label>
                                <select
                                  value={selectedOverrideSeverities[label] || 'minor'}
                                  onChange={(e) => handleSeverityChange(label, e.target.value)}
                                  className="severity-select"
                                >
                                  {severityOptions.map(sev => (
                                    <option key={sev} value={sev}>{sev}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {selectedOverrideLabels.length === 0 && (
                        <small style={{ display: 'block', marginTop: '0.5rem', color: '#dc3545' }}>
                          Please select at least one damage label
                        </small>
                      )}
                      <label style={{ marginTop: '1rem', display: 'block' }}>
                        Notes:
                        <textarea
                          value={damageAnalysisOverrideNotes}
                          onChange={(e) => setDamageAnalysisOverrideNotes(e.target.value)}
                          className="override-input"
                          placeholder="Additional notes..."
                          rows={3}
                          style={{ marginTop: '0.5rem' }}
                        />
                      </label>
                      <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.9em', color: '#495057' }}>
                        Your override helps improve future AI performance. This information may be used for training and reinforcement learning.
                      </div>
                      <div className="override-actions">
                        <button
                          className="btn btn-primary"
                          onClick={handleDamageAnalysisOverrideSubmit}
                        >
                          Submit Override
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowDamageAnalysisOverride(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
            </div>
          )}
        </div>

        {/* Cost Estimation */}
        <div className={`stage ${costEstimationStatus}`}>
          <div className="stage-header">
            <h2 className="stage-title">
              Cost Estimation
            </h2>
            {costEstimationStatus === 'locked' && <span className="stage-badge locked">Locked</span>}
            {costEstimationStatus === 'active' && <span className="stage-badge active">Active</span>}
            {costEstimationStatus === 'completed' && <span className="stage-badge completed">Completed</span>}
          </div>

          {costEstimationStatus !== 'locked' && (
            <div className="stage-content">
              {/* Go back to Damage Analysis button */}
              {damageAnalysisStatus === 'locked' && (
                <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleGoBackToDamageAnalysis}
                    style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                  >
                    ← Go back to Damage Analysis
                  </button>
                </div>
              )}
              
              {confirmedDamageAssessments.length > 0 && (
                <div className="damage-description">
                  <h3>Confirmed Damage Assessments:</h3>
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

              {!costEstimate && !loading2 && (
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateEstimate}
                  disabled={loading2}
                >
                  Generate Estimate
                </button>
              )}

              {loading2 && (
                <div className="loading">
                  <div className="spinner"></div>
                  <p style={{ whiteSpace: 'pre-line' }}>{loading2Message || 'Generating estimate...'}</p>
                </div>
              )}
              {error2 && <div className="error">{error2}</div>}

              {costEstimate && !showCostEstimationOverride && (
                <div className="estimate-result">
                  <h3>Repair Cost Estimate</h3>
                  
                  {costEstimate.result && (
                    <div className="estimate-display">
                      {/* Total Cost */}
                      <div className="estimate-total">
                        <div className="estimate-total-label">Total Estimated Cost</div>
                        <div className="estimate-total-amount">
                          USD ${costEstimate.result.total_base_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div className="estimate-cost-breakdown">
                        <div className="cost-breakdown-item">
                          <span className="cost-label">Parts Cost:</span>
                          <span className="cost-value">
                            ${costEstimate.result.total_parts_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                          </span>
                        </div>
                        <div className="cost-breakdown-item">
                          <span className="cost-label">Labor Cost:</span>
                          <span className="cost-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div>${costEstimate.result.total_labor_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}</div>
                            <div className="labor-hours-text" style={{ fontSize: '0.9em', color: '#666', marginTop: '0.25rem' }}>
                              {costEstimate.result.total_labor_hours?.toFixed(2) || '0.00'} hours
                            </div>
                          </span>
                        </div>
                      </div>

                      {/* Line Items */}
                      {costEstimate.result.line_items && costEstimate.result.line_items.length > 0 && (
                        <div className="estimate-breakdown">
                          <h4>Cost Breakdown by Damage Type</h4>
                          <div className="breakdown-list">
                            {costEstimate.result.line_items.map((item: any, index: number) => (
                              <div key={index} className="breakdown-item">
                                <div className="breakdown-item-header">
                                  <span className="breakdown-label">
                                    {item.damage_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} ({item.damage_severity})
                                  </span>
                                  <span className="breakdown-value">
                                    ${item.base_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                                  </span>
                                </div>
                                <div className="breakdown-item-details">
                                  <span>Parts: ${item.parts_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}</span>
                                  <span>
                                    Labor: ${item.labor_cost?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                                    <div style={{ fontSize: '0.9em', color: '#666', marginTop: '0.25rem', marginLeft: '0.5rem' }}>
                                      {item.labor_hours?.toFixed(2) || '0.00'} hours
                                    </div>
                                  </span>
                                  {item.notes && <span className="breakdown-notes">{item.notes}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="stage-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleCostEstimationConfirm}
                    >
                      Send claim to Sr. Agent for Approval
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleCostEstimationOverride}
                    >
                      No, override
                    </button>
                  </div>
                </div>
              )}

              {showCostEstimationOverride && confirmedDamageAssessments.length > 0 && (
                <div className="override-form">
                  <h3>Manual Cost Override</h3>
                  <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                    Override costs for each damage type:
                  </p>
                  
                  {confirmedDamageAssessments.map((assess) => {
                    const key = getAssessmentKey(assess)
                    const displayName = assess.damage_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                    const severityBadge = assess.severity
                    
                    return (
                      <div key={key} className="override-assessment-section">
                        <h4 className="override-assessment-title">
                          {displayName}
                          <span className={`severity-badge ${severityBadge}`}>
                            {severityBadge}
                          </span>
                        </h4>
                        <div className="override-assessment-inputs">
                          <label>
                            Parts Cost ($):
                            <input
                              type="text"
                              value={overrideCosts[key]?.parts || ''}
                              onChange={(e) => handlePartsCostChange(key, e.target.value)}
                              className="override-input"
                              placeholder="0.00"
                            />
                          </label>
                          <label>
                            Labor Cost ($):
                            <input
                              type="text"
                              value={overrideCosts[key]?.labor || ''}
                              onChange={(e) => handleLaborCostChange(key, e.target.value)}
                              className="override-input"
                              placeholder="0.00"
                            />
                            {overrideCosts[key]?.labor && parseFormattedNumber(overrideCosts[key].labor) > 0 && (
                              <small className="labor-hours-display">
                                ≈ {calculateLaborHours(key)} hours (at ${LABOR_RATE_PER_HOUR}/hour)
                              </small>
                            )}
                          </label>
                        </div>
                      </div>
                    )
                  })}
                  
                  <label>
                    Notes:
                    <textarea
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      className="override-input"
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </label>
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.9em', color: '#495057' }}>
                    Your override helps improve future AI performance. This information may be used for training and reinforcement learning.
                  </div>
                  <div className="override-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleCostEstimationOverrideSubmit}
                    >
                      Submit Override
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowCostEstimationOverride(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="navigation">
          <button
            className="btn btn-secondary"
            onClick={() => router.push('/')}
          >
            ← Back to Initial Claim Report
          </button>
        </div>
      </div>
    </div>
  )
}
