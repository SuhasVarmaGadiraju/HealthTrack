import { useCallback, useEffect, useRef, useState } from 'react'
import { createSymptom, fetchPatients, fetchSymptoms, fetchSymptomTrends } from '../api/symptoms'

const DEFAULT_PATIENT_ID = 'PAT001'

function extractUniquePatientIds(records) {
  const seen = new Set()
  const ids = []
  for (const item of records) {
    const pid = typeof item?.patient_id === 'string' ? item.patient_id.trim() : ''
    if (pid && !seen.has(pid)) {
      seen.add(pid)
      ids.push(pid)
    }
  }
  return ids
}

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
  const [patients, setPatients] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoadingTrends, setIsLoadingTrends] = useState(true)
  const [isLoadingPatients, setIsLoadingPatients] = useState(true)
  const [historyError, setHistoryError] = useState(null)
  const [trendsError, setTrendsError] = useState(null)
  const [patientsError, setPatientsError] = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  const activePatientRef = useRef(activePatientId)
  const abortControllerRef = useRef(null)
  const requestSeqRef = useRef(0)
  const patientsSeqRef = useRef(0)

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
    const controller = new AbortController()
    const seq = ++requestSeqRef.current
    const patientId = activePatientId

    Promise.allSettled([
      fetchSymptoms(patientId, { signal: controller.signal }),
      fetchSymptomTrends(patientId, { signal: controller.signal }),
    ]).then(([historyResult, trendsResult]) => {
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
    })

    return () => {
      controller.abort()
    }
  }, [activePatientId])

  useEffect(() => {
    const controller = new AbortController()
    const seq = ++patientsSeqRef.current

    fetchPatients({ signal: controller.signal })
      .then((records) => {
        if (seq !== patientsSeqRef.current) {
          return
        }
        setPatients(extractUniquePatientIds(records))
        setPatientsError(null)
        setIsLoadingPatients(false)
      })
      .catch((error) => {
        if (error?.name === 'AbortError' || seq !== patientsSeqRef.current) {
          return
        }
        setPatientsError(error?.message || 'Unable to load available patients.')
        setIsLoadingPatients(false)
      })

    return () => {
      controller.abort()
    }
  }, [])

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

  const retryPatients = useCallback(async () => {
    const seq = ++patientsSeqRef.current
    setIsLoadingPatients(true)
    setPatientsError(null)
    try {
      const records = await fetchPatients()
      if (seq === patientsSeqRef.current) {
        setPatients(extractUniquePatientIds(records))
      }
    } catch (error) {
      if (seq === patientsSeqRef.current) {
        setPatientsError(error?.message || 'Unable to load available patients.')
      }
    } finally {
      if (seq === patientsSeqRef.current) {
        setIsLoadingPatients(false)
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

    // Optimistically append or refresh from backend; refresh history, trends, and patient list.
    const [historyResult, trendsResult, patientsResult] = await Promise.allSettled([
      fetchSymptoms(targetPatient),
      fetchSymptomTrends(targetPatient),
      fetchPatients(),
    ])

    if (patientsResult.status === 'fulfilled') {
      setPatients(extractUniquePatientIds(patientsResult.value))
      setPatientsError(null)
    }

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
    patients,
    isLoadingHistory,
    isLoadingTrends,
    isLoadingPatients,
    historyError,
    trendsError,
    patientsError,
    isSubmitting,
    submitError,
    submitSuccess,
    selectPatient,
    retryHistory,
    retryTrends,
    retryPatients,
    submitSymptom,
    clearFeedback,
  }
}
