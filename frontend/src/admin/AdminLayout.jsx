import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const AdminLayout = () => {
  const { user } = useAuth();

  const adminLinks = [
    { to: '/admin', end: true, label: 'Dashboard', icon: '📊' },
    { to: '/admin/users', label: 'Users', icon: '👥' },
    { to: '/admin/skills', label: 'Skills Directory', icon: '⚡' },
    { to: '/admin/services', label: 'Services', icon: '💼' },
    { to: '/admin/bookings', label: 'Bookings', icon: '🗓️' },
    { to: '/admin/complaints', label: 'Complaints', icon: '⚠️' },
    { to: '/admin/reports', label: 'Reports', icon: '🚩' },
    { to: '/admin/helpdesk', label: 'Helpdesk Tickets', icon: '💬' },
    { to: '/admin/reviews', label: 'Review Moderation', icon: '⭐' },
    { to: '/admin/articles', label: 'Knowledge Base', icon: '📖' },
    { to: '/admin/analytics', label: 'DBMS Analytics', icon: '📈' },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: '🛡️' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 65px)' }}>
      {/* Admin Sidebar */}
      <aside style={{
        width: '240px',
        backgroundColor: 'var(--color-surface-alt)',
        borderRight: '1px solid var(--color-border)',
        padding: '1.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        flexShrink: 0
      }}>
        <div style={{ padding: '0 0.75rem 0.75rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Admin Console
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
            Logged in as: <strong>{user?.username}</strong>
          </div>
        </div>

        {adminLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              color: isActive ? '#ffffff' : 'var(--color-text)',
              backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.875rem',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)'
            })}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
            ← Back to User App
          </Link>
        </div>
      </aside>

      {/* Admin Content Viewport */}
      <main style={{ flex: 1, padding: '2rem', minWidth: 0, overflowX: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
