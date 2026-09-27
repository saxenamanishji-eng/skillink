import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateUsername, validateEmail, validatePassword } from '../utils/validation.js';

export const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: '',
    branch: '',
    graduation_year: '',
    bio: '',
    location: '',
    phone: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateUsername(formData.username)) {
      setError('Username must be 3-30 characters (lowercase letters, numbers, and underscores only).');
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!validatePassword(formData.password)) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(formData);
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please review your input.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '2rem auto', padding: '0 1rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.75rem' }}>Create Your SkillLink Account</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Showcase your skills, network with peers, and offer services
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="full_name"
                placeholder="e.g. Manish Kumar"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                name="username"
                placeholder="e.g. manish_dev"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <span className="form-helper">3-30 chars, lowercase, numbers, underscores</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                placeholder="e.g. manish@college.edu"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Private Phone (Optional)</label>
              <input
                type="tel"
                name="phone"
                placeholder="e.g. +91 9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
              <span className="form-helper">Stored securely in user_private table</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>College / University</label>
              <input
                type="text"
                name="college"
                placeholder="e.g. Delhi Technological University"
                value={formData.college}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Branch / Major</label>
              <input
                type="text"
                name="branch"
                placeholder="e.g. Computer Science"
                value={formData.branch}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Graduation Year</label>
              <input
                type="number"
                name="graduation_year"
                placeholder="e.g. 2026"
                min="1990"
                max="2100"
                value={formData.graduation_year}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location / City</label>
            <input
              type="text"
              name="location"
              placeholder="e.g. New Delhi, India"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Short Bio</label>
            <textarea
              name="bio"
              rows="3"
              placeholder="Tell others what you are studying, building, or looking to collaborate on..."
              value={formData.bio}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Already registered? <Link to="/login" style={{ fontWeight: 600 }}>Log In here</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
