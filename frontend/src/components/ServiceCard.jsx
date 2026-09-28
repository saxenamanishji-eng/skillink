import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatPricingType } from '../utils/helpers.js';

export const ServiceCard = ({ service, onBook, onEdit, isOwner, currentUserId }) => {
  const isSelf = isOwner || (currentUserId && currentUserId === service.provider_id);

  return (
    <div className="card card-hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="flex-between">
        <span className="badge badge-primary">{service.category || 'General'}</span>
        <span className="price-tag">{formatCurrency(service.price, service.currency)}</span>
      </div>

      <div>
        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{service.title}</h4>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Skill: <strong style={{ color: 'var(--color-text)' }}>{service.skill_name}</strong>
          {service.pricing_type && ` • ${formatPricingType(service.pricing_type)}`}
          {service.duration_minutes && ` • ${service.duration_minutes} mins`}
        </div>
      </div>

      {service.description && (
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--color-text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4
        }}>
          {service.description}
        </p>
      )}

      {/* Provider Snapshot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <img
          src={service.provider_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${service.provider_username}`}
          alt={service.provider_name}
          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <div style={{ fontSize: '0.825rem' }}>
          <Link to={`/u/${service.provider_username}`} style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            {service.provider_name}
          </Link>
          <div style={{ color: 'var(--color-text-muted)' }}>
            ⭐ {parseFloat(service.avg_rating || 0).toFixed(1)} ({service.review_count || 0} reviews)
          </div>
        </div>
      </div>

      {/* Mode badges & Cash Notice */}
      <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {Boolean(service.online_available) && <span className="badge badge-success">🌐 Online</span>}
          {Boolean(service.in_person_available) && <span className="badge badge-primary">📍 In-Person</span>}
        </div>
        <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>💵 Cash on Delivery</span>
      </div>

      {/* Actions */}
      <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '0.5rem', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/services/${service.id}`} className="btn btn-secondary btn-sm">
            Details
          </Link>
          {isSelf && onEdit && (
            <button onClick={() => onEdit(service)} className="btn btn-secondary btn-sm">
              ✏️ Edit
            </button>
          )}
        </div>

        {onBook && !isSelf && (
          <button onClick={() => onBook(service)} className="btn btn-primary btn-sm">
            🗓️ Book Session
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceCard;
