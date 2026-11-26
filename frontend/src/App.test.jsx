import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SeverityChart } from './components/SeverityChart'

// Provide a minimal ResizeObserver stub for Recharts ResponsiveContainer in jsdom.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub

const PAT001_LOGS = [
  {
    id: 1,
    patient_id: 'PAT001',
    description: 'Morning sinus pressure',
    severity: 3,
    timestamp: '2026-11-23T08:00:00.000000Z',
  },
  {
    id: 2,
    patient_id: 'PAT001',
    description: 'Afternoon migraine',
    severity: 8,
    timestamp: '2026-11-24T14:30:00.000000Z',
  },
  {
    id: 3,
    patient_id: 'PAT001',
    description: 'Evening fatigue',
    severity: 4,
    timestamp: '2026-11-24T20:15:00.000000Z',
  },
]

const PAT002_LOGS = [
  {
    id: 10,
    patient_id: 'PAT002',
    description: 'Seasonal allergy sneezing',
    severity: 2,
    timestamp: '2026-11-25T09:00:00.000000Z',
  },
]

function makeTrends(overrides = {}) {
  const days = []
  for (let i = 0; i < 30; i += 1) {
    const day = String(i + 1).padStart(2, '0')
    const date = `2026-11-${day}`
    const override = overrides[date]
    days.push({
      date,
      average_severity: override ? override.average_severity : null,
      symptom_count: override ? override.symptom_count : 0,
    })
  }
  return days
}

