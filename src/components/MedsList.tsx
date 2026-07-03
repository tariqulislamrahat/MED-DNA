import React, { useState } from 'react';
import { useMed } from '../context/MedContext';
import { MEDICINE_DATABASE, type MedicineInfo } from '../services/mockData';
import { 
  Volume2, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  Calendar, 
  RotateCcw, 
  Clock, 
  Info,
  X,
  ShieldCheck
} from 'lucide-react';

export const MedsList: React.FC = () => {
  const { medicines, removeMedicine, speakText } = useMed();
  const [selectedMedInfo, setSelectedMedInfo] = useState<MedicineInfo | null>(null);

  const handleOpenInfo = (medName: string) => {
    // Find in clinical database (case insensitive)
    const dbKey = Object.keys(MEDICINE_DATABASE).find(
      key => key.toLowerCase() === medName.trim().toLowerCase()
    );
    
    if (dbKey) {
      setSelectedMedInfo(MEDICINE_DATABASE[dbKey]);
    } else {
      // Create fallback info if not in db
      setSelectedMedInfo({
        name: medName,
        category: "General Medicine",
        uses: ["Take as directed by your physician"],
        sideEffects: ["Mild dizziness", "Stomach irritation"],
        precautions: ["Store in a cool dry place", "Keep out of reach of children"],
        interactions: [],
        interactionNotes: {}
      });
    }
  };

  const handleCloseInfo = () => {
    setSelectedMedInfo(null);
  };

  // Evaluate overlapping interactions
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

  return (
    <div className="meds-list-view animate-fade-in">
      <header className="view-header">
        <h1>My Active Medications</h1>
        <p>View your active prescription schedules, listen to directions, or review drug interaction alerts.</p>
      </header>

      {/* Interaction Warning Panel */}
      {interactionWarnings.length > 0 ? (
        <div className="glass-card interaction-warning-card">
          <div className="warning-head">
            <AlertTriangle size={24} className="warning-siren" />
            <div>
              <h3>Drug-to-Drug Interaction Alerts ({interactionWarnings.length})</h3>
              <p>Warning: Overlapping active drugs in your system have documented medical interaction risks.</p>
            </div>
          </div>
          <div className="warning-details-list">
            {interactionWarnings.map((warn, idx) => (
              <div key={idx} className="warning-detail-item">
                <span className="warning-tag">{warn.medA} + {warn.medB}</span>
                <p className="warning-explanation">{warn.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        medicines.length > 1 && (
          <div className="glass-card interactions-safe-card">
            <ShieldCheck size={20} className="safe-icon" />
            <span>AI Safety Shield Active: No overlapping drug interactions found among your current list.</span>
          </div>
        )
      )}

      {/* Medicines Cards Grid */}
      {medicines.length === 0 ? (
        <div className="glass-card empty-meds-card">
          <FileText size={48} />
          <h3>No Active Medicines</h3>
          <p>Your current database is empty. You can add medicines by uploading a prescription image in the OCR Scanner page.</p>
        </div>
      ) : (
        <div className="meds-grid">
          {medicines.map((med) => {
            const isInteracting = interactionWarnings.some(
              w => w.medA.toLowerCase() === med.name.toLowerCase() || w.medB.toLowerCase() === med.name.toLowerCase()
            );

            return (
              <div 
                key={med.id} 
                className={`glass-card med-display-card ${isInteracting ? 'warning-border' : ''}`}
              >
                <div className="med-card-header">
                  <div className="pill-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2Z" />
                      <path d="M17 12H7" />
                    </svg>
                  </div>
                  <div className="med-title-group">
                    <h3>{med.name}</h3>
                    <span className="strength-lbl">{med.dosage}</span>
                  </div>
                  
                  {isInteracting && (
                    <span className="warning-badge-icon" title="Interaction Conflict detected!">
                      <AlertTriangle size={16} />
                    </span>
                  )}
                </div>

                <div className="med-details-body">
                  <div className="detail-meta">
                    <div className="detail-meta-item">
                      <Calendar size={14} />
                      <span>Duration: {med.duration}</span>
                    </div>
                    <div className="detail-meta-item">
                      <RotateCcw size={14} />
                      <span>Refills left: {med.refillsLeft}</span>
                    </div>
                  </div>

                  <div className="schedule-box">
                    <span className="box-lbl"><Clock size={12} /> Schedule timings:</span>
                    <div className="timing-chips">
                      {med.timing.map(t => (
                        <span key={t} className="timing-chip">{t.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>

                  {med.instructions && (
                    <div className="instructions-box">
                      <span className="box-lbl">Directions:</span>
                      <p>"{med.instructions}"</p>
                    </div>
                  )}
                </div>

                <div className="med-card-actions">
                  <button 
                    className="btn btn-secondary action-icon-btn"
                    onClick={() => speakText(`Active drug: ${med.name}. Dosage: ${med.dosage}. Frequency: ${med.timing.join(' and ')}. Intake instructions: ${med.instructions}`)}
                    title="Read instructions aloud"
                  >
                    <Volume2 size={16} /> Read instructions
                  </button>

                  <button 
                    className="btn btn-secondary action-icon-btn"
                    onClick={() => handleOpenInfo(med.name)}
                  >
                    <Info size={16} /> Clinical Info
                  </button>

                  <button 
                    className="btn btn-secondary remove-btn-icon"
                    onClick={() => removeMedicine(med.id)}
                    title="Remove medicine"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out Safety Info Drawer */}
      {selectedMedInfo && (
        <div className="drawer-overlay" onClick={handleCloseInfo}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span className="drawer-category">{selectedMedInfo.category}</span>
                <h2>{selectedMedInfo.name} Safety Profile</h2>
              </div>
              <button className="close-drawer-btn" onClick={handleCloseInfo}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Uses */}
              <div className="drawer-section">
                <h4>Primary Medical Uses</h4>
                <ul>
                  {selectedMedInfo.uses.map((use, idx) => (
                    <li key={idx}>{use}</li>
                  ))}
                </ul>
              </div>

              {/* Side Effects */}
              <div className="drawer-section">
                <h4>Common Side Effects</h4>
                <ul className="side-effects-list">
                  {selectedMedInfo.sideEffects.map((effect, idx) => (
                    <li key={idx} className="side-effect-item">{effect}</li>
                  ))}
                </ul>
              </div>

              {/* Precautions */}
              <div className="drawer-section warning-section">
                <h4>Clinical Precautions</h4>
                <ul>
                  {selectedMedInfo.precautions.map((prec, idx) => (
                    <li key={idx}>{prec}</li>
                  ))}
                </ul>
              </div>

              {/* Interactions list */}
              {selectedMedInfo.interactions.length > 0 && (
                <div className="drawer-section danger-section">
                  <h4>Documented Drug Conflicts</h4>
                  <p className="interact-sub">Do not take with the following drugs:</p>
                  <div className="drawer-interact-pills">
                    {selectedMedInfo.interactions.map((interact, idx) => (
                      <span key={idx} className="interact-badge">{interact}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .meds-list-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Interactions banner */
        .interaction-warning-card {
          border-color: rgba(244, 63, 94, 0.4) !important;
          background: rgba(244, 63, 94, 0.05);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .warning-head {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .warning-siren {
          color: var(--color-danger);
          animation: pulseGlow 1.5s infinite;
        }

        .warning-details-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-top: 1px solid rgba(244, 63, 94, 0.15);
          padding-top: 1rem;
        }

        .warning-detail-item {
          background: rgba(0, 0, 0, 0.2);
          border-left: 3px solid var(--color-danger);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
        }

        .warning-tag {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--color-danger);
        }

        .warning-explanation {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .interactions-safe-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-success);
          font-size: 0.85rem;
          font-weight: 500;
        }

        .safe-icon {
          flex-shrink: 0;
        }

        /* Grid */
        .meds-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .med-display-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          height: 100%;
        }

        .med-display-card.warning-border {
          border-color: rgba(245, 158, 11, 0.4);
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.05);
        }

        .med-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
          position: relative;
        }

        .pill-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--color-primary-glow);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .med-title-group h3 {
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .strength-lbl {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .warning-badge-icon {
          position: absolute;
          top: 0;
          right: 0;
          color: var(--color-warning);
          animation: pulseGlow 2s infinite;
        }

        .med-details-body {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          flex: 1;
        }

        .detail-meta {
          display: flex;
          gap: 1rem;
        }

        .detail-meta-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .box-lbl {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.3rem;
          margin-bottom: 0.3rem;
        }

        .timing-chips {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .timing-chip {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-xs);
          border: 1px solid var(--border-color);
        }

        .instructions-box p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-style: italic;
          background: rgba(0, 0, 0, 0.15);
          padding: 0.5rem;
          border-radius: var(--radius-xs);
          border-left: 2px solid var(--color-primary);
        }

        .med-card-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-top: 1px solid var(--border-color);
          padding-top: 0.75rem;
          margin-top: auto;
        }

        .action-icon-btn {
          flex: 1;
          font-size: 0.75rem;
          padding: 0.5rem;
        }

        .remove-btn-icon {
          color: var(--text-muted);
          padding: 0.5rem;
        }

        .remove-btn-icon:hover {
          color: var(--color-danger);
          background: var(--color-danger-glow);
          border-color: rgba(244, 63, 94, 0.2);
        }

        .empty-meds-card {
          text-align: center;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--text-muted);
          max-width: 600px;
          margin: 2rem auto;
        }

        /* Drawer details styling */
        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .drawer-category {
          font-size: 0.75rem;
          color: var(--color-primary);
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .close-drawer-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .close-drawer-btn:hover {
          color: var(--text-primary);
        }

        .drawer-body {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .drawer-section h4 {
          font-size: 0.95rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .drawer-section ul {
          padding-left: 1.25rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .drawer-section li {
          margin-bottom: 0.4rem;
        }

        .side-effect-item {
          color: #fca5a5;
        }

        .warning-section {
          background: rgba(245, 158, 11, 0.04);
          border: 1px solid rgba(245, 158, 11, 0.15);
          padding: 1rem;
          border-radius: var(--radius-sm);
        }

        .warning-section h4 {
          color: var(--color-warning);
        }

        .danger-section {
          background: rgba(244, 63, 94, 0.04);
          border: 1px solid rgba(244, 63, 94, 0.15);
          padding: 1rem;
          border-radius: var(--radius-sm);
        }

        .danger-section h4 {
          color: var(--color-danger);
        }

        .interact-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .drawer-interact-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .interact-badge {
          background: var(--color-danger-glow);
          color: var(--color-danger);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: var(--radius-full);
          border: 1px solid rgba(244, 63, 94, 0.2);
        }
      `}</style>
    </div>
  );
};
