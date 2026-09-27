import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { DAYS_OF_WEEK } from '../utils/helpers.js';
import Skeleton from '../components/Skeleton.jsx';

export const Availability = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Slot Form State
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [adding, setAdding] = useState(false);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const res = await api.get('/availability');
      if (res.success) setSlots(res.availability || []);
    } catch (err) {
      console.error('Fetch availability error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAvailability();
  }, [user]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setError('');
    setAdding(true);

    try {
      await api.post('/availability', {
        day_of_week: parseInt(dayOfWeek, 10),
        start_time: startTime,
        end_time: endTime
      });
      await fetchAvailability();
    } catch (err) {
      setError(err.message || 'Failed to add availability slot.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      await api.delete(`/availability/${slotId}`);
      await fetchAvailability();
    } catch (err) {
      alert(err.message || 'Failed to delete slot.');
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Weekly Booking Availability Schedule</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Set your recurring weekly hours when peers can book your skill services.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Add Slot Form Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>+ Add Recurring Availability Window</h3>

        <form onSubmit={handleAddSlot} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Day of Week</label>
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
              {DAYS_OF_WEEK.map((day, idx) => (
                <option key={idx} value={idx}>{day}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={adding} style={{ height: '42px' }}>
            {adding ? 'Adding...' : 'Add Slot'}
          </button>
        </form>
      </div>

      {/* Existing Slots Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active Weekly Windows</h3>

        {loading ? (
          <Skeleton count={4} height="50px" />
        ) : slots.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day of Week</th>
                  <th>Time Window</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td style={{ fontWeight: 600 }}>{DAYS_OF_WEEK[slot.day_of_week]}</td>
                    <td className="skill-tag" style={{ border: 'none', background: 'none', padding: 0 }}>
                      {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                    </td>
                    <td>
                      <span className="badge badge-success">Active</span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--color-error)' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="state-container">
            <div className="icon">📅</div>
            <h3>No Availability Slots Configured</h3>
            <p>Add your weekly free hours above so peers can book sessions with you.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Availability;
