import React, { useState } from 'react'
import { useAuth } from '../AuthContext'

const Login: React.FC = () => {
  const { signInWithEmail, verifyOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signInWithEmail(email)
    if (error) {
      setError(error.message)
    } else {
      setIsSent(true)
    }
    setLoading(false)
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await verifyOtp(email, otp)
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '320px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Login</h2>
        {!isSent ? (
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '0.5rem', fontSize: '1rem' }}
            />
            <button type="submit" disabled={loading} style={{ padding: '0.5rem', fontSize: '1rem' }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p>OTP sent to {email}. Please check your email.</p>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              style={{ padding: '0.5rem', fontSize: '1rem' }}
            />
            <button type="submit" disabled={loading} style={{ padding: '0.5rem', fontSize: '1rem' }}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}
        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
      </div>
    </div>
  )
}

export default Login