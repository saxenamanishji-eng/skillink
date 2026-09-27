import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';

export const NewComplaint = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    complaint_type: 'service',
    subject: '',
    description: '',
    priority: 'normal',
    reported_user_id: '',
    service_id: '',
    booking_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/complaints', form);
      if (res.success) {
        navigate(`/complaints/${res.complaintId}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to file complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '680px' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>File a Platform Complaint</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
          "I have a problem or issue that needs investigation."
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Complaint Type *</label>
              <select
                value={form.complaint_type}
                onChange={(e) => setForm({ ...form, complaint_type: e.target.value })}
                required
              >
                <option value="service">Service Offering Issue</option>
                <option value="booking">Booking / Delivery Dispute</option>
                <option value="user">User Conduct Dispute</option>
                <option value="review">Inaccurate Review Dispute</option>
                <option value="connection">Connection Issue</option>
                <option value="privacy">Privacy Concern</option>
                <option value="technical">Technical Error</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Urgency / Priority *</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Subject / Summary *</label>
            <input
              type="text"
              placeholder="e.g. Provider failed to deliver agreed session on Oct 12"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Detailed Explanation *</label>
            <textarea
              rows="5"
              placeholder="Provide complete facts, dates, usernames, and expected resolution..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div className="flex-between" style={{ marginTop: '1.5rem' }}>
            <Link to="/complaints" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Filing Complaint...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewComplaint;
