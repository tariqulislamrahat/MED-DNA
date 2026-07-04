import React, { useState } from 'react';
import { useMed } from '../context/MedContext';
import { type MedicineInfo } from '../services/mockData';
import { mockApi } from '../services/mockApi';
import { 
  Volume2, 
  VolumeX,
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
  const { medicines, removeMedicine, speakText, stopSpeech, activeSpeechId, interactionWarnings, requestRefill, language, t } = useMed();
  const [selectedMedInfo, setSelectedMedInfo] = useState<MedicineInfo | null>(null);
  const [loadingSafetyInfo, setLoadingSafetyInfo] = useState(false);
  const [refillRequests, setRefillRequests] = useState<Record<string, 'idle' | 'pending' | 'success'>>({});

  const handleRequestRefill = async (medId: string) => {
    setRefillRequests(prev => ({ ...prev, [medId]: 'pending' }));
    try {
      await requestRefill(medId);
      setRefillRequests(prev => ({ ...prev, [medId]: 'success' }));
    } catch (e) {
      setRefillRequests(prev => ({ ...prev, [medId]: 'idle' }));
    }
  };

  const handleOpenInfo = async (medName: string) => {
    setLoadingSafetyInfo(true);
    try {
      const info = await mockApi.getMedicineInfo(medName);
      if (info) {
        setSelectedMedInfo(info);
      } else {
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
    } catch (err) {
      console.warn('Failed to load safety profile:', err);
    } finally {
      setLoadingSafetyInfo(false);
    }
  };

  const handleCloseInfo = () => {
    setSelectedMedInfo(null);
  };

  return (
    <div className="meds-list-view animate-fade-in">
      <header className="view-header">
        <h1>{t('myActiveMeds')}</h1>
        <p>{t('myActiveMedsSub')}</p>
      </header>

      {/* Interaction Warning Panel */}
      {interactionWarnings.length > 0 ? (
        <div className="glass-card interaction-warning-card">
          <div className="warning-head">
            <AlertTriangle size={24} className="warning-siren" />
            <div>
              <h3>{t('drugInteractionAlert')} ({interactionWarnings.length})</h3>
              <p>{t('drugInteractionWarningSub')}</p>
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
            <span>{t('aiSafetyShieldActive')}</span>
          </div>
        )
      )}

      {/* Medicines Cards Grid */}
      {medicines.length === 0 ? (
        <div className="glass-card empty-meds-card">
          <FileText size={48} />
          <h3>{t('noActiveMeds')}</h3>
          <p>{t('noActiveMedsSub')}</p>
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
                      <span>{t('durationLabel')}: {med.duration}</span>
                    </div>
                    <div className={`detail-meta-item ${med.refillsLeft <= 1 ? 'refill-alert' : ''}`} style={med.refillsLeft <= 1 ? { color: 'var(--color-danger)', fontWeight: 'bold' } : {}}>
                      <RotateCcw size={14} />
                      <span>{t('refillsLeft')}: {med.refillsLeft}</span>
                      {med.refillsLeft <= 1 && (
                        <button
                          className="btn btn-warning btn-xs refill-action-btn"
                          onClick={() => handleRequestRefill(med.id)}
                          disabled={refillRequests[med.id] === 'pending'}
                          style={{
                            marginLeft: '0.5rem',
                            padding: '0.15rem 0.4rem',
                            fontSize: '0.68rem',
                            fontWeight: 'bold',
                            background: refillRequests[med.id] === 'success' ? 'var(--color-success)' : 'var(--color-warning)',
                            color: refillRequests[med.id] === 'success' ? 'white' : 'black',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: refillRequests[med.id] === 'pending' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {refillRequests[med.id] === 'pending' && (language === 'bn' ? 'অনুরোধ করা হচ্ছে...' : 'Requesting...')}
                          {refillRequests[med.id] === 'success' && (language === 'bn' ? 'অনুমোদিত +৩' : 'Approved +3')}
                          {(!refillRequests[med.id] || refillRequests[med.id] === 'idle') && t('requestRefill')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="schedule-box">
                    <span className="box-lbl"><Clock size={12} /> {t('scheduleTimings')}:</span>
                    <div className="timing-chips">
                      {med.timing.map(time => {
                        const timeLabels: Record<string, string> = {
                          morning: language === 'bn' ? 'সকাল' : 'MORNING',
                          afternoon: language === 'bn' ? 'দুপুর' : 'AFTERNOON',
                          evening: language === 'bn' ? 'সন্ধ্যা' : 'EVENING',
                          night: language === 'bn' ? 'রাত' : 'NIGHT'
                        };
                        return (
                          <span key={time} className="timing-chip">{timeLabels[time] || time.toUpperCase()}</span>
                        );
                      })}
                    </div>
                  </div>

                  {med.instructions && (
                    <div className="instructions-box">
                      <span className="box-lbl">{t('directionsLabel')}:</span>
                      <p>"{med.instructions}"</p>
                    </div>
                  )}
                </div>

                <div className="med-card-actions">
                  <button 
                    className="btn btn-secondary action-icon-btn"
                    onClick={() => {
                      const speechText = language === 'bn' 
                        ? `ওষুধের নাম: ${med.name}। মাত্রা: ${med.dosage}। সময়সূচী: ${med.timing.map(time => {
                            if (time === 'morning') return 'সকাল';
                            if (time === 'afternoon') return 'দুপুর';
                            if (time === 'evening') return 'সন্ধ্যা';
                            return 'রাত';
                          }).join(' এবং ')}। নির্দেশাবলী: ${med.instructions || 'নেই'}`
                        : `Active drug: ${med.name}. Dosage: ${med.dosage}. Frequency: ${med.timing.join(' and ')}. Intake instructions: ${med.instructions || 'None'}`;
                      speakText(speechText);
                    }}
                    title={language === 'bn' ? 'নির্দেশাবলী শুনুন' : "Read instructions aloud"}
                  >
                    <Volume2 size={16} /> {t('readInstructions')}
                  </button>

                  <button 
                    className="btn btn-secondary action-icon-btn"
                    onClick={() => handleOpenInfo(med.name)}
                  >
                    <Info size={16} /> {t('clinicalInfo')}
                  </button>

                  <button 
                    className="btn btn-secondary remove-btn-icon"
                    onClick={() => removeMedicine(med.id)}
                    title={t('removeMedicine')}
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
      {(selectedMedInfo || loadingSafetyInfo) && (
        <div className="drawer-overlay" onClick={handleCloseInfo}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            {loadingSafetyInfo ? (
              <div className="drawer-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-secondary)' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{language === 'bn' ? 'লামা সেফটি প্রোফাইল অনুসন্ধান করা হচ্ছে...' : 'Querying Llama Safety Profiles...'}</p>
              </div>
            ) : selectedMedInfo && (
              <>
                <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <span className="drawer-category">{selectedMedInfo.category}</span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedMedInfo.name} {language === 'bn' ? 'সেফটি প্রোফাইল' : 'Safety Profile'}</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {activeSpeechId === selectedMedInfo.name ? (
                      <div className="speech-active-container" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(6,182,212,0.08)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                        <div className="audio-wave">
                          <span className="bar"></span>
                          <span className="bar"></span>
                          <span className="bar"></span>
                          <span className="bar"></span>
                        </div>
                        <button 
                          className="btn btn-secondary btn-xs speech-btn" 
                          onClick={stopSpeech}
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem', height: '22px' }}
                        >
                          <VolumeX size={12} /> {t('stop')}
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary btn-xs speech-btn" 
                        onClick={() => {
                          const safetySpeech = language === 'bn'
                            ? `${selectedMedInfo.name} এর সেফটি প্রোফাইল। বিভাগ: ${selectedMedInfo.category}। প্রাথমিক ব্যবহার: ${selectedMedInfo.uses.join('. ')}। পার্শ্বপ্রতিক্রিয়া: ${selectedMedInfo.sideEffects.join('. ')}। সতর্কতা: ${selectedMedInfo.precautions.join('. ')}।`
                            : `Safety Profile for ${selectedMedInfo.name}. Category: ${selectedMedInfo.category}. Primary uses: ${selectedMedInfo.uses.join('. ')}. Side effects: ${selectedMedInfo.sideEffects.join('. ')}. Precautions: ${selectedMedInfo.precautions.join('. ')}.`;
                          speakText(safetySpeech, selectedMedInfo.name);
                        }}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem', height: '24px' }}
                      >
                        <Volume2 size={12} /> {t('listenSafely')}
                      </button>
                    )}
                    <button className="close-drawer-btn" onClick={handleCloseInfo}>
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="drawer-body">
                  {/* Uses */}
                  <div className="drawer-section">
                    <h4>{t('primaryUses')}</h4>
                    <ul>
                      {selectedMedInfo.uses.map((use, idx) => (
                        <li key={idx}>{use}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Side Effects */}
                  <div className="drawer-section">
                    <h4>{t('sideEffects')}</h4>
                    <ul className="side-effects-list">
                      {selectedMedInfo.sideEffects.map((effect, idx) => (
                        <li key={idx} className="side-effect-item">{effect}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Precautions */}
                  <div className="drawer-section warning-section">
                    <h4>{t('clinicalPrecautions')}</h4>
                    <ul>
                      {selectedMedInfo.precautions.map((prec, idx) => (
                        <li key={idx}>{prec}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Interactions list */}
                  {selectedMedInfo.interactions.length > 0 && (
                    <div className="drawer-section danger-section">
                      <h4>{t('drugConflicts')}</h4>
                      <p className="interact-sub">{t('drugConflictsSub')}</p>
                      <div className="drawer-interact-pills">
                        {selectedMedInfo.interactions.map((interact, idx) => (
                          <span key={idx} className="interact-badge">{interact}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
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

        /* Audio wave animation */
        .audio-wave {
          display: flex;
          align-items: flex-end;
          gap: 2.5px;
          height: 14px;
          padding: 0 2px;
        }

        .audio-wave .bar {
          width: 3px;
          background-color: var(--color-primary);
          animation: wave-bounce 1s ease-in-out infinite alternate;
          border-radius: 1px;
          display: inline-block;
        }

        .audio-wave .bar:nth-child(1) { height: 4px; animation-delay: 0.1s; }
        .audio-wave .bar:nth-child(2) { height: 12px; animation-delay: 0.3s; }
        .audio-wave .bar:nth-child(3) { height: 6px; animation-delay: 0.6s; }
        .audio-wave .bar:nth-child(4) { height: 14px; animation-delay: 0.2s; }

        @keyframes wave-bounce {
          0% {
            height: 4px;
          }
          100% {
            height: 14px;
          }
        }
      `}</style>
    </div>
  );
};
