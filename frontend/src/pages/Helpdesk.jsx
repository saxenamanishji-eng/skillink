import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const Helpdesk = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/helpdesk/tickets')
      .then(res => {
        if (res.success) setTickets(res.tickets || []);
      })
      .catch(err => console.error('Fetch helpdesk tickets error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrapper">
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Helpdesk Support & Assistance</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            "I need help using SkillLink." (technical issues, account questions, feature guides)
          </p>
        </div>
        <Link to="/helpdesk/new" className="btn btn-primary">
          + Create Support Ticket
        </Link>
      </div>

      {loading ? (
        <Skeleton count={4} height="70px" />
      ) : tickets.length > 0 ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Messages</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700 }}>#{t.id}</td>
                  <td style={{ fontWeight: 600 }}>{t.subject}</td>
                  <td>{t.category_name}</td>
                  <td><StatusBadge status={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>💬 {t.message_count || 1}</td>
                  <td>{formatDate(t.updated_at)}</td>
                  <td>
                    <Link to={`/helpdesk/${t.id}`} className="btn btn-secondary btn-sm">
                      Open Ticket
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state-container">
          <div className="icon">💬</div>
          <h3>No Active Support Tickets</h3>
          <p>Have questions or encountering issues? Our support administrators are here to help.</p>
          <Link to="/helpdesk/new" className="btn btn-primary btn-sm">Create a Support Ticket</Link>
        </div>
      )}
    </div>
  );
};

export default Helpdesk;
