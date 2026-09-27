import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [status, setStatus] = useState('resolved');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/reports');
      if (res.success) setReports(res.reports || []);
    } catch (err) {
      console.error('Admin reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleOpenResolve = (r) => {
    setSelectedReport(r);
    setStatus(r.status === 'pending' ? 'resolved' : r.status);
    setResolutionNote(r.resolution_note || '');
    setError('');
    setModalOpen(true);
  };

  const handleSaveResolution = async (e) => {
    e.preventDefault();
    setResolving(true);
    try {
      await api.put(`/admin/reports/${selectedReport.id}/resolve`, {
        status,
        resolution_note: resolutionNote.trim()
      });
      setModalOpen(false);
      await fetchReports();
    } catch (err) {
      setError(err.message || 'Failed to update report.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Policy Violation Reports</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          "This user or content appears to violate platform rules." Review spam, fake accounts, and harassment.
        </p>
      </div>

      {loading ? (
        <Skeleton count={6} height="60px" />
      ) : reports.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Target User</th>
                <th>Content Type</th>
                <th>Reason</th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Reported On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>#{r.id}</td>
                  <td>
                    {r.reported_name ? (
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.reported_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{r.reported_username}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td><span className="badge badge-neutral">{r.content_type}</span></td>
                  <td><span className="badge badge-error">{r.reason.replace('_', ' ')}</span></td>
                  <td>
                    <div>{r.reporter_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{r.reporter_username}</div>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <button
                      onClick={() => handleOpenResolve(r)}
                      className="btn btn-secondary btn-sm"
                    >
                      🛡️ Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">🚩</div>
          <h3>No Pending Reports</h3>
          <p>No content reports are pending moderation.</p>
        </div>
      )}

      {/* Resolve Report Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Review Policy Report #${selectedReport?.id}`}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSaveResolution} className="btn btn-primary" disabled={resolving}>
              {resolving ? 'Saving...' : 'Save Resolution'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Reason: <strong style={{ color: 'var(--color-error)' }}>{selectedReport?.reason}</strong>
          </div>
          {selectedReport?.description && (
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--color-text)' }}>
              Reporter Note: "{selectedReport.description}"
            </p>
          )}
        </div>

        <form onSubmit={handleSaveResolution}>
          <div className="form-group">
            <label>Report Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="reviewing">Under Investigation</option>
              <option value="resolved">Resolved (Account Suspended / Content Removed)</option>
              <option value="dismissed">Dismissed (No Violation Found)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Resolution Summary Note (Logged to Audit Trail)</label>
            <textarea
              rows="3"
              placeholder="e.g. Warning issued to user, or profile picture reset due to policy violation..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminReports;