function jsonResponse(data, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

describe('HealthTrack Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders dashboard, loads PAT001 history, computes summary stats, and preserves chronological order', async () => {
    const trends = makeTrends({
      '2026-11-23': { average_severity: 3.0, symptom_count: 1 },
      '2026-11-24': { average_severity: 6.0, symptom_count: 2 },
    })

    const fetchMock = vi.fn((url) => {
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(trends)
      }
      if (url.includes('/api/symptoms?patient_id=PAT001')) {
        return jsonResponse(PAT001_LOGS)
      }
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    globalThis.fetch = fetchMock

    render(<App />)

    expect(screen.getByText('HealthTrack')).toBeInTheDocument()
    expect(screen.getByText('Your Health Overview')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Morning sinus pressure')).toBeInTheDocument()
    })

    // Summary statistics: 3 logs, avg (3+8+4)/3 = 5.0, latest = 4, distinct UTC days = 2
    expect(screen.getByText('3 records')).toBeInTheDocument()
    expect(screen.getByText('5.0 / 10')).toBeInTheDocument()
    expect(screen.getByText('4 / 10')).toBeInTheDocument()
    const daysTrackedCard = screen.getByText('Days tracked').closest('div').parentElement
    expect(within(daysTrackedCard).getByText('2')).toBeInTheDocument()

    // Reverse-chronological order in table: newest first
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1) // skip header row
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Evening fatigue')
    expect(rows[1]).toHaveTextContent('Afternoon migraine')
    expect(rows[2]).toHaveTextContent('Morning sinus pressure')
  })

  it('displays empty states when patient has no symptom records', async () => {
    globalThis.fetch = vi.fn((url) => {
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      return jsonResponse([])
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('No symptoms logged yet')).toBeInTheDocument()
    })
    expect(screen.getByText('No trend data in the last 30 days')).toBeInTheDocument()
    expect(screen.getByText('0 records')).toBeInTheDocument()
  })

  it('rejects whitespace-only descriptions without triggering a POST request', async () => {
    globalThis.fetch = vi.fn((url) => {
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      return jsonResponse([])
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('No symptoms logged yet')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Symptom Description')
    fireEvent.change(textarea, { target: { value: '    \n\t  ' } })
    fireEvent.click(screen.getByRole('button', { name: /Log Symptom/i }))

    expect(
      screen.getByText('Please enter a symptom description before submitting.')
    ).toBeInTheDocument()

    const postCalls = globalThis.fetch.mock.calls.filter(
      ([, options]) => options?.method === 'POST'
    )
    expect(postCalls).toHaveLength(0)
  })

  it('submits valid symptom, sends correct payload, and updates history', async () => {
    const newRecord = {
      id: 4,
      patient_id: 'PAT001',
      description: 'Mild tension headache',
      severity: 7,
      timestamp: '2026-11-25T10:00:00.000000Z',
    }
    let currentLogs = [...PAT001_LOGS]

    globalThis.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        currentLogs = [...currentLogs, newRecord]
        return jsonResponse({ message: 'Symptom logged successfully', data: newRecord }, 201)
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      return jsonResponse(currentLogs)
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Morning sinus pressure')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Symptom Description')
    fireEvent.change(textarea, { target: { value: '  Mild tension headache  ' } })

    const severitySeven = screen.getByRole('radio', { name: '7' })
    fireEvent.click(severitySeven)
    fireEvent.click(screen.getByRole('button', { name: /Log Symptom/i }))

    await waitFor(() => {
      expect(screen.getByText('Symptom logged successfully')).toBeInTheDocument()
    })

    const postCall = globalThis.fetch.mock.calls.find(([, opts]) => opts?.method === 'POST')
    expect(postCall).toBeDefined()
    expect(JSON.parse(postCall[1].body)).toEqual({
      patient_id: 'PAT001',
      description: 'Mild tension headache',
      severity: 7,
    })

    // Form cleared and new record appears at the top of the table (newest first)
    expect(textarea).toHaveValue('')
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('Mild tension headache')
  })

  it('preserves entered symptom text on network failure and prevents duplicate pending submissions', async () => {
    let resolvePost
    const pendingPost = new Promise((resolve) => {
      resolvePost = resolve
    })

    globalThis.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        return pendingPost
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      return jsonResponse([])
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('No symptoms logged yet')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Symptom Description')
    fireEvent.change(textarea, { target: { value: 'Persistent dizziness' } })

    const submitButton = screen.getByRole('button', { name: /Log Symptom/i })
    fireEvent.click(submitButton)
    // Attempt duplicate click while pending
    fireEvent.click(submitButton)

    const postCalls = globalThis.fetch.mock.calls.filter(([, opts]) => opts?.method === 'POST')
    expect(postCalls).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Saving symptom/i })).toBeDisabled()

    // Simulate network rejection
    resolvePost(Promise.reject(new TypeError('Failed to fetch')))

    await waitFor(() => {
      expect(
        screen.getByText(/Unable to connect to the HealthTrack backend/i)
      ).toBeInTheDocument()
    })
    expect(textarea).toHaveValue('Persistent dizziness')
  })

  it('switches patients and prevents stale responses from overwriting active patient data', async () => {
    let resolveSlowPat1
    let pat1CallCount = 0

    globalThis.fetch = vi.fn((url) => {
      if (url.includes('patient_id=PAT001') && !url.includes('trends')) {
        pat1CallCount += 1
        if (pat1CallCount === 1) {
          return jsonResponse(PAT001_LOGS)
        }
        // Simulate a slow PAT001 request if triggered again
        return new Promise((resolve) => {
          resolveSlowPat1 = resolve
        })
      }
      if (url.includes('patient_id=PAT002') && !url.includes('trends')) {
        return jsonResponse(PAT002_LOGS)
      }
      return jsonResponse(makeTrends())
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Morning sinus pressure')).toBeInTheDocument()
    })

    // Trigger a slow reload of PAT001, then immediately switch to PAT002
    fireEvent.click(screen.getByRole('button', { name: 'Load Patient' }))
    fireEvent.change(screen.getByLabelText('Patient ID'), { target: { value: 'PAT002' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load Patient' }))

    await waitFor(() => {
      expect(screen.getByText('Seasonal allergy sneezing')).toBeInTheDocument()
    })

    // Resolve the stale PAT001 response after PAT002 is already active
    if (resolveSlowPat1) {
      resolveSlowPat1(
        new Response(JSON.stringify(PAT001_LOGS), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    }

    await waitFor(() => {
      expect(screen.getByText('Seasonal allergy sneezing')).toBeInTheDocument()
    })
    expect(screen.queryByText('Morning sinus pressure')).not.toBeInTheDocument()
  })

  it('renders SeverityChart cleanly with partial null data and empty data', () => {
    const partialTrends = makeTrends({
      '2026-11-10': { average_severity: 5.5, symptom_count: 2 },
    })
    const { rerender } = render(
      <SeverityChart trends={partialTrends} isLoading={false} error={null} onRetry={() => {}} />
    )
    expect(screen.getByText('Severity Trends')).toBeInTheDocument()
    expect(screen.queryByText('No trend data in the last 30 days')).not.toBeInTheDocument()

    rerender(
      <SeverityChart trends={makeTrends()} isLoading={false} error={null} onRetry={() => {}} />
    )
    expect(screen.getByText('No trend data in the last 30 days')).toBeInTheDocument()
  })

  it('displays server 422 and 500 errors safely and preserves entered form text', async () => {
    let mode = '422'
    globalThis.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        if (mode === '422') {
          return jsonResponse(
            { detail: [{ msg: 'description must not be empty or whitespace-only.' }] },
            422
          )
        }
        return jsonResponse({ detail: 'internal stack trace should not leak' }, 500)
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      return jsonResponse([])
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('No symptoms logged yet')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Symptom Description')
    fireEvent.change(textarea, { target: { value: 'Server error test symptom' } })
    fireEvent.click(screen.getByRole('button', { name: /Log Symptom/i }))

    await waitFor(() => {
      expect(
        screen.getByText('description must not be empty or whitespace-only.')
      ).toBeInTheDocument()
    })
    expect(textarea).toHaveValue('Server error test symptom')

    mode = '500'
    fireEvent.click(screen.getByRole('button', { name: /Log Symptom/i }))

    await waitFor(() => {
      expect(
        screen.getByText('The server encountered an unexpected error. Please try again shortly.')
      ).toBeInTheDocument()
    })
    expect(screen.queryByText(/internal stack trace/i)).not.toBeInTheDocument()
    expect(textarea).toHaveValue('Server error test symptom')
  })

  it('recovers from failed history retrieval via Retry and handles post-save refresh failure', async () => {
    let failHistory = true
    const savedRecord = {
      id: 99,
      patient_id: 'PAT001',
      description: 'Post-save refresh test',
      severity: 5,
      timestamp: '2026-11-25T12:00:00.000000Z',
    }

    globalThis.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        failHistory = true
        return jsonResponse({ message: 'Symptom logged successfully', data: savedRecord }, 201)
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      if (failHistory) {
        return Promise.reject(new TypeError('Network down'))
      }
      return jsonResponse(PAT001_LOGS)
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Could not load symptom history')).toBeInTheDocument()
    })

    failHistory = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(screen.getByText('Morning sinus pressure')).toBeInTheDocument()
    })

    // Now submit a symptom where POST succeeds (201) but subsequent history refresh fails
    const textarea = screen.getByLabelText('Symptom Description')
    fireEvent.change(textarea, { target: { value: 'Post-save refresh test' } })
    fireEvent.click(screen.getByRole('button', { name: /Log Symptom/i }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Symptom logged successfully, but refreshing the dashboard data failed. Use Retry to reload.'
        )
      ).toBeInTheDocument()
    })
    expect(textarea).toHaveValue('')
  })

  it('ignores active submission response if user switches patient mid-flight and escapes HTML descriptions', async () => {
    let resolvePost
    const pendingPost = new Promise((resolve) => {
      resolvePost = resolve
    })

    const htmlLog = {
      id: 20,
      patient_id: 'PAT002',
      description: '<script>alert("xss")</script> & rash',
      severity: 3,
      timestamp: '2026-11-25T10:00:00.000000Z',
    }

    globalThis.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        return pendingPost
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      if (url.includes('patient_id=PAT002')) {
        return jsonResponse([htmlLog])
      }
      return jsonResponse(PAT001_LOGS)
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Morning sinus pressure')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Symptom Description')
    fireEvent.change(textarea, { target: { value: 'In-flight PAT001 symptom' } })
    fireEvent.click(screen.getByRole('button', { name: /Log Symptom/i }))

    // Switch to PAT002 while PAT001 POST is still pending
    fireEvent.change(screen.getByLabelText('Patient ID'), { target: { value: 'PAT002' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load Patient' }))

    await waitFor(() => {
      expect(screen.getByText('<script>alert("xss")</script> & rash')).toBeInTheDocument()
    })

    // Resolve PAT001's in-flight POST after switching to PAT002
    resolvePost(
      new Response(
        JSON.stringify({
          message: 'Symptom logged successfully',
          data: {
            id: 50,
            patient_id: 'PAT001',
            description: 'In-flight PAT001 symptom',
            severity: 5,
            timestamp: '2026-11-25T11:00:00.000000Z',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await waitFor(() => {
      expect(screen.getByText('<script>alert("xss")</script> & rash')).toBeInTheDocument()
    })
    expect(screen.queryByText('In-flight PAT001 symptom')).not.toBeInTheDocument()
    expect(screen.queryByText('Symptom logged successfully')).not.toBeInTheDocument()
  })

  it('loads dynamic patient list, filters case-insensitively, and selects a patient with one click', async () => {
    globalThis.fetch = vi.fn((url) => {
      if (url.endsWith('/api/patients')) {
        return jsonResponse([
          { patient_id: 'PAT001' },
          { patient_id: 'PAT002' },
          { patient_id: 'PAT_ALPHA' },
        ])
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      if (url.includes('patient_id=PAT002')) {
        return jsonResponse(PAT002_LOGS)
      }
      return jsonResponse(PAT001_LOGS)
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Browse existing patients/i })).toHaveTextContent(
        'Patients (3)'
      )
    })

    fireEvent.click(screen.getByRole('button', { name: /Browse existing patients/i }))

    const searchInput = screen.getByLabelText('Search patients')
    fireEvent.change(searchInput, { target: { value: 'pat002' } })
    expect(screen.getByRole('option', { name: 'PAT002' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'PAT_ALPHA' })).not.toBeInTheDocument()

    // Non-matching search shows empty search message
    fireEvent.change(searchInput, { target: { value: 'zzz' } })
    expect(screen.getByText(/No patients matching/i)).toBeInTheDocument()

    // Clear search and select PAT002 with one click (no Load Patient click needed)
    fireEvent.change(searchInput, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'PAT002' }))

    await waitFor(() => {
      expect(screen.getByText('Seasonal allergy sneezing')).toBeInTheDocument()
    })
  })

  it('refreshes dynamic patient list after creating a new patient first symptom', async () => {
    let patientList = [{ patient_id: 'PAT001' }]
    let newPatientLogs = []

    globalThis.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        const body = JSON.parse(options.body)
        const created = {
          id: 77,
          patient_id: body.patient_id,
          description: body.description,
          severity: body.severity,
          timestamp: '2026-11-26T08:00:00.000000Z',
        }
        newPatientLogs = [created]
        patientList = [{ patient_id: 'PAT001' }, { patient_id: body.patient_id }]
        return jsonResponse({ message: 'Symptom logged successfully', data: created }, 201)
      }
      if (url.endsWith('/api/patients')) {
        return jsonResponse(patientList)
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      if (url.includes('patient_id=PAT_NEW_99')) {
        return jsonResponse(newPatientLogs)
      }
      return jsonResponse(PAT001_LOGS)
    })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Browse existing patients/i })).toHaveTextContent(
        'Patients (1)'
      )
    })

    // Enter a new patient ID manually and load it
    fireEvent.change(screen.getByLabelText('Patient ID'), { target: { value: 'PAT_NEW_99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load Patient' }))

    await waitFor(() => {
      expect(screen.getByText('No symptoms logged yet')).toBeInTheDocument()
    })

    // Submit first symptom for PAT_NEW_99
    fireEvent.change(screen.getByLabelText('Symptom Description'), {
      target: { value: 'First symptom for new patient' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Log Symptom/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Browse existing patients/i })).toHaveTextContent(
        'Patients (2)'
      )
    })
    expect(screen.getByText('First symptom for new patient')).toBeInTheDocument()
  })

  it('keeps manual Patient ID entry working when /api/patients fails and recovers on Retry', async () => {
    let failPatients = true
    globalThis.fetch = vi.fn((url) => {
      if (url.endsWith('/api/patients')) {
        if (failPatients) {
          return Promise.reject(new TypeError('Network error'))
        }
        return jsonResponse([{ patient_id: 'PAT001' }, { patient_id: 'PAT002' }])
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      if (url.includes('patient_id=PAT002')) {
        return jsonResponse(PAT002_LOGS)
      }
      return jsonResponse(PAT001_LOGS)
    })

    render(<App />)

    // Manual patient entry still works even though /api/patients failed
    fireEvent.change(screen.getByLabelText('Patient ID'), { target: { value: 'PAT002' } })
    fireEvent.click(screen.getByRole('button', { name: 'Load Patient' }))
    await waitFor(() => {
      expect(screen.getByText('Seasonal allergy sneezing')).toBeInTheDocument()
    })

    // Open dropdown, see error, and click Retry to recover
    fireEvent.click(screen.getByRole('button', { name: /Browse existing patients/i }))
    expect(
      screen.getByText(/Unable to connect to the HealthTrack backend/i)
    ).toBeInTheDocument()

    failPatients = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Browse existing patients/i })).toHaveTextContent(
        'Patients (2)'
      )
    })
  })

  it('supports Share with Doctor print action and disables it when no records exist', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    let hasLogs = false

    globalThis.fetch = vi.fn((url) => {
      if (url.endsWith('/api/patients')) {
        return jsonResponse(hasLogs ? [{ patient_id: 'PAT001' }] : [])
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      return jsonResponse(hasLogs ? PAT001_LOGS : [])
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('No symptoms logged yet')).toBeInTheDocument()
    })

    const shareButton = screen.getByRole('button', { name: /Share with Doctor/i })
    expect(shareButton).toBeDisabled()
    fireEvent.click(shareButton)
    expect(printSpy).not.toHaveBeenCalled()

    // Switch to loaded data
    hasLogs = true
    fireEvent.click(screen.getByRole('button', { name: 'Load Patient' }))

    await waitFor(() => {
      expect(screen.getByText('Evening fatigue')).toBeInTheDocument()
    })
    expect(shareButton).toBeEnabled()
    fireEvent.click(shareButton)
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByText('HealthTrack — Patient Symptom Report')).toBeInTheDocument()
  })

  it('handles fresh empty database for PAT001 and updates patient list on first symptom', async () => {
    let dbPatients = []
    let pat1Logs = []

    globalThis.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        const body = JSON.parse(options.body)
        const created = {
          id: 1,
          patient_id: body.patient_id,
          description: body.description,
          severity: body.severity,
          timestamp: '2026-11-26T08:45:00.000000Z',
        }
        pat1Logs = [created]
        dbPatients = [{ patient_id: body.patient_id }]
        return jsonResponse({ message: 'Symptom logged successfully', data: created }, 201)
      }
      if (url.endsWith('/api/patients')) {
        return jsonResponse(dbPatients)
      }
      if (url.includes('/api/symptoms/trends')) {
        return jsonResponse(makeTrends())
      }
      return jsonResponse(pat1Logs)
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('No symptoms logged yet')).toBeInTheDocument()
    })
    expect(screen.getByText('No trend data in the last 30 days')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Browse existing patients/i })).toHaveTextContent(
      'Patients (0)'
    )
    expect(screen.getByRole('button', { name: /Share with Doctor/i })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Symptom Description'), {
      target: { value: 'First fresh DB symptom' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Log Symptom/i }))

    await waitFor(() => {
      expect(screen.getByText('First fresh DB symptom')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Browse existing patients/i })).toHaveTextContent(
      'Patients (1)'
    )
    expect(screen.getByRole('button', { name: /Share with Doctor/i })).toBeEnabled()
  })
})
