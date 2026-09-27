import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toggle Status Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [newActive, setNewActive] = useState(true);
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/services');
      if (res.success) setServices(res.services || []);
    } catch (err) {
      console.error('Admin services fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenStatusModal = (svc) => {
    setSelectedService(svc);
    setNewActive(!svc.is_active);
    setReason('');
    setError('');
    setModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A moderation reason is mandatory for the audit log.');
      return;
    }

    setUpdating(true);
    try {
      await api.put(`/admin/services/${selectedService.id}/status`, {
        is_active: newActive,
        reason: reason.trim()
      });
      setModalOpen(false);
      await fetchServices();
    } catch (err) {
      setError(err.message || 'Failed to update service status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Services Moderation</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Inspect peer service listings, audit prices, and deactivate non-compliant offerings.
        </p>
      </div>

      {loading ? (
        <Skeleton count={6} height="60px" />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Service Title</th>
                <th>Provider</th>
                <th>Category</th>
                <th>Agreed Cash Fee</th>
                <th>Bookings</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id}>
                  <td style={{ fontWeight: 700 }}>#{svc.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{svc.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Skill: {svc.skill_name}</div>
                  </td>
                  <td>
                    <div>{svc.provider_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>@{svc.provider_username}</div>
                  </td>
                  <td><span className="badge badge-primary">{svc.category}</span></td>
                  <td className="price-tag" style={{ fontSize: '0.95rem' }}>
                    {formatCurrency(svc.price, svc.currency)}
                  </td>
                  <td>🗓️ {svc.booking_count}</td>
                  <td><StatusBadge status={svc.is_active ? 'active' : 'inactive'} /></td>
                  <td>
                    <button
                      onClick={() => handleOpenStatusModal(svc)}
                      className={`btn btn-sm ${svc.is_active ? 'btn-danger' : 'btn-success'}`}
                    >
                      {svc.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toggle Status Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Moderate Service: ${selectedService?.title}`}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSaveStatus} className="btn btn-primary" disabled={updating}>
              {updating ? 'Saving...' : 'Confirm Status Change'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSaveStatus}>
          <div className="form-group">
            <label>Set Listing Status</label>
            <select value={newActive ? 'true' : 'false'} onChange={(e) => setNewActive(e.target.value === 'true')}>
              <option value="true">Active (Visible in Catalog)</option>
              <option value="false">Inactive / Deactivated (Hidden from Catalog)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Moderation Audit Reason *</label>
            <textarea
              rows="3"
              placeholder="e.g. Inappropriate pricing terms, spam listing, or resolved provider complaint..."
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

export default AdminServices;
