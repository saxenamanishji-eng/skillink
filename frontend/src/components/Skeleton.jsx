import React from 'react';

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)', count = 1 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width,
            height,
            borderRadius,
            backgroundColor: 'var(--color-border)',
            opacity: 0.6,
            animation: 'pulse 1.5s infinite ease-in-out'
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default Skeleton;
