import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';
import Modal from '../components/Modal.jsx';

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Selected Log JSON Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 50 });
      if (actionFilter) params.append('action', actionFilter);
      if (targetTypeFilter) params.append('target_type', targetTypeFilter);

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      if (res.success) {
        setLogs(res.logs || []);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Audit logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, targetTypeFilter]);

  const handleOpenJson = (log) => {
    setSelectedLog(log);
    setJsonModalOpen(true);
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Append-Only Admin Audit Trail</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Immutable record of every administrative action, user suspension, moderation change, and dispute resolution.
            </p>
          </div>
          <span className="badge badge-success" style={{ padding: '0.4rem 0.85rem' }}>
            🔒 Append-Only Protected (No UPDATE / DELETE Endpoints)
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Target Entity Type</label>
            <select value={targetTypeFilter} onChange={(e) => setTargetTypeFilter(e.target.value)}>
              <option value="">All Entity Types</option>
              <option value="user">User Account</option>
              <option value="skill">Skill</option>
              <option value="service">Service</option>
              <option value="complaint">Complaint</option>
              <option value="report">Report</option>
              <option value="helpdesk_ticket">Helpdesk Ticket</option>
              <option value="review">Review</option>
              <option value="help_article">Help Article</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <Skeleton count={8} height="55px" />
      ) : logs.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Action Taken</th>
                <th>Target</th>
                <th>Reason Provided</th>
                <th>State Snapshots</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 700 }}>#{log.id}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {formatDate(log.created_at)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.admin_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{log.admin_username}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{log.action}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <strong>{log.target_type}</strong> {log.target_id ? `#${log.target_id}` : ''}
                  </td>
                  <td style={{ fontSize: '0.85rem', fontStyle: 'italic', maxWidth: '300px' }}>
                    "{log.reason}"
                  </td>
                  <td>
                    {(log.old_data || log.new_data) && (
                      <button
                        onClick={() => handleOpenJson(log)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        🔍 Diff JSON
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">🛡️</div>
          <h3>No Audit Records Found</h3>
          <p>No administrative events match your filter query.</p>
        </div>
      )}

      {/* JSON Diff Modal */}
      <Modal
        isOpen={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
        title={`Audit State Snapshot: Log #${selectedLog?.id}`}
        footer={
          <button onClick={() => setJsonModalOpen(false)} className="btn btn-secondary">
            Close
          </button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.35rem' }}>
              Old State Snapshot:
            </h4>
            <pre style={{
              backgroundColor: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem',
              fontSize: '0.75rem',
              overflowX: 'auto',
              maxHeight: '300px',
              fontFamily: 'var(--font-mono)'
            }}>
              {selectedLog?.old_data ? JSON.stringify(typeof selectedLog.old_data === 'string' ? JSON.parse(selectedLog.old_data) : selectedLog.old_data, null, 2) : 'null'}
            </pre>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-success)', marginBottom: '0.35rem' }}>
              New State Snapshot:
            </h4>
            <pre style={{
              backgroundColor: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem',
              fontSize: '0.75rem',
              overflowX: 'auto',
              maxHeight: '300px',
              fontFamily: 'var(--font-mono)'
            }}>
              {selectedLog?.new_data ? JSON.stringify(typeof selectedLog.new_data === 'string' ? JSON.parse(selectedLog.new_data) : selectedLog.new_data, null, 2) : 'null'}
            </pre>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminAuditLogs;
