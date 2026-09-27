import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { validateScannedQRUrl } from '../utils/helpers.js';

export const QRScanner = () => {
  const navigate = useNavigate();
  const [manualUrl, setManualUrl] = useState('');
  const [scanError, setScanError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        setScanError('');
        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // Success Callback: Parse and safely validate URL
            handleScannedResult(decodedText);
          },
          () => {
            // Ignore scan parse frames
          }
        );
        setCameraActive(true);
      } catch (err) {
        console.warn('Camera start error:', err);
        setCameraActive(false);
        setScanError('Camera access unavailable. Please ensure camera permissions are granted or use the manual URL input below.');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          try {
            scannerRef.current.clear();
          } catch {}
        });
      }
    };
  }, [facingMode]);

  const handleScannedResult = (rawText) => {
    const result = validateScannedQRUrl(rawText);

    if (result.valid) {
      // Stop scanner and navigate securely via React Router
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      navigate(result.path);
    } else {
      setScanError(`Scanned code is invalid: ${result.reason || 'Not a valid SkillLink profile QR code'}`);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setScanError('');
    if (!manualUrl.trim()) return;

    handleScannedResult(manualUrl.trim());
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '580px', textAlign: 'center' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Scan SkillLink QR Code</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Point your camera at a peer's permanent QR code to view their profile and connect.
        </p>

        {scanError && <div className="alert alert-error">{scanError}</div>}

        {/* Camera Scanner Viewport */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '360px',
          margin: '0 auto 1.5rem',
          backgroundColor: '#000000',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          minHeight: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div id="qr-reader" style={{ width: '100%' }} />
        </div>

        {/* Camera Switch Controls */}
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={toggleCamera} className="btn btn-secondary btn-sm">
            🔄 Switch Camera ({facingMode === 'environment' ? 'Rear' : 'Front'})
          </button>
        </div>

        {/* Manual Fallback Option */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Manual Fallback: Paste Profile Link</h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            If camera access is restricted on your browser, paste the SkillLink profile URL below:
          </p>

          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="e.g. https://skilllink.edu/u/alice_tech or /u/alice_tech"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Go to Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
