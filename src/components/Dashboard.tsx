import React from 'react';
import { useMed } from '../context/MedContext';
import { 
  CheckCircle2, 
  Circle, 
  UploadCloud, 
  Plus, 
  AlertTriangle, 
  Volume2, 
  Bell,
  ArrowRight,
  Sparkles,
  Pill,
  MapPin,
  CalendarDays
} from 'lucide-react';
import { MEDICINE_DATABASE } from '../services/mockData';

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
  onOpenAddModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab, onOpenAddModal }) => {
  const { 
    user, 
    medicines, 
    adherenceRecords, 
    toggleDose, 
    speakText
  } = useMed();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Calculate doses for today
  const todayDoses: { medId: string; medName: string; dosage: string; timing: string; instructions: string }[] = [];
  
  medicines.forEach(med => {
    med.timing.forEach(t => {
      todayDoses.push({
        medId: med.id,
        medName: med.name,
        dosage: med.dosage,
        timing: t,
        instructions: med.instructions
      });
    });
  });

  // Calculate percentage
  const dayRecords = adherenceRecords[todayStr] || {};
  const totalDosesCount = todayDoses.length;
  const takenDosesCount = todayDoses.filter(dose => {
    const key = `${dose.medId}_${dose.timing}`;
    return dayRecords[key]?.taken;
  }).length;

  const progressPercentage = totalDosesCount > 0 
    ? Math.round((takenDosesCount / totalDosesCount) * 100) 
    : 0;

  // Group doses by timing slot
  const timeSlots = ['morning', 'afternoon', 'evening', 'night'];
  const timeSlotLabels: Record<string, string> = {
    morning: '🌅 Morning',
    afternoon: '☀️ Afternoon',
    evening: '🌆 Evening',
    night: '🌙 Night'
  };
  
  // Interaction check
  const activeMedNames = medicines.map(m => m.name);
  const interactionWarnings: { medA: string; medB: string; note: string }[] = [];
  
  for (let i = 0; i < activeMedNames.length; i++) {
    for (let j = i + 1; j < activeMedNames.length; j++) {
      const medA = activeMedNames[i];
      const medB = activeMedNames[j];
      
      const infoA = MEDICINE_DATABASE[medA];
      if (infoA && infoA.interactions.includes(medB)) {
        interactionWarnings.push({
          medA,
          medB,
          note: infoA.interactionNotes[medB] || `Interaction warning between ${medA} and ${medB}.`
        });
      }
    }
  }

  // SVG ring calculations
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressPercentage / 100);

  return (
    <div className="dashboard-view animate-fade-in">
      {/* Welcome Header */}
      <header className="dash-header">
        <div className="dash-header-left">
          <span className="dash-greeting-label">WELCOME BACK</span>
          <h1 className="dash-user-name">{user?.name || 'User'}</h1>
        </div>
        <div className="dash-header-right">
          <img src={user?.avatar} alt={user?.name} className="dash-avatar" />
          <button className="dash-bell-btn" onClick={() => setCurrentTab('reminders')}>
            <Bell size={18} />
          </button>
        </div>
      </header>

      {/* Adherence Summary Bar */}
      <div className="adherence-summary-strip">
        <div className="adherence-stat-left">
          <span className="adherence-label">TODAY'S PROGRESS</span>
          <span className="adherence-big-number">{takenDosesCount}/{totalDosesCount}</span>
          <span className="adherence-sub-text">{formattedDate}</span>
        </div>
      </div>

      {/* Dark Chart Card — Adherence Progress Ring */}
      <div className="dark-card progress-chart-card">
        <div className="chart-card-header">
          <div>
            <h3 style={{ color: 'white', fontSize: '1rem' }}>Adherence Progress</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>Today's dose completion</p>
          </div>
          <span className="chart-time-badge">Today</span>
        </div>

        <div className="progress-ring-row">
          <div className="progress-ring-wrapper">
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle 
                cx="65" cy="65" r={ringRadius}
                fill="none" 
                stroke="rgba(255,255,255,0.08)" 
                strokeWidth="10" 
              />
              <circle 
                cx="65" cy="65" r={ringRadius}
                fill="none"
                stroke="#e53935"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px', transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="ring-center-label">
              <span className="ring-pct">{progressPercentage}%</span>
              <span className="ring-sub">Done</span>
            </div>
          </div>

          <div className="ring-stats-col">
            <div className="ring-stat-item">
              <span className="ring-stat-val">{medicines.length}</span>
              <span className="ring-stat-lbl">Active Meds</span>
            </div>
            <div className="ring-stat-item">
              <span className="ring-stat-val">{takenDosesCount}</span>
              <span className="ring-stat-lbl">Doses Taken</span>
            </div>
            <div className="ring-stat-item">
              <span className="ring-stat-val">{totalDosesCount - takenDosesCount}</span>
              <span className="ring-stat-lbl">Remaining</span>
            </div>
          </div>
        </div>

        {progressPercentage === 100 && totalDosesCount > 0 && (
          <div className="perfect-day-banner">
            <Sparkles size={14} />
            <span>Perfect day! All doses completed.</span>
          </div>
        )}
      </div>

      {/* Update Banner */}
      {medicines.length > 0 && (
        <div className="update-banner" onClick={() => setCurrentTab('tracker')}>
          <div className="update-left">
            <span className="update-badge">● TRACKER</span>
            <span className="update-text">View your weekly dose history & streaks</span>
          </div>
          <ArrowRight size={18} />
        </div>
      )}

      {/* === Desktop 2-Column Grid === */}
      <div className="dash-two-col">
        {/* Left Column: Quick Actions + Warnings */}
        <div className="dash-col-left">
          {/* Quick Action Hub */}
          <div className="quick-hub-section">
            <span className="section-title"><Sparkles size={14} /> QUICK ACTIONS</span>
            <div className="quick-hub-grid">
              <button className="quick-hub-item" onClick={() => setCurrentTab('scanner')}>
                <div className="hub-icon-circle"><UploadCloud size={20} /></div>
                <span>Scan Rx</span>
              </button>
              <button className="quick-hub-item" onClick={onOpenAddModal}>
                <div className="hub-icon-circle"><Plus size={20} /></div>
                <span>Add Med</span>
              </button>
              <button className="quick-hub-item" onClick={() => setCurrentTab('meds')}>
                <div className="hub-icon-circle"><Pill size={20} /></div>
                <span>Medicines</span>
              </button>
              <button className="quick-hub-item" onClick={() => setCurrentTab('pharmacy')}>
                <div className="hub-icon-circle"><MapPin size={20} /></div>
                <span>Pharmacy</span>
              </button>
            </div>
          </div>

          {/* Drug Interaction Warning */}
          {interactionWarnings.length > 0 && (
            <div className="interaction-warning-card">
              <div className="warning-card-header">
                <AlertTriangle size={18} className="warning-icon-pulse" />
                <span>Drug Interaction Alert ({interactionWarnings.length})</span>
              </div>
              <p className="warning-body-text">
                {interactionWarnings[0].medA} + {interactionWarnings[0].medB}: {interactionWarnings[0].note}
              </p>
            </div>
          )}

          {/* Stats summary cards */}
          <div className="dash-stat-cards-row">
            <div className="dash-stat-card">
              <span className="dash-stat-icon">💊</span>
              <div>
                <span className="dash-stat-number">{medicines.length}</span>
                <span className="dash-stat-label">Active Medicines</span>
              </div>
            </div>
            <div className="dash-stat-card">
              <span className="dash-stat-icon">🔄</span>
              <div>
                <span className="dash-stat-number">{medicines.reduce((a, m) => a + m.refillsLeft, 0)}</span>
                <span className="dash-stat-label">Refills Left</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Today's Checklist */}
        <div className="dash-col-right">
          <div className="checklist-section">
            <div className="flex-title-row" style={{ marginBottom: '0.75rem' }}>
              <h2>Today's Medications</h2>
              <button className="btn btn-secondary btn-xs" onClick={() => setCurrentTab('tracker')}>
                <CalendarDays size={14} /> History
              </button>
            </div>

            {totalDosesCount === 0 ? (
              <div className="empty-schedule">
                <p>No medicines scheduled. Scan a prescription to get started.</p>
                <button className="btn btn-primary" onClick={() => setCurrentTab('scanner')}>
                  <UploadCloud size={16} /> Scan Prescription
                </button>
              </div>
            ) : (
              <div className="checklist-slots">
                {timeSlots.map(slot => {
                  const slotDoses = todayDoses.filter(dose => dose.timing.toLowerCase() === slot);
                  if (slotDoses.length === 0) return null;

                  return (
                    <div key={slot} className="checklist-slot">
                      <span className="slot-time-label">{timeSlotLabels[slot]}</span>
                      <div className="slot-items">
                        {slotDoses.map((dose, index) => {
                          const doseKey = `${dose.medId}_${dose.timing}`;
                          const isTaken = dayRecords[doseKey]?.taken;
                          const takenTime = dayRecords[doseKey]?.takenAt;

                          return (
                            <div 
                              key={index} 
                              className={`dose-item ${isTaken ? 'taken' : ''}`}
                            >
                              <button 
                                className="dose-check-btn"
                                onClick={() => toggleDose(todayStr, dose.medId, dose.timing)}
                              >
                                {isTaken ? (
                                  <CheckCircle2 size={22} className="icon-taken" />
                                ) : (
                                  <Circle size={22} className="icon-pending" />
                                )}
                              </button>

                              <div className="dose-info">
                                <span className="dose-name">{dose.medName} <span className="dose-strength">{dose.dosage}</span></span>
                                <span className="dose-instructions">{dose.instructions}</span>
                              </div>

                              {isTaken && (
                                <span className="taken-badge">✓ {takenTime}</span>
                              )}

                              <button 
                                className="speak-btn" 
                                onClick={() => speakText(`Take ${dose.medName} ${dose.dosage}. ${dose.instructions}`)}
                              >
                                <Volume2 size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-view {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Two-column desktop grid */
        .dash-two-col {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 900px) {
          .dash-two-col {
            grid-template-columns: 1fr;
          }
        }

        .dash-col-left {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .dash-col-right {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Stat cards row */
        .dash-stat-cards-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .dash-stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: var(--shadow-sm);
        }

        .dash-stat-icon {
          font-size: 1.5rem;
        }

        .dash-stat-card > div {
          display: flex;
          flex-direction: column;
        }

        .dash-stat-number {
          font-size: 1.3rem;
          font-weight: 800;
          line-height: 1.1;
        }

        .dash-stat-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* Header */
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dash-greeting-label {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .dash-user-name {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-top: 0.15rem;
        }

        .dash-header-right {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .dash-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border-color);
        }

        .dash-bell-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .dash-bell-btn:hover {
          background: #e8e8e8;
        }

        /* Adherence Summary Strip */
        .adherence-summary-strip {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .adherence-label {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--color-primary);
          letter-spacing: 0.06em;
        }

        .adherence-big-number {
          font-size: 2.2rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.1;
          color: var(--text-primary);
        }

        .adherence-sub-text {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .adherence-stat-left {
          display: flex;
          flex-direction: column;
        }

        /* Dark Chart Card */
        .progress-chart-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .chart-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .chart-time-badge {
          background: rgba(255,255,255,0.12);
          color: white;
          padding: 0.3rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.72rem;
          font-weight: 600;
        }

        .progress-ring-row {
          display: flex;
          align-items: center;
          gap: 2rem;
          justify-content: center;
        }

        @media (max-width: 480px) {
          .progress-ring-row {
            gap: 1.25rem;
          }
        }

        .progress-ring-wrapper {
          position: relative;
          width: 130px;
          height: 130px;
          flex-shrink: 0;
        }

        .ring-center-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ring-pct {
          font-size: 1.8rem;
          font-weight: 900;
          color: white;
          line-height: 1;
        }

        .ring-sub {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.5);
          margin-top: 0.15rem;
        }

        .ring-stats-col {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .ring-stat-item {
          display: flex;
          flex-direction: column;
        }

        .ring-stat-val {
          font-size: 1.4rem;
          font-weight: 800;
          color: white;
          line-height: 1.1;
        }

        .ring-stat-lbl {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.45);
        }

        .perfect-day-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: rgba(76, 175, 80, 0.15);
          color: #4caf50;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* Update Banner */
        .update-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .update-banner:hover {
          border-color: var(--border-color-hover);
          box-shadow: var(--shadow-md);
        }

        .update-left {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .update-badge {
          background: var(--text-primary);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-full);
          letter-spacing: 0.02em;
        }

        .update-text {
          font-size: 0.82rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Quick Actions Hub */
        .quick-hub-section {
          display: flex;
          flex-direction: column;
        }

        .quick-hub-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 480px) {
          .quick-hub-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
          }
        }

        .quick-hub-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 1rem 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-card);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: var(--font-sans);
          box-shadow: var(--shadow-sm);
        }

        .quick-hub-item:hover {
          border-color: var(--border-color-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .hub-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--bg-input);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          transition: all var(--transition-fast);
        }

        .quick-hub-item:hover .hub-icon-circle {
          background: var(--color-primary-glow);
          color: var(--color-primary);
        }

        .quick-hub-item span {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        /* Drug Interaction Warning */
        .interaction-warning-card {
          background: #fff5f5;
          border: 1px solid rgba(229, 57, 53, 0.15);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .warning-card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--color-danger);
        }

        .warning-icon-pulse {
          animation: pulseGlow 2s infinite;
        }

        .warning-body-text {
          font-size: 0.8rem;
          color: var(--color-danger);
          line-height: 1.5;
        }

        /* Checklist Section */
        .checklist-section {
          display: flex;
          flex-direction: column;
        }

        .empty-schedule {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2.5rem 0;
          color: var(--text-muted);
          text-align: center;
        }

        .checklist-slots {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .checklist-slot {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .slot-time-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-secondary);
          letter-spacing: 0.02em;
        }

        .slot-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .dose-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .dose-item:hover {
          border-color: var(--border-color-hover);
          box-shadow: var(--shadow-md);
        }

        .dose-item.taken {
          background: #f0fdf4;
          border-color: rgba(46, 125, 50, 0.15);
        }

        .dose-check-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: transform var(--transition-fast);
          flex-shrink: 0;
        }

        .dose-check-btn:hover {
          transform: scale(1.1);
        }

        .icon-taken {
          color: var(--color-success);
        }

        .icon-pending {
          color: var(--text-muted);
        }

        .dose-check-btn:hover .icon-pending {
          color: var(--color-primary);
        }

        .dose-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .dose-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .dose-item.taken .dose-name {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .dose-strength {
          font-weight: 500;
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: var(--bg-input);
          padding: 0.05rem 0.35rem;
          border-radius: var(--radius-xs);
          margin-left: 0.3rem;
        }

        .dose-instructions {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .taken-badge {
          font-size: 0.68rem;
          color: var(--color-success);
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .speak-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem;
          border-radius: 50%;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .speak-btn:hover {
          color: var(--color-primary);
          background: var(--color-primary-glow);
        }

        /* Responsive */
        @media (max-width: 480px) {
          .dash-user-name {
            font-size: 1.3rem;
          }
          .adherence-big-number {
            font-size: 1.8rem;
          }
          .update-text {
            font-size: 0.75rem;
          }
          .ring-pct {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};
