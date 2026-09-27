import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const ComplaintDetails = () => {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/complaints/${id}`)
      .then(res => {
        if (res.success) setComplaint(res.complaint);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Skeleton height="250px" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="page-wrapper">
        <div className="state-container">
          <div className="icon">⚠️</div>
          <h3>Complaint Not Found</h3>
          <p>{error || 'This complaint record does not exist or access is restricted.'}</p>
          <Link to="/complaints" className="btn btn-primary btn-sm">Back to Complaints</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/complaints" style={{ fontSize: '0.85rem' }}>← Back to All Complaints</Link>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            Complaint Ticket #{complaint.id}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <StatusBadge status={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>
        </div>

        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{complaint.subject}</h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Filed on {formatDate(complaint.created_at)} • Type: <strong style={{ textTransform: 'capitalize' }}>{complaint.complaint_type}</strong>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '1.75rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Description of Issue
          </h4>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--color-text)' }}>
            {complaint.description}
          </p>
        </div>

        {/* Administrator Response Section */}
        {complaint.admin_response ? (
          <div style={{ backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--color-success)', marginBottom: '0.5rem', fontWeight: 700 }}>
              🛡️ Administrator Resolution Response
            </h4>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#065f46' }}>
              {complaint.admin_response}
            </p>
            {complaint.resolved_at && (
              <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.5rem' }}>
                Resolved on {formatDate(complaint.resolved_at)}
              </div>
            )}
          </div>
        ) : (
          <div className="alert alert-info">
            <span>⏳</span>
            <div>
              <strong>Under Review:</strong> An administrator is currently reviewing your complaint. You will receive a notification as soon as a resolution is posted.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintDetails;
