import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export const Navbar = () => {
  const { user, logout, theme, toggleTheme, isAdmin } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      api.get('/notifications')
        .then(res => {
          if (res.success) setUnreadCount(res.unread_count || 0);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link to={user ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.2rem',
            fontFamily: 'var(--font-heading)'
          }}>
            S
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}>
            Skill<span style={{ color: 'var(--color-primary)' }}>Link</span>
          </span>
        </Link>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.75rem',
            color: 'var(--color-text)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
          title="Toggle Dark/Light Mode"
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        {user ? (
          <>
            {/* Notifications Bell */}
            <Link
              to="/notifications"
              style={{
                position: 'relative',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                border: '1px solid var(--color-border)'
              }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--color-error)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  padding: '2px 6px',
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* User Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.3rem 0.75rem 0.3rem 0.3rem',
                  color: 'var(--color-text)'
                }}
              >
                <img
                  src={user.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                  alt={user.full_name}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.full_name.split(' ')[0]}</span>
                <span style={{ fontSize: '0.7rem' }}>▼</span>
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '120%',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-card)',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '200px',
                    padding: '0.5rem',
                    zIndex: 100
                  }}
                  onClick={() => setDropdownOpen(false)}
                >
                  <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.full_name}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>@{user.username}</div>
                  </div>

                  <Link to={`/u/${user.username}`} style={{ display: 'block', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.875rem' }}>
                    👤 View Public Profile
                  </Link>
                  <Link to="/edit-profile" style={{ display: 'block', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.875rem' }}>
                    ✏️ Edit Profile
                  </Link>
                  <Link to="/qr-profile" style={{ display: 'block', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.875rem' }}>
                    📱 My QR Profile
                  </Link>

                  {isAdmin && (
                    <Link to="/admin" style={{ display: 'block', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>
                      ⚡ Admin Portal
                    </Link>
                  )}

                  <hr style={{ margin: '0.4rem 0', borderColor: 'var(--color-border)' }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      background: 'none',
                      color: 'var(--color-error)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                  >
                    🚪 Log Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/login" className="btn btn-secondary btn-sm">Log In</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
