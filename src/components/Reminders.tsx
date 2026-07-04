import React, { useState } from 'react';
import { useMed } from '../context/MedContext';
import { 
  Bell, 
  Mail, 
  ShieldAlert, 
  Save, 
  Smartphone, 
  Play
} from 'lucide-react';

export const Reminders: React.FC = () => {
  const { 
    notificationsEnabled, 
    setNotificationsEnabled,
    emailNotificationsEnabled, 
    setEmailNotificationsEnabled,
    emergencyContact,
    updateEmergencyContact,
    triggerSOS,
    sosTriggered,
    resetSOS,
    userCoordinates,
    sendPushTest,
    slotTimes,
    updateSlotTime,
    emailLogs,
    fetchEmailLogs
  } = useMed();

  const [contactName, setContactName] = useState(emergencyContact.name);
  const [contactPhone, setContactPhone] = useState(emergencyContact.phone);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownTime, setCountdownTime] = useState(5);
  const countdownIntervalRef = React.useRef<any>(null);

  const startCountdown = () => {
    setCountdownActive(true);
    setCountdownTime(5);
    countdownIntervalRef.current = setInterval(() => {
      setCountdownTime(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          setCountdownActive(false);
          triggerSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownActive(false);
    setCountdownTime(5);
  };

  React.useEffect(() => {
    fetchEmailLogs();
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmergencyContact(contactName, contactPhone);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleTimeChange = (slot: 'morning' | 'afternoon' | 'evening' | 'night', val: string) => {
    updateSlotTime(slot, val);
  };

  const testEmailNotification = () => {
    // Simulated Email Notification
    sendPushTest(
      "MedDNA Email Simulation",
      `Mock email dispatched to alex.mercer@gmail.com: Daily medicine compliance reports are ready.`
    );
  };

  return (
    <div className="reminders-view animate-fade-in">
      <header className="view-header">
        <h1>Reminders & Emergency SOS Settings</h1>
        <p>Set notification times, configure emergency responders, and trigger push reminder test alerts.</p>
      </header>

      {/* SOS Active flashing banner */}
      {sosTriggered && (
        <div className="sos-siren-banner animate-fade-in">
          <div className="siren-content">
            <ShieldAlert size={48} className="siren-icon-spin" />
            <h2>EMERGENCY SOS ACTIVE</h2>
            <p>A simulated emergency text message containing your current location coordinates was sent to your contact:</p>
            
            <div className="sos-contact-box">
              <h3>{emergencyContact.name}</h3>
              <p>{emergencyContact.phone}</p>
            </div>

            <div className="sos-log-details">
              <span>GPS Coordinates Transmitted:</span>
              <code>Latitude: 37.7749° N, Longitude: 122.4194° W</code>
            </div>

            <button className="btn btn-secondary btn-cancel-sos" onClick={resetSOS}>
              Cancel SOS Warning
            </button>
          </div>
        </div>
      )}

      <div className="reminders-grid-layout">
        
        {/* Left Side: Reminders & Alerts Preference */}
        <div className="glass-card reminders-preferences-card">
          <div className="card-section-title">
            <Bell size={18} className="title-icon" />
            <h3>Notification Preferences</h3>
          </div>

          <div className="preference-settings">
            
            {/* Push Notifications Switch */}
            <div className="setting-toggle-row">
              <div className="setting-label-block">
                <div className="icon-badge"><Smartphone size={16} /></div>
                <div>
                  <h4>Browser Push Reminders</h4>
                  <p>Trigger instant audio alerts on medication schedules</p>
                </div>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled} 
                  onChange={(e) => setNotificationsEnabled(e.target.checked)} 
                />
                <span className="slider" />
              </label>
            </div>

            {/* Email Notifications Switch */}
            <div className="setting-toggle-row">
              <div className="setting-label-block">
                <div className="icon-badge"><Mail size={16} /></div>
                <div>
                  <h4>Email Alerts</h4>
                  <p>Send summary reports and missed compliance notices</p>
                </div>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={emailNotificationsEnabled} 
                  onChange={(e) => setEmailNotificationsEnabled(e.target.checked)} 
                />
                <span className="slider" />
              </label>
            </div>
          </div>

          {/* Schedule Timings setup */}
          <div className="schedule-timings-config">
            <h4>Scheduled Timing Slots</h4>
            <p className="section-desc">Change the specific hours you receive medication notifications.</p>

            <div className="time-slots-inputs">
              {Object.keys(slotTimes).map((slot) => (
                <div key={slot} className="time-slot-input-row">
                  <span className="slot-name">{slot.toUpperCase()}</span>
                  <input 
                    type="time" 
                    className="input-field time-picker" 
                    value={slotTimes[slot as keyof typeof slotTimes]} 
                    onChange={(e) => handleTimeChange(slot as keyof typeof slotTimes, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Test Reminder Alerts actions */}
          <div className="testing-actions">
            <h4>Simulate Reminders</h4>
            <div className="test-buttons-row">
              <button className="btn btn-secondary flex-btn" onClick={() => sendPushTest("MedDNA Daily Reminder", "It's time to take Lisinopril 10mg (before bed).")}>
                <Play size={12} /> Test Push
              </button>
              <button className="btn btn-secondary flex-btn" onClick={testEmailNotification}>
                <Play size={12} /> Test Email
              </button>
            </div>
          </div>

          {/* Email Logs Section */}
          <div className="email-logs-list-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <h4>Simulated Email Dispatch Logs</h4>
            <p className="section-desc" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Logs of emails saved to MongoDB when reminders fire or SOS is triggered.</p>
            {emailLogs.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>No emails sent yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {emailLogs.map((log) => (
                  <div key={log.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>To: {log.recipient}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(log.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', margin: '0.15rem 0' }}>{log.subject}</span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{log.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Emergency SOS Configuration */}
        <div className="glass-card emergency-setup-card">
          <div className="card-section-title">
            <ShieldAlert size={18} className="title-icon danger" />
            <h3>Emergency Responder SOS</h3>
          </div>

          <p className="card-desc">Configure a relative or guardian. In case of emergency or severe interaction, clicking the SOS button immediately alerts them with coordinates.</p>

          <form className="emergency-form" onSubmit={handleSaveContact}>
            <div className="input-group">
              <label>Contact Name / Relation</label>
              <input 
                type="text" 
                className="input-field" 
                value={contactName} 
                onChange={(e) => setContactName(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group">
              <label>Contact Phone Number</label>
              <input 
                type="tel" 
                className="input-field" 
                value={contactPhone} 
                onChange={(e) => setContactPhone(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn btn-secondary save-contact-btn">
              <Save size={14} /> {saveSuccess ? "Saved Successfully!" : "Save Responder Info"}
            </button>
          </form>

          {/* Big Panic Button */}
          <div className="panic-button-wrapper">
            <h4>Trigger Panic SOS</h4>
            <p className="section-desc">Instantly triggers audible alarm logs, alerts the designated responder, and contacts emergency medical services.</p>
            
            <button className="panic-panic-btn" onClick={startCountdown}>
              <ShieldAlert size={36} />
              <span>ACTIVATE SOS</span>
            </button>
          </div>
        </div>

      </div>

      {/* 5-Second SOS Countdown Overlay */}
      {countdownActive && (
        <div className="google-overlay sos-countdown-overlay" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="google-modal glass-card" style={{ maxWidth: '380px', textAlign: 'center', borderColor: 'var(--color-danger)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1rem 0' }}>
              <div className="countdown-ring" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '4px solid var(--color-danger)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-danger)', animation: 'pulse 1s infinite' }}>
                {countdownTime}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <h3 style={{ color: 'var(--color-danger)', fontWeight: 800, fontSize: '1.4rem' }}>SOS CONNECTING</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                  Alerting emergency responders and dispatching location coordinates in {countdownTime} seconds.
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={cancelCountdown}
                style={{ background: '#374151', color: 'white', width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              >
                CANCEL TRIGGER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live SOS Active Alert Panel */}
      {sosTriggered && (
        <div className="google-overlay sos-active-overlay" style={{ background: 'rgba(15,23,42,0.9)' }}>
          <div className="google-modal glass-card" style={{ maxWidth: '420px', borderColor: 'var(--color-danger)', padding: '2rem 1.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-danger)', animation: 'pulse 0.6s infinite' }} />
                <h3 style={{ color: 'var(--color-danger)', fontWeight: 900, margin: 0, fontSize: '1.4rem' }}>CRITICAL ALERT: SOS ACTIVE</h3>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Transmitting Coordinates:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>LATITUDE:</span>
                    <span style={{ display: 'block', fontWeight: 'bold', color: 'var(--color-accent)' }}>{userCoordinates?.latitude.toFixed(6) || '37.774900'}</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>LONGITUDE:</span>
                    <span style={{ display: 'block', fontWeight: 'bold', color: 'var(--color-accent)' }}>{userCoordinates?.longitude.toFixed(6) || '-122.419400'}</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>🚨 <strong>Audible siren plays in browser</strong> via Web Audio API.</p>
                <p style={{ margin: '0 0 0.5rem 0' }}>✉️ <strong>Simulated email notification dispatched</strong> to emergency contact <strong>{emergencyContact.name}</strong> ({emergencyContact.phone}).</p>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={resetSOS}
                style={{ background: 'var(--color-danger)', color: 'white', width: '100%', padding: '0.8rem', fontWeight: 'bold', border: 'none' }}
              >
                DEACTIVATE SIREN & SOS
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reminders-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
        }

        .reminders-grid-layout {
          display: grid;
          grid-template-columns: 1.5fr 1.5fr;
          gap: 2rem;
        }

        @media (max-width: 900px) {
          .reminders-grid-layout {
            grid-template-columns: 1fr;
          }
        }

        .card-section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .title-icon {
          color: var(--color-primary);
        }

        .title-icon.danger {
          color: var(--color-danger);
        }

        .preference-settings {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .setting-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
        }

        .setting-label-block {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .icon-badge {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-xs);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .setting-label-block h4 {
          font-size: 0.95rem;
          font-weight: 600;
        }

        .setting-label-block p {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Schedule slot inputs */
        .schedule-timings-config {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .time-slots-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        @media (max-width: 480px) {
          .time-slots-inputs {
            grid-template-columns: 1fr;
          }
        }

        .time-slot-input-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0,0,0,0.15);
          border: 1px solid var(--border-color);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sm);
        }

        .slot-name {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .time-picker {
          padding: 0.25rem 0.5rem;
          font-size: 0.85rem;
          background: #090d16;
          border-color: var(--border-color);
        }

        .testing-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .test-buttons-row {
          display: flex;
          gap: 1rem;
        }

        .flex-btn {
          flex: 1;
          font-size: 0.8rem;
          padding: 0.6rem;
        }

        /* SOS PANIC SCREEN */
        .sos-siren-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
          background-color: rgba(9, 13, 22, 0.98);
          animation: sirenFlash 2s infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .siren-content {
          max-width: 500px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          background: rgba(22, 30, 49, 0.7);
          border: 2px solid var(--color-danger);
          padding: 3rem 2rem;
          border-radius: var(--radius-lg);
          box-shadow: 0 0 50px rgba(244, 63, 94, 0.35);
          backdrop-filter: blur(20px);
        }

        .siren-icon-spin {
          color: var(--color-danger);
          animation: spin 3s linear infinite;
          filter: drop-shadow(0 0 15px var(--color-danger));
        }

        .sos-contact-box {
          width: 100%;
          background: rgba(0,0,0,0.4);
          padding: 1rem;
          border-radius: var(--radius-sm);
          border: 1px stroke var(--color-danger);
        }

        .sos-contact-box h3 {
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .sos-contact-box p {
          color: var(--color-danger);
          font-weight: 700;
          font-size: 1.1rem;
          margin-top: 0.25rem;
        }

        .sos-log-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .sos-log-details code {
          background: #090d16;
          color: #fda4af;
          padding: 0.5rem;
          border-radius: var(--radius-xs);
          font-family: monospace;
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        .btn-cancel-sos {
          border-color: rgba(255,255,255,0.2);
          margin-top: 1rem;
        }

        .btn-cancel-sos:hover {
          background: rgba(255,255,255,0.1);
        }

        /* Emergency Form */
        .emergency-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .save-contact-btn {
          align-self: flex-start;
        }

        /* Panic Button */
        .panic-button-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .panic-panic-btn {
          margin-top: 1rem;
          width: 100%;
          padding: 2rem;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
          color: white;
          border: none;
          font-family: var(--font-sans);
          font-weight: 800;
          font-size: 1.3rem;
          letter-spacing: 0.05em;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          box-shadow: 0 8px 30px rgba(225, 29, 72, 0.35);
          transition: transform var(--transition-normal), box-shadow var(--transition-normal);
        }

        .panic-panic-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(225, 29, 72, 0.6);
        }

        .panic-panic-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};
