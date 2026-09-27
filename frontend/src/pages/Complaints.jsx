import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/complaints')
      .then(res => {
        if (res.success) setComplaints(res.complaints || []);
      })
      .catch(err => console.error('Fetch complaints error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrapper">
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Complaints & Formal Disputes</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            "I have a problem or issue that needs investigation." (about a user, service, booking, or review)
          </p>
        </div>
        <Link to="/complaints/new" className="btn btn-danger">
          + File New Complaint
        </Link>
      </div>

      {loading ? (
        <Skeleton count={4} height="70px" />
      ) : complaints.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Filed Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>#{c.id}</td>
                  <td style={{ fontWeight: 600 }}>{c.subject}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.complaint_type}</td>
                  <td><StatusBadge status={c.priority} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>
                    <Link to={`/complaints/${c.id}`} className="btn btn-secondary btn-sm">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">🛡️</div>
          <h3>No Complaints Filed</h3>
          <p>You have no active or historical complaints logged on your account.</p>
        </div>
      )}
    </div>
  );
};

export default Complaints;
