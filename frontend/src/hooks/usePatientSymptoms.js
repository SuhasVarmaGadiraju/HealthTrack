import { useCallback, useEffect, useRef, useState } from 'react'
import { createSymptom, fetchSymptoms, fetchSymptomTrends } from '../api/symptoms'

const DEFAULT_PATIENT_ID = 'PAT001'

export function validatePatientId(rawValue) {
  const trimmed = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!trimmed) {
    return { valid: false, value: '', error: 'Patient ID cannot be empty.' }
  }
  if (trimmed.length > 100) {
    return { valid: false, value: trimmed, error: 'Patient ID must be 100 characters or fewer.' }
  }
  return { valid: true, value: trimmed, error: null }
}

export function usePatientSymptoms(initialPatientId = DEFAULT_PATIENT_ID) {
  const [editablePatientId, setEditablePatientId] = useState(initialPatientId)
  const [activePatientId, setActivePatientId] = useState(initialPatientId)
  const [patientInputError, setPatientInputError] = useState(null)

  const [symptoms, setSymptoms] = useState([])
  const [trends, setTrends] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoadingTrends, setIsLoadingTrends] = useState(true)
  const [historyError, setHistoryError] = useState(null)
  const [trendsError, setTrendsError] = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  const activePatientRef = useRef(activePatientId)
  const abortControllerRef = useRef(null)
  const requestSeqRef = useRef(0)

  useEffect(() => {
    activePatientRef.current = activePatientId
  }, [activePatientId])

  const fetchPatientBundle = useCallback(async (patientId) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    const seq = ++requestSeqRef.current

    const [historyResult, trendsResult] = await Promise.allSettled([
      fetchSymptoms(patientId, { signal: controller.signal }),
      fetchSymptomTrends(patientId, { signal: controller.signal }),
    ])

    // Ignore stale responses if the user switched patients or a newer request started.
    if (seq !== requestSeqRef.current || activePatientRef.current !== patientId) {
      return
    }

    if (historyResult.status === 'fulfilled') {
      setSymptoms(historyResult.value)
      setIsLoadingHistory(false)
    } else if (historyResult.reason?.name !== 'AbortError') {
      setHistoryError(
        historyResult.reason?.message || 'Unable to load symptom history for this patient.'
      )
      setIsLoadingHistory(false)
    }

    if (trendsResult.status === 'fulfilled') {
      setTrends(trendsResult.value)
      setIsLoadingTrends(false)
    } else if (trendsResult.reason?.name !== 'AbortError') {
      setTrendsError(
        trendsResult.reason?.message || 'Unable to load 30-day severity trends.'
      )
      setIsLoadingTrends(false)
    }
  }, [])

  const loadPatientData = useCallback(
    async (patientId) => {
      setIsLoadingHistory(true)
      setIsLoadingTrends(true)
      setHistoryError(null)
      setTrendsError(null)
      await fetchPatientBundle(patientId)
    },
    [fetchPatientBundle]
  )

  useEffect(() => {
    void fetchPatientBundle(activePatientId)
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [activePatientId, fetchPatientBundle])

  const selectPatient = useCallback((candidateId) => {
    const check = validatePatientId(candidateId)
    if (!check.valid) {
      setPatientInputError(check.error)
      return false
    }

    setPatientInputError(null)
    setEditablePatientId(check.value)
    setSubmitError(null)
    setSubmitSuccess(null)

    if (check.value === activePatientRef.current) {
      loadPatientData(check.value)
    } else {
      activePatientRef.current = check.value
      setIsLoadingHistory(true)
      setIsLoadingTrends(true)
      setHistoryError(null)
      setTrendsError(null)
      setActivePatientId(check.value)
    }
    return true
  }, [loadPatientData])

  const retryHistory = useCallback(async () => {
    const targetPatient = activePatientRef.current
    const seq = requestSeqRef.current
    setIsLoadingHistory(true)
    setHistoryError(null)
    try {
      const data = await fetchSymptoms(targetPatient)
      if (seq === requestSeqRef.current && activePatientRef.current === targetPatient) {
        setSymptoms(data)
      }
    } catch (error) {
      if (seq === requestSeqRef.current && activePatientRef.current === targetPatient) {
        setHistoryError(error?.message || 'Unable to load symptom history.')
      }
    } finally {
      if (seq === requestSeqRef.current && activePatientRef.current === targetPatient) {
        setIsLoadingHistory(false)
      }
    }
  }, [])

  const retryTrends = useCallback(async () => {
    const targetPatient = activePatientRef.current
    const seq = requestSeqRef.current
    setIsLoadingTrends(true)
    setTrendsError(null)
    try {
      const data = await fetchSymptomTrends(targetPatient)
      if (seq === requestSeqRef.current && activePatientRef.current === targetPatient) {
        setTrends(data)
      }
    } catch (error) {
      if (seq === requestSeqRef.current && activePatientRef.current === targetPatient) {
        setTrendsError(error?.message || 'Unable to load severity trends.')
      }
    } finally {
      if (seq === requestSeqRef.current && activePatientRef.current === targetPatient) {
        setIsLoadingTrends(false)
      }
    }
  }, [])

  const submitSymptom = useCallback(async ({ description, severity }) => {
    if (isSubmitting) {
      return false
    }

    const targetPatient = activePatientRef.current
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    let createdResponse
    try {
      createdResponse = await createSymptom({
        patient_id: targetPatient,
        description,
        severity,
      })
    } catch (error) {
      if (activePatientRef.current === targetPatient) {
        setSubmitError(error?.message || 'Failed to save symptom log.')
      }
      setIsSubmitting(false)
      return false
    }

    if (activePatientRef.current !== targetPatient) {
      setIsSubmitting(false)
      return true
    }

    // Optimistically append or refresh from backend; refresh both history & trends.
    const [historyResult, trendsResult] = await Promise.allSettled([
      fetchSymptoms(targetPatient),
      fetchSymptomTrends(targetPatient),
    ])

    if (activePatientRef.current !== targetPatient) {
      setIsSubmitting(false)
      return true
    }

    let refreshFailed = false
    if (historyResult.status === 'fulfilled') {
      setSymptoms(historyResult.value)
      setHistoryError(null)
    } else {
      refreshFailed = true
      setSymptoms((prev) => [...prev, createdResponse.data])
      setHistoryError(
        historyResult.reason?.message || 'Saved symptom, but failed to refresh history.'
      )
    }

    if (trendsResult.status === 'fulfilled') {
      setTrends(trendsResult.value)
      setTrendsError(null)
    } else {
      refreshFailed = true
      setTrendsError(
        trendsResult.reason?.message || 'Saved symptom, but failed to refresh severity trends.'
      )
    }

    setSubmitSuccess(
      refreshFailed
        ? 'Symptom logged successfully, but refreshing the dashboard data failed. Use Retry to reload.'
        : createdResponse.message || 'Symptom logged successfully.'
    )
    setIsSubmitting(false)
    return true
  }, [isSubmitting])

  const clearFeedback = useCallback(() => {
    setSubmitError(null)
    setSubmitSuccess(null)
  }, [])

  return {
    editablePatientId,
    setEditablePatientId,
    activePatientId,
    patientInputError,
    setPatientInputError,
    symptoms,
    trends,
    isLoadingHistory,
    isLoadingTrends,
    historyError,
    trendsError,
    isSubmitting,
    submitError,
    submitSuccess,
    selectPatient,
    retryHistory,
    retryTrends,
    submitSymptom,
    clearFeedback,
  }
}
