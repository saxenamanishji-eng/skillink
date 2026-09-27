import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import SkillCard from '../components/SkillCard.jsx';
import BookingCard from '../components/BookingCard.jsx';
import Skeleton from '../components/Skeleton.jsx';

export const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [profRes, bookRes, notifRes, connRes] = await Promise.all([
          api.get(`/users/${user.username}`),
          api.get('/bookings?limit=5'),
          api.get('/notifications'),
          api.get('/connections')
        ]);

        if (profRes.success) setProfile(profRes.profile);
        if (bookRes.success) setBookings(bookRes.bookings || []);
        if (notifRes.success) setNotifications(notifRes.notifications?.slice(0, 5) || []);
        if (connRes.success) setConnections(connRes.accepted || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Skeleton height="150px" />
        <div style={{ marginTop: '1.5rem' }}>
          <Skeleton count={4} height="80px" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Welcome Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--color-surface), var(--color-surface-alt))',
        borderLeft: '5px solid var(--color-primary)',
        marginBottom: '2rem',
        padding: '1.75rem'
      }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Hello, {user?.full_name}! 👋</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
              Welcome to your SkillLink dashboard. Manage your skills, bookings, and peer network.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/services" className="btn btn-secondary">
              💼 Browse Services
            </Link>
            <Link to="/discover" className="btn btn-primary">
              🔍 Discover Peers
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Active Connections</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-primary)' }}>
            {connections.length}
          </div>
          <Link to="/connections" style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-block' }}>
            View Connections →
          </Link>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Listed Skills</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-secondary)' }}>
            {profile?.skills?.length || 0}
          </div>
          <Link to="/skills" style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-block' }}>
            Manage Skills →
          </Link>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Bookings & Sessions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-success)' }}>
            {bookings.length}
          </div>
          <Link to="/bookings" style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-block' }}>
            View Bookings →
          </Link>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Active Services</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#0284c7' }}>
            {profile?.services?.length || 0}
          </div>
          <Link to="/services" style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-block' }}>
            Browse Offerings →
          </Link>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left Column: My Skills Preview & Recent Bookings */}
        <div>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>My Featured Skills</h3>
            <Link to="/skills" className="btn btn-secondary btn-sm">+ Add Skill</Link>
          </div>

          {profile?.skills && profile.skills.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              {profile.skills.slice(0, 4).map((s) => (
                <SkillCard key={s.skill_id} skill={s} isOwner={true} />
              ))}
            </div>
          ) : (
            <div className="state-container" style={{ marginBottom: '2rem' }}>
              <div className="icon">⚡</div>
              <h3>No Skills Added Yet</h3>
              <p>Add your technical and professional skills with proficiency levels so peers can endorse you.</p>
              <Link to="/skills" className="btn btn-primary btn-sm">Add Your First Skill</Link>
            </div>
          )}

          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Recent Bookings</h3>
            <Link to="/bookings" style={{ fontSize: '0.875rem' }}>View All →</Link>
          </div>

          {bookings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {bookings.slice(0, 3).map((b) => (
                <BookingCard key={b.id} booking={b} currentUserId={user.id} />
              ))}
            </div>
          ) : (
            <div className="state-container">
              <div className="icon">🗓️</div>
              <h3>No Bookings Scheduled</h3>
              <p>Browse peer-offered services or set up your own service listing to receive booking requests.</p>
              <Link to="/services" className="btn btn-primary btn-sm">Explore Services</Link>
            </div>
          )}
        </div>

        {/* Right Column: Recent Notifications & Quick Actions */}
        <div>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Recent Updates</h3>
            <Link to="/notifications" style={{ fontSize: '0.875rem' }}>All →</Link>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            {notifications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map((n) => (
                  <div key={n.id} style={{ padding: '0.65rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                      {n.message}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                No new notifications.
              </p>
            )}
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Quick Shortcuts</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/availability" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                📅 Set Weekly Availability
              </Link>
              <Link to="/connections" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                🤝 Manage Connections
              </Link>
              <Link to="/helpdesk" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                💬 Contact Helpdesk Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
