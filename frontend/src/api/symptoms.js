/**
 * Centralized REST API client for HealthTrack backend communication.
 */

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000'

export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL
  const base = typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_API_BASE_URL
  return base.replace(/\/+$/, '')
}

export class ApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function parseErrorResponse(response) {
  const status = response.status
  if (status >= 500) {
    return new ApiError('The server encountered an unexpected error. Please try again shortly.', {
      status,
      code: 'SERVER_ERROR',
    })
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    return new ApiError(`Request failed with status ${status}.`, {
      status,
      code: 'HTTP_ERROR',
    })
  }

  if (status === 422 && body && Array.isArray(body.detail)) {
    const messages = body.detail
      .map((item) => (typeof item?.msg === 'string' ? item.msg : null))
      .filter(Boolean)
    if (messages.length > 0) {
      return new ApiError(messages.join(' '), {
        status,
        code: 'VALIDATION_ERROR',
      })
    }
  }

  if (body && typeof body.detail === 'string' && body.detail.trim()) {
    return new ApiError(body.detail.trim(), {
      status,
      code: status === 422 ? 'VALIDATION_ERROR' : 'HTTP_ERROR',
    })
  }

  return new ApiError(`Request failed with status ${status}.`, {
    status,
    code: 'HTTP_ERROR',
  })
}

async function requestJson(path, { method = 'GET', body, signal } = {}) {
  const url = `${getApiBaseUrl()}${path}`
  const headers = { Accept: 'application/json' }
  const init = { method, headers, signal }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(
      'Unable to connect to the HealthTrack backend. Please ensure the API server is running.',
      { code: 'NETWORK_ERROR' }
    )
  }

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  try {
    return await response.json()
  } catch {
    throw new ApiError('Received an unexpected response format from the server.', {
      status: response.status,
      code: 'INVALID_RESPONSE',
    })
  }
}

export async function fetchSymptoms(patientId, { signal } = {}) {
  const params = new URLSearchParams({ patient_id: patientId })
  const data = await requestJson(`/api/symptoms?${params.toString()}`, { signal })
  if (!Array.isArray(data)) {
    throw new ApiError('Unexpected symptom history format received from server.', {
      code: 'INVALID_RESPONSE',
    })
  }
  return data
}

export async function fetchSymptomTrends(patientId, { signal } = {}) {
  const params = new URLSearchParams({ patient_id: patientId })
  const data = await requestJson(`/api/symptoms/trends?${params.toString()}`, { signal })
  if (!Array.isArray(data)) {
    throw new ApiError('Unexpected severity trends format received from server.', {
      code: 'INVALID_RESPONSE',
    })
  }
  return data
}

export async function createSymptom(payload, { signal } = {}) {
  // POST requests are never automatically retried to prevent duplicate records.
  const data = await requestJson('/api/symptoms', {
    method: 'POST',
    body: payload,
    signal,
  })
  if (!data || typeof data !== 'object' || !data.data) {
    throw new ApiError('Unexpected response after saving symptom.', {
      code: 'INVALID_RESPONSE',
    })
  }
  return data
}

export async function fetchPatients({ signal } = {}) {
  const data = await requestJson('/api/patients', { signal })
  if (!Array.isArray(data)) {
    throw new ApiError('Unexpected patient list format received from server.', {
      code: 'INVALID_RESPONSE',
    })
  }
  return data
}

export async function fetchHealth({ signal } = {}) {
  return requestJson('/api/health', { signal })
}
