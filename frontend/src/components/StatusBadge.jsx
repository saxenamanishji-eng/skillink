import React from 'react';

export const StatusBadge = ({ status, type = 'status' }) => {
  if (!status) return null;

  const s = String(status).toLowerCase();

  let variant = 'badge-neutral';
  let icon = '•';

  if (['active', 'accepted', 'confirmed', 'completed', 'resolved', 'published'].includes(s)) {
    variant = 'badge-success';
    icon = '✓';
  } else if (['pending', 'under_review', 'in_progress', 'draft', 'open'].includes(s)) {
    variant = 'badge-warning';
    icon = '⏳';
  } else if (['rejected', 'cancelled', 'suspended', 'closed', 'dismissed', 'archived'].includes(s)) {
    variant = 'badge-error';
    icon = '✕';
  } else if (['urgent', 'high'].includes(s)) {
    variant = 'badge-error';
    icon = '🔥';
  } else if (['normal', 'low'].includes(s)) {
    variant = 'badge-primary';
    icon = '🔹';
  }

  const label = s.replace(/_/g, ' ');

  return (
    <span className={`badge ${variant}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
