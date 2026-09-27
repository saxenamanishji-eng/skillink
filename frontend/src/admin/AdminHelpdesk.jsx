import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminHelpdesk = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status Change Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [status, setStatus] = useState('in_progress');
  const [priority, setPriority] = useState('normal');
  const [updating, setUpdating] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/helpdesk');
      if (res.success) setTickets(res.tickets || []);
    } catch (err) {
      console.error('Admin tickets fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleOpenStatus = (t) => {
    setSelectedTicket(t);
    setStatus(t.status);
    setPriority(t.priority);
    setModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.put(`/admin/helpdesk/${selectedTicket.id}/status`, {
        status,
        priority
      });
      setModalOpen(false);
      await fetchTickets();
    } catch (err) {
      alert(err.message || 'Failed to update ticket status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Helpdesk Support Management</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Answer user inquiries, manage ticket priorities, and mark queries resolved.
        </p>
      </div>

      {loading ? (
        <Skeleton count={6} height="60px" />
      ) : tickets.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Subject</th>
                <th>User</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Messages</th>
                <th>Assigned Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700 }}>#{t.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Created {formatDate(t.created_at)}</div>
                  </td>
                  <td>
                    <div>{t.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{t.username}</div>
                  </td>
                  <td>{t.category_name}</td>
                  <td><StatusBadge status={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>💬 {t.message_count}</td>
                  <td>{t.assigned_admin_name || 'Unassigned'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link to={`/helpdesk/${t.id}`} className="btn btn-primary btn-sm">
                        💬 Thread
                      </Link>
                      <button onClick={() => handleOpenStatus(t)} className="btn btn-secondary btn-sm">
                        ⚙️ Status
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">💬</div>
          <h3>No Support Tickets</h3>
          <p>All helpdesk tickets have been addressed.</p>
        </div>
      )}

      {/* Status Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Update Ticket #${selectedTicket?.id} Status`}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSaveStatus} className="btn btn-primary" disabled={updating}>
              {updating ? 'Saving...' : 'Update Status'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveStatus}>
          <div className="form-group">
            <label>Ticket Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress / Assigned</option>
              <option value="waiting_for_user">Waiting for User Response</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
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
        </form>
      </Modal>
    </div>
  );
};

export default AdminHelpdesk;
