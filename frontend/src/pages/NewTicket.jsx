import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';

export const NewTicket = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/helpdesk/categories')
      .then(res => {
        if (res.success && res.categories) {
          setCategories(res.categories);
          if (res.categories.length > 0) {
            setCategoryId(res.categories[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('category_id', categoryId);
      formData.append('subject', subject);
      formData.append('description', description);
      formData.append('priority', priority);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await api.post('/helpdesk/tickets', formData);
      if (res.success) {
        navigate(`/helpdesk/${res.ticketId}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit support ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '680px' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Create Support Ticket</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
          "I need help using SkillLink."
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Help Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Subject *</label>
            <input
              type="text"
              placeholder="e.g. Question regarding setting recurring availability slots"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description of Inquiry / Issue *</label>
            <textarea
              rows="5"
              placeholder="Please explain what you need assistance with in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Optional Screenshot or Document Attachment</label>
            <input
              type="file"
              onChange={(e) => setAttachment(e.target.files[0])}
              style={{ fontSize: '0.85rem' }}
            />
            <span className="form-helper">PNG, JPG, PDF, TXT up to 10MB</span>
          </div>

          <div className="flex-between" style={{ marginTop: '1.5rem' }}>
            <Link to="/helpdesk" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting Ticket...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTicket;
