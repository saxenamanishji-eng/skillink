import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import UserCard from '../components/UserCard.jsx';
import Skeleton from '../components/Skeleton.jsx';
import Modal from '../components/Modal.jsx';

export const Discover = () => {
  const [users, setUsers] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [minProficiency, setMinProficiency] = useState('');
  const [college, setCollege] = useState('');
  const [hasService, setHasService] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  // Connect Modal State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [whereWeMet, setWhereWeMet] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState('');

  // Fetch Master Skills list for filter dropdown
  useEffect(() => {
    api.get('/skills')
      .then(res => {
        if (res.success) setSkillsList(res.skills || []);
      })
      .catch(() => {});
  }, []);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 12,
        sort_by: sortBy
      });

      if (search.trim()) params.append('search', search.trim());
      if (selectedSkill) params.append('skill_id', selectedSkill);
      if (minProficiency) params.append('min_proficiency', minProficiency);
      if (college.trim()) params.append('college', college.trim());
      if (hasService) params.append('has_service', 'true');

      const res = await api.get(`/discover?${params.toString()}`);
      if (res.success) {
        setUsers(res.users || []);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Discover error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [selectedSkill, minProficiency, hasService, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleOpenConnect = (u) => {
    setSelectedUser(u);
    setWhereWeMet('');
    setConnectSuccess('');
    setConnectModalOpen(true);
  };

  const handleSendConnection = async (e) => {
    e.preventDefault();
    setConnectLoading(true);
    try {
      await api.post('/connections', {
        receiver_id: selectedUser.id,
        where_we_met: whereWeMet
      });
      setConnectSuccess('Connection request sent!');
      setTimeout(() => {
        setConnectModalOpen(false);
        fetchUsers(pagination.page);
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to send connection request.');
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Discover Peers & Skill Specialists</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Find collaborators by verified technical proficiency, campus network, and bookable offerings.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by name, username, skill, college, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '240px' }}
            />
            <button type="submit" className="btn btn-primary">
              🔍 Search
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Skill</label>
              <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
                <option value="">All Skills</option>
                {skillsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Min Proficiency</label>
              <select value={minProficiency} onChange={(e) => setMinProficiency(e.target.value)}>
                <option value="">Any Level</option>
                <option value="5">5+ (Intermediate)</option>
                <option value="7">7+ (Advanced)</option>
                <option value="9">9+ (Expert / Master)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="relevance">SkillLink Relevance</option>
                <option value="endorsements">Most Endorsed</option>
                <option value="proficiency">Highest Proficiency</option>
                <option value="newest">Recently Joined</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <input
                type="checkbox"
                id="hasServiceCheck"
                checked={hasService}
                onChange={(e) => setHasService(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="hasServiceCheck" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                💼 Available for Booking
              </label>
            </div>
          </div>
        </form>
      </div>

      {/* Result Grid */}
      {loading ? (
        <div className="grid-cols-3">
          <Skeleton count={6} height="200px" />
        </div>
      ) : users.length > 0 ? (
        <>
          <div className="grid-cols-3" style={{ marginBottom: '2rem' }}>
            {users.map((u) => (
              <UserCard key={u.id} user={u} onConnect={handleOpenConnect} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex-center" style={{ gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn btn-secondary btn-sm"
              >
                ← Previous
              </button>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.5rem' }}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} peers found)
              </span>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn btn-secondary btn-sm"
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="state-container">
          <div className="icon">🔍</div>
          <h3>No Matching Peers Found</h3>
          <p>Try broadening your filter criteria or searching for different technical skills.</p>
        </div>
      )}

      {/* Connect Modal */}
      <Modal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={`Connect with ${selectedUser?.full_name}`}
        footer={
          <>
            <button onClick={() => setConnectModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSendConnection} className="btn btn-primary" disabled={connectLoading}>
              {connectLoading ? 'Sending...' : 'Send Request'}
            </button>
          </>
        }
      >
        {connectSuccess ? (
          <div className="alert alert-success">{connectSuccess}</div>
        ) : (
          <form onSubmit={handleSendConnection}>
            <div className="form-group">
              <label>Where did you meet or collaborate?</label>
              <input
                type="text"
                placeholder="e.g. Hackathon, Database Design Class, Coding Club"
                value={whereWeMet}
                onChange={(e) => setWhereWeMet(e.target.value)}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Discover;
