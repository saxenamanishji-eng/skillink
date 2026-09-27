import React from 'react';
import { Link } from 'react-router-dom';

export const UserCard = ({ user, onConnect, connectionStatus }) => {
  return (
    <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
        <img
          src={user.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
          alt={user.full_name}
          style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' }}
        />
        <div>
          <Link to={`/u/${user.username}`} style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>
            {user.full_name}
          </Link>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem' }}>@{user.username}</div>
          {user.college && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.1rem' }}>
              🎓 {user.college} {user.graduation_year ? `('${String(user.graduation_year).slice(2)})` : ''}
            </div>
          )}
        </div>
      </div>

      {user.bio && (
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--color-text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4
        }}>
          {user.bio}
        </p>
      )}

      {/* Top Skills Preview */}
      {user.skills && user.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {user.skills.map((s, idx) => (
            <span key={idx} className="skill-tag" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
              {s.skill_name || s.name} ({s.proficiency}/10)
            </span>
          ))}
        </div>
      )}

      {/* Why this result hint badge */}
      {user.why_reason && (
        <div style={{
          backgroundColor: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 0.65rem',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <span>✨</span>
          <span>{user.why_reason}</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
        <Link to={`/u/${user.username}`} className="btn btn-secondary btn-sm">
          View Profile
        </Link>

        {onConnect && (
          <button
            onClick={() => onConnect(user)}
            className="btn btn-primary btn-sm"
            disabled={connectionStatus === 'pending' || connectionStatus === 'accepted'}
          >
            {connectionStatus === 'accepted' ? '✓ Connected' : connectionStatus === 'pending' ? '⏳ Pending' : '🤝 Connect'}
          </button>
        )}
      </div>
    </div>
  );
};

export default UserCard;
