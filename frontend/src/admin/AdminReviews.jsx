import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/reviews');
      if (res.success) setReviews(res.reviews || []);
    } catch (err) {
      console.error('Admin reviews fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleOpenDelete = (r) => {
    setSelectedReview(r);
    setReason('');
    setError('');
    setModalOpen(true);
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A moderation reason is mandatory for the audit log.');
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/admin/reviews/${selectedReview.id}`, {
        body: { reason: reason.trim() }
      });
      setModalOpen(false);
      await fetchReviews();
    } catch (err) {
      setError(err.message || 'Failed to remove review.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Review & Feedback Moderation</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Inspect star ratings and feedback left for completed booking sessions.
        </p>
      </div>

      {loading ? (
        <Skeleton count={6} height="60px" />
      ) : reviews.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Review ID</th>
                <th>Service Offering</th>
                <th>Customer (Reviewer)</th>
                <th>Provider</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>#{r.id}</td>
                  <td style={{ fontWeight: 600 }}>{r.service_title}</td>
                  <td>
                    <div>{r.reviewer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{r.reviewer_username}</div>
                  </td>
                  <td>
                    <div>{r.provider_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{r.provider_username}</div>
                  </td>
                  <td style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} ({r.rating}/5)
                  </td>
                  <td style={{ maxWidth: '280px', fontSize: '0.85rem' }}>
                    "{r.comment || 'No written feedback'}"
                  </td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <button
                      onClick={() => handleOpenDelete(r)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--color-error)' }}
                    >
                      🗑️ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">⭐</div>
          <h3>No Reviews to Moderate</h3>
          <p>All completed booking reviews look healthy.</p>
        </div>
      )}

      {/* Delete Review Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Moderate Review #${selectedReview?.id}`}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleConfirmDelete} className="btn btn-danger" disabled={deleting}>
              {deleting ? 'Removing...' : 'Confirm Removal'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          Are you sure you want to remove this review? This action is irreversible and will be logged in the admin audit trail.
        </p>

        <form onSubmit={handleConfirmDelete}>
          <div className="form-group">
            <label>Moderation Reason *</label>
            <textarea
              rows="3"
              placeholder="e.g. Abusive language, verified fake dispute, or violation of review policies..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminReviews;
