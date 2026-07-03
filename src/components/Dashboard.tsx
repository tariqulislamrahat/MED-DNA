import React from 'react';
import { useMed } from '../context/MedContext';
import { 
  CheckCircle2, 
  Circle, 
  UploadCloud, 
  Plus, 
  AlertTriangle, 
  Activity, 
  Volume2, 
  Calendar,
  Clock,
  Sparkles
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
    speakText, 
    triggerSOS, 
    sendPushTest 
  } = useMed();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Calculate doses for today
  // A medicine has a schedule (timings e.g. 'morning', 'afternoon', 'evening', 'night')
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

  const triggerTestAlert = () => {
    const nextDose = todayDoses.find(dose => {
      const key = `${dose.medId}_${dose.timing}`;
      return !dayRecords[key]?.taken;
    });

    if (nextDose) {
      sendPushTest(
        `Medication Reminder: ${nextDose.medName}`,
        `It's time to take your ${nextDose.medName} ${nextDose.dosage} (${nextDose.instructions || 'as directed'}).`
      );
    } else {
      sendPushTest(
        "MedDNA Adherence Alert",
        "Excellent job! All your medicines for today are checked off."
      );
    }
  };

  return (
    <div className="dashboard-view animate-fade-in">
      {/* Header Greeting */}
      <header className="dashboard-header">
        <div>
          <span className="date-badge"><Calendar size={14} /> {formattedDate}</span>
          <h1 className="welcome-text">Welcome back, {user?.name.split(' ')[0]}!</h1>
          <p className="subtitle-text">Here is your medical plan and dosage schedule for today.</p>
        </div>
        
        {/* Quick SOS Trigger Button */}
        <button className="sos-pill-btn" onClick={triggerSOS}>
          <Activity size={16} className="pulse-icon" />
          <span>TRIGGER EMERGENCY SOS</span>
        </button>
      </header>

      {/* Grid Layout */}
      <div className="dashboard-grid">
        
        {/* Progress & Stats Card */}
        <div className="glass-card stats-card">
          <div className="stats-card-header">
            <h3>Adherence Progress</h3>
            <span className="progress-fraction">{takenDosesCount}/{totalDosesCount} taken</span>
          </div>

          <div className="progress-visual-wrapper">
            <div className="progress-ring-container">
              <svg className="progress-ring" width="160" height="160">
                {/* Background Ring */}
                <circle 
                  className="progress-ring-circle-bg" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="10" 
                  fill="transparent" 
                  r="70" 
                  cx="80" 
                  cy="80" 
                />
                {/* Foreground Progress Ring */}
                <circle 
                  className="progress-ring-circle-fg" 
                  stroke="url(#tealIndigoGradient)" 
                  strokeWidth="12" 
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - progressPercentage / 100)}`}
                  strokeLinecap="round"
                  fill="transparent" 
                  r="70" 
                  cx="80" 
                  cy="80" 
                />
                <defs>
                  <linearGradient id="tealIndigoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="progress-value-label">
                <span className="percentage">{progressPercentage}%</span>
                <span className="label">Completed</span>
              </div>
            </div>
          </div>

          {progressPercentage === 100 && totalDosesCount > 0 && (
            <div className="streak-badge-banner">
              <Sparkles size={16} />
              <span>Perfect day! 100% adherence achieved.</span>
            </div>
          )}

          <div className="stats-quick-stats">
            <div className="stat-col">
              <span className="stat-val">{medicines.length}</span>
              <span className="stat-lbl">Active Meds</span>
            </div>
            <div className="stat-col line-split">
              <span className="stat-val">{medicines.reduce((acc, curr) => acc + curr.refillsLeft, 0)}</span>
              <span className="stat-lbl">Total Refills</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="glass-card actions-card">
          <h3>Quick Health Actions</h3>
          <p className="card-desc">Easily scan new prescriptions, update schedules, or run tests.</p>
          
          <div className="actions-button-grid">
            <button className="action-tile-btn primary-gradient" onClick={() => setCurrentTab('scanner')}>
              <div className="action-tile-icon"><UploadCloud size={24} /></div>
              <div className="action-tile-text">
                <span className="title">Scan Prescription</span>
                <span className="desc">Upload image/PDF or use camera</span>
              </div>
            </button>

            <button className="action-tile-btn outline-border" onClick={onOpenAddModal}>
              <div className="action-tile-icon teal-tint"><Plus size={22} /></div>
              <div className="action-tile-text">
                <span className="title">Add Medicine</span>
                <span className="desc">Manually configure schedule</span>
              </div>
            </button>

            <button className="action-tile-btn outline-border" onClick={triggerTestAlert}>
              <div className="action-tile-icon indigo-tint"><Clock size={20} /></div>
              <div className="action-tile-text">
                <span className="title">Trigger Reminder Alert</span>
                <span className="desc">Simulate scheduled alarm</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Drug Interaction Banner Alerts */}
      {interactionWarnings.length > 0 && (
        <div className="glass-card interaction-alert-panel">
          <div className="alert-header">
            <AlertTriangle size={24} className="warning-pulse-icon" />
            <div>
              <h4>Critical Interaction Warnings Detected ({interactionWarnings.length})</h4>
              <p>The system identified potential severe side effects from combining these medicines.</p>
            </div>
          </div>
          <div className="alert-list">
            {interactionWarnings.map((warning, idx) => (
              <div key={idx} className="alert-item">
                <span className="alert-names">{warning.medA} + {warning.medB}</span>
                <p className="alert-note">{warning.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Schedule Timeline Checklist */}
      <div className="glass-card timeline-card">
        <div className="timeline-header">
          <h3>Today's Medication Checklist</h3>
          <p className="card-desc">Check off each medicine as you take it. Timing slots correspond to your schedule.</p>
        </div>

        {totalDosesCount === 0 ? (
          <div className="empty-schedule-state">
            <p>No medicines are scheduled for today.</p>
            <button className="btn btn-primary" onClick={() => setCurrentTab('scanner')}>
              <Plus size={16} /> Scan a Prescription to Begin
            </button>
          </div>
        ) : (
          <div className="timeline-slots">
            {timeSlots.map(slot => {
              const slotDoses = todayDoses.filter(dose => dose.timing.toLowerCase() === slot);
              if (slotDoses.length === 0) return null;

              return (
                <div key={slot} className="timeline-slot-row">
                  <div className="slot-label-col">
                    <span className="slot-dot" />
                    <span className="slot-title">{slot.toUpperCase()}</span>
                  </div>
                  
                  <div className="slot-items-col">
                    {slotDoses.map((dose, index) => {
                      const doseKey = `${dose.medId}_${dose.timing}`;
                      const isTaken = dayRecords[doseKey]?.taken;
                      const takenTime = dayRecords[doseKey]?.takenAt;

                      return (
                        <div 
                          key={index} 
                          className={`dose-checklist-item ${isTaken ? 'checked-taken' : ''}`}
                        >
                          <button 
                            className="dose-check-btn"
                            onClick={() => toggleDose(todayStr, dose.medId, dose.timing)}
                            title={isTaken ? "Mark as missed" : "Mark as taken"}
                          >
                            {isTaken ? (
                              <CheckCircle2 size={22} className="check-success-icon" />
                            ) : (
                              <Circle size={22} className="check-pending-icon" />
                            )}
                          </button>

                          <div className="dose-details">
                            <span className="med-name">{dose.medName} <span className="med-dosage">{dose.dosage}</span></span>
                            <span className="med-instructions">{dose.instructions}</span>
                          </div>

                          {isTaken && (
                            <span className="taken-time-badge">Taken {takenTime}</span>
                          )}

                          <button 
                            className="voice-btn" 
                            onClick={() => speakText(`Take ${dose.medName} ${dose.dosage}. Directions: ${dose.instructions}`)}
                            title="Listen to dosage instructions"
                          >
                            <Volume2 size={16} />
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

      <style>{`
        .dashboard-view {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .date-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--color-primary);
          background: var(--color-primary-glow);
          border: 1px solid rgba(13, 148, 136, 0.2);
          padding: 0.3rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .welcome-text {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .subtitle-text {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .sos-pill-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--color-danger-glow);
          border: 1px solid var(--color-danger);
          color: var(--color-danger);
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-full);
          font-family: var(--font-sans);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all var(--transition-normal);
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.15);
        }

        .sos-pill-btn:hover {
          background: var(--gradient-danger);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(244, 63, 94, 0.35);
        }

        .pulse-icon {
          animation: pulseGlow 1.5s infinite;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 2rem;
        }

        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .stats-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.5rem;
        }

        .stats-card-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-fraction {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-primary);
        }

        .progress-visual-wrapper {
          position: relative;
          width: 160px;
          height: 160px;
        }

        .progress-ring-container {
          position: relative;
        }

        .progress-ring-circle-fg {
          transform: rotate(-90deg);
          transform-origin: 80px 80px;
          transition: stroke-dashoffset var(--transition-slow);
        }

        .progress-value-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .progress-value-label .percentage {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }

        .progress-value-label .label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .streak-badge-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--color-success);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          width: 100%;
        }

        .stats-quick-stats {
          width: 100%;
          display: flex;
          border-top: 1px solid var(--border-color);
          padding-top: 1.25rem;
        }

        .stat-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-col.line-split {
          border-left: 1px solid var(--border-color);
        }

        .stat-val {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat-lbl {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .actions-card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .card-desc {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
        }

        .actions-button-grid {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          height: 100%;
          justify-content: center;
        }

        .action-tile-btn {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          text-align: left;
          padding: 1.1rem;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all var(--transition-normal);
        }

        .action-tile-btn.primary-gradient {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%);
          border-color: rgba(13, 148, 136, 0.25);
        }

        .action-tile-btn.primary-gradient:hover {
          border-color: var(--color-primary);
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(13, 148, 136, 0.15);
        }

        .action-tile-btn.outline-border {
          border-color: var(--border-color);
        }

        .action-tile-btn.outline-border:hover {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.04);
          transform: translateY(-2px);
        }

        .action-tile-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-sm);
          background: var(--color-primary-glow);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .action-tile-icon.teal-tint {
          background: rgba(13, 148, 136, 0.1);
          color: var(--color-primary);
        }

        .action-tile-icon.indigo-tint {
          background: rgba(99, 102, 241, 0.1);
          color: var(--color-secondary);
        }

        .action-tile-text {
          display: flex;
          flex-direction: column;
        }

        .action-tile-text .title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .action-tile-text .desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        /* Interaction alerts styling */
        .interaction-alert-panel {
          border-color: rgba(245, 158, 11, 0.4) !important;
          background: rgba(245, 158, 11, 0.05);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .alert-header {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .warning-pulse-icon {
          color: var(--color-warning);
          animation: pulseGlow 2s infinite;
        }

        .alert-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-top: 1px solid rgba(245, 158, 11, 0.15);
          padding-top: 1rem;
        }

        .alert-item {
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border-left: 3px solid var(--color-warning);
        }

        .alert-names {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--color-warning);
        }

        .alert-note {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Timeline schedule styling */
        .timeline-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .timeline-header {
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .empty-schedule-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem 0;
          color: var(--text-secondary);
        }

        .timeline-slots {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .timeline-slot-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 600px) {
          .timeline-slot-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
        }

        .slot-label-col {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          height: fit-content;
          padding-top: 0.5rem;
        }

        .slot-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-primary);
          box-shadow: 0 0 8px var(--color-primary);
        }

        .slot-title {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }

        .slot-items-col {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .dose-checklist-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .dose-checklist-item:hover {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
        }

        .dose-checklist-item.checked-taken {
          background: rgba(16, 185, 129, 0.04);
          border-color: rgba(16, 185, 129, 0.25);
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
        }

        .dose-check-btn:hover {
          transform: scale(1.1);
        }

        .check-success-icon {
          color: var(--color-success);
        }

        .check-pending-icon {
          color: var(--text-muted);
        }

        .dose-check-btn:hover .check-pending-icon {
          color: var(--color-primary);
        }

        .dose-details {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .dose-details .med-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .dose-checklist-item.checked-taken .dose-details .med-name {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .dose-details .med-dosage {
          font-weight: 500;
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.06);
          padding: 0.1rem 0.4rem;
          border-radius: var(--radius-xs);
          margin-left: 0.4rem;
        }

        .dose-details .med-instructions {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .taken-time-badge {
          font-size: 0.75rem;
          color: var(--color-success);
          font-weight: 500;
          background: var(--color-success-glow);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-xs);
        }

        .voice-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.4rem;
          border-radius: 50%;
          transition: all var(--transition-fast);
        }

        .voice-btn:hover {
          color: var(--color-accent);
          background: var(--color-accent-glow);
        }
      `}</style>
    </div>
  );
};
