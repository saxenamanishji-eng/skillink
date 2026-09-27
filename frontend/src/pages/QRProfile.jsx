import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext.jsx';

export const QRProfile = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  if (!user) return null;

  const profileUrl = `${window.location.origin}/u/${user.username}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('user-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `skilllink-qr-${user.username}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.full_name} on SkillLink`,
          text: `Connect with ${user.full_name} and explore their skills on SkillLink:`,
          url: profileUrl
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '540px', textAlign: 'center' }}>
      <div className="card" style={{ padding: '2.5rem 1.75rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Permanent QR Profile</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Show this QR code in-person or attach it to your resume to connect instantly.
        </p>

        {/* QR Code Frame */}
        <div style={{
          display: 'inline-block',
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-border)',
          marginBottom: '1.5rem'
        }}>
          <QRCodeSVG
            id="user-qr-code"
            value={profileUrl}
            size={220}
            level="H"
            includeMargin={true}
          />
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{user.full_name}</div>
          <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.95rem' }}>@{user.username}</div>
          {user.college && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>🎓 {user.college}</div>}
        </div>

        {/* Profile URL Preview Box */}
        <div style={{
          backgroundColor: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 0.9rem',
          margin: '1.5rem 0 1.25rem',
          fontSize: '0.85rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-secondary)',
          wordBreak: 'break-all'
        }}>
          {profileUrl}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          <button onClick={handleCopyLink} className="btn btn-secondary btn-sm">
            {copied ? '✓ Copied' : '📋 Copy Link'}
          </button>
          <button onClick={handleDownloadQR} className="btn btn-secondary btn-sm">
            📥 Download PNG
          </button>
          <button onClick={handleShare} className="btn btn-primary btn-sm">
            📤 Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRProfile;
