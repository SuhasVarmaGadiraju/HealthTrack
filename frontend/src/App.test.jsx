import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App scaffold', () => {
  it('renders HealthTrack heading', () => {
    render(<App />)
    expect(screen.getByText('HealthTrack')).toBeInTheDocument()
    expect(screen.getByText('Patient Symptom Tracking')).toBeInTheDocument()
  })
})
