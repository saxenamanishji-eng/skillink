import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolution Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [status, setStatus] = useState('resolved');
  const [adminResponse, setAdminResponse] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/complaints');
      if (res.success) setComplaints(res.complaints || []);
    } catch (err) {
      console.error('Admin complaints fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleOpenResolve = (c) => {
    setSelectedComplaint(c);
    setStatus(c.status === 'open' ? 'resolved' : c.status);
    setAdminResponse(c.admin_response || '');
    setResolutionNote(c.resolution_note || '');
    setError('');
    setModalOpen(true);
  };

  const handleSaveResolution = async (e) => {
    e.preventDefault();
    if (!adminResponse.trim()) {
      setError('Please provide a formal administrator response to the complainant.');
      return;
    }

    setResolving(true);
    try {
      await api.put(`/admin/complaints/${selectedComplaint.id}/resolve`, {
        status,
        admin_response: adminResponse.trim(),
        resolution_note: resolutionNote.trim()
      });
      setModalOpen(false);
      await fetchComplaints();
    } catch (err) {
      setError(err.message || 'Failed to update complaint resolution.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Complaints & Formal Disputes Queue</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Investigate user grievances, review disputes, and issue formal findings.
        </p>
      </div>

      {loading ? (
        <Skeleton count={6} height="60px" />
      ) : complaints.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Complainant</th>
                <th>Reported User</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date Filed</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>#{c.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>Type: {c.complaint_type}</div>
                  </td>
                  <td>
                    <div>{c.complainant_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{c.complainant_username}</div>
                  </td>
                  <td>
                    {c.reported_name ? (
                      <div>
                        <div>{c.reported_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{c.reported_username}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td><StatusBadge status={c.priority} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>
                    <button
                      onClick={() => handleOpenResolve(c)}
                      className="btn btn-secondary btn-sm"
                    >
                      ⚖️ Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">🛡️</div>
          <h3>No Pending Complaints</h3>
          <p>The dispute resolution queue is clear.</p>
        </div>
      )}

      {/* Resolve Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Resolve Complaint #${selectedComplaint?.id}`}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSaveResolution} className="btn btn-primary" disabled={resolving}>
              {resolving ? 'Saving...' : 'Save Resolution & Notify'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{selectedComplaint?.subject}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {selectedComplaint?.description}
          </p>
        </div>

        <form onSubmit={handleSaveResolution}>
          <div className="form-group">
            <label>Resolution Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="under_review">Under Active Review</option>
              <option value="resolved">Resolved (Action Taken / Solved)</option>
              <option value="rejected">Rejected (Unsubstantiated / Invalid)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Response to Complainant (Sent as Notification & Visible on Ticket) *</label>
            <textarea
              rows="3"
              placeholder="Explain the findings of the investigation and actions taken..."
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Internal Audit / Admin Resolution Note</label>
            <textarea
              rows="2"
              placeholder="Private notes for the platform audit log..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminComplaints;
