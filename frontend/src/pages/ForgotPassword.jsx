import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      setMessage(res.message || 'If an account exists, password reset instructions have been dispatched.');
    } catch (err) {
      setError(err.message || 'Unable to process reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto', padding: '0 1rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.75rem' }}>Reset Password</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Enter your registered email address to receive a secure password reset link.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {submitted && <div className="alert alert-success">{message}</div>}

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Registered Email</label>
              <input
                type="email"
                placeholder="name@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Sending Request...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Check your inbox (or server console in development) for the 15-minute reset token.
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <Link to="/login">← Back to Log In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
