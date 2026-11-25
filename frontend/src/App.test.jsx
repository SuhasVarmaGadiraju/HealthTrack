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

    // Chronological order in table: oldest first, latest at bottom
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1) // skip header row
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Morning sinus pressure')
    expect(rows[1]).toHaveTextContent('Afternoon migraine')
    expect(rows[2]).toHaveTextContent('Evening fatigue')
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

    // Form cleared and new record appears at the bottom of the table
    expect(textarea).toHaveValue('')
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)
    expect(rows[3]).toHaveTextContent('Mild tension headache')
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
    fireEvent.click(screen.getByRole('button', { name: 'PAT002' }))

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
})
