import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const Sidebar = () => {
  const { user, isAdmin } = useAuth();

  if (!user) return null;

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/discover', label: 'Discover Peers', icon: '🔍' },
    { to: '/connections', label: 'Connections', icon: '🤝' },
    { to: '/skills', label: 'My Skills', icon: '⚡' },
    { to: '/services', label: 'Services', icon: '💼' },
    { to: '/availability', label: 'Availability', icon: '📅' },
    { to: '/bookings', label: 'Bookings', icon: '🗓️' },
    { to: '/qr-profile', label: 'My QR Code', icon: '📱' },
    { to: '/qr-scanner', label: 'Scan QR Code', icon: '📷' },
    { to: '/helpdesk', label: 'Helpdesk Support', icon: '💬' },
    { to: '/complaints', label: 'Complaints', icon: '⚠️' },
    { to: '/help', label: 'Knowledge Base', icon: '📖' },
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      padding: '1.5rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
      flexShrink: 0
    }}>
      <div style={{ padding: '0 0.75rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Main Menu
      </div>

      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
            backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
            fontWeight: isActive ? 700 : 500,
            fontSize: '0.9rem',
            textDecoration: 'none',
            transition: 'all var(--transition-fast)'
          })}
        >
          <span>{link.icon}</span>
          <span>{link.label}</span>
        </NavLink>
      ))}

      {isAdmin && (
        <>
          <div style={{ margin: '1rem 0 0.5rem', padding: '0 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Administration
          </div>
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              backgroundColor: 'var(--color-primary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none'
            })}
          >
            <span>🛡️</span>
            <span>Admin Console</span>
          </NavLink>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
