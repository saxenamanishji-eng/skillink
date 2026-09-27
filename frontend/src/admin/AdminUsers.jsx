import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Status Change Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newStatus, setNewStatus] = useState('active');
  const [newRole, setNewRole] = useState('user');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.success) setUsers(res.users || []);
    } catch (err) {
      console.error('Admin users fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleOpenStatusModal = (u) => {
    setSelectedUser(u);
    setNewStatus(u.status);
    setNewRole(u.role);
    setReason('');
    setError('');
    setModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('An administrative reason is mandatory for logging this action in the append-only audit trail.');
      return;
    }

    setUpdating(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}/status`, {
        status: newStatus,
        role: newRole,
        reason: reason.trim()
      });
      setModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>User Account Administration</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Inspect registered student/provider accounts, manage active/suspended statuses, and promote administrators.
        </p>
      </div>

      {/* Filter Header */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Search Accounts</label>
            <input
              type="text"
              placeholder="Username, full name, email, college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Role Filter</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="user">Standard User</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status Filter</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <Skeleton count={6} height="60px" />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User Details</th>
                <th>College / Major</th>
                <th>Role</th>
                <th>Status</th>
                <th>Skills / Bookings</th>
                <th>Joined Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>#{u.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>@{u.username} • {u.email}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{u.college || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.branch || ''}</div>
                  </td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ fontSize: '0.85rem' }}>
                    ⚡ {u.skill_count} skills • 🗓️ {u.booking_count} bookings
                  </td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <button
                      onClick={() => handleOpenStatusModal(u)}
                      className="btn btn-secondary btn-sm"
                    >
                      ⚙️ Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manage User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Manage Account: @${selectedUser?.username}`}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSaveStatus} className="btn btn-primary" disabled={updating}>
              {updating ? 'Saving Changes...' : 'Save & Log in Audit'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSaveStatus}>
          <div className="form-group">
            <label>Account Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="active">Active (Full Platform Access)</option>
              <option value="suspended">Suspended (Immediate Token Invalidation & Lockout)</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label>Privilege Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="user">Standard User</option>
              <option value="admin">Administrator (Full Admin Access)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Administrative Reason (Logged to Append-Only Audit Trail) *</label>
            <textarea
              rows="3"
              placeholder="e.g. Terms violation reported in ticket #12, or verified student credentials..."
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

export default AdminUsers;
