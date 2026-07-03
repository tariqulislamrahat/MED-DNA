import { useState } from 'react';
import { useMed } from './context/MedContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { MedsList } from './components/MedsList';
import { Tracker } from './components/Tracker';
import { Pharmacy } from './components/Pharmacy';
import { Analytics } from './components/Analytics';
import { Reminders } from './components/Reminders';
import { 
  LayoutDashboard, 
  ScanLine, 
  CalendarDays, 
  Pill, 
  X,
  ShieldAlert
} from 'lucide-react';

function App() {
  const { user, sosTriggered, triggerSOS, addMedicine } = useMed();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Manual Add Medicine State
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('10mg');
  const [newMedTimings, setNewMedTimings] = useState<string[]>(['morning']);
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [newMedDuration, setNewMedDuration] = useState('7 days');
  const [newMedRefills, setNewMedRefills] = useState(0);

  // Auth Guard
  if (!user) {
    return <Login />;
  }

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard 
            setCurrentTab={setCurrentTab} 
            onOpenAddModal={() => setIsAddModalOpen(true)} 
          />
        );
      case 'scanner':
        return <Scanner />;
      case 'tracker':
        return <Tracker />;
      case 'meds':
        return <MedsList />;
      case 'pharmacy':
        return <Pharmacy />;
      case 'analytics':
        return <Analytics />;
      case 'reminders':
        return <Reminders />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} onOpenAddModal={() => setIsAddModalOpen(true)} />;
    }
  };

  const handleToggleTiming = (time: string) => {
    setNewMedTimings(prev => {
      const idx = prev.indexOf(time);
      if (idx > -1) {
        if (prev.length > 1) {
          return prev.filter(t => t !== time);
        }
        return prev;
      }
      return [...prev, time];
    });
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    addMedicine({
      name: newMedName,
      dosage: newMedDosage,
      timing: newMedTimings,
      instructions: newMedInstructions,
      duration: newMedDuration,
      refillsLeft: newMedRefills
    });

    // Reset fields
    setNewMedName('');
    setNewMedDosage('10mg');
    setNewMedTimings(['morning']);
    setNewMedInstructions('');
    setNewMedDuration('7 days');
    setNewMedRefills(0);
    setIsAddModalOpen(false);
  };

  const mobileTabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'scanner', label: 'Scan', icon: ScanLine },
    { id: 'tracker', label: 'Tracker', icon: CalendarDays },
    { id: 'meds', label: 'Meds', icon: Pill }
  ];

  return (
    <div className={`app-container ${sosTriggered ? 'sos-siren-active' : ''}`}>
      {/* Navigation Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />

      {/* Main Canvas Area */}
      <main className="main-content" style={{
        marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
      }}>
        {renderActiveTab()}
      </main>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <nav className="mobile-bottom-nav">
        {mobileTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button 
              key={tab.id}
              className={`mobile-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentTab(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Manual Add Medicine Modal Overlay */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content glass-card manual-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Medicine Manually</h3>
              <button className="close-modal-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="manual-add-form">
              <div className="input-group">
                <label>Medicine Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newMedName} 
                  onChange={(e) => setNewMedName(e.target.value)} 
                  placeholder="e.g. Metformin"
                  required 
                />
              </div>

              <div className="manual-form-row">
                <div className="input-group">
                  <label>Dosage</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={newMedDosage} 
                    onChange={(e) => setNewMedDosage(e.target.value)} 
                    placeholder="e.g. 500mg"
                    required 
                  />
                </div>

                <div className="input-group">
                  <label>Duration</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={newMedDuration} 
                    onChange={(e) => setNewMedDuration(e.target.value)} 
                    placeholder="e.g. 15 days"
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Refills Allowed</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newMedRefills} 
                  onChange={(e) => setNewMedRefills(parseInt(e.target.value) || 0)} 
                  min="0"
                />
              </div>

              <div className="timing-selector-group">
                <span className="timing-lbl">Dosage Timings:</span>
                <div className="timing-pills-row">
                  {['morning', 'afternoon', 'evening', 'night'].map(time => {
                    const isSelected = newMedTimings.includes(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        className={`timing-pill ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleTiming(time)}
                      >
                        {time.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="input-group">
                <label>Directions (optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newMedInstructions} 
                  onChange={(e) => setNewMedInstructions(e.target.value)} 
                  placeholder="e.g. After meals with water"
                />
              </div>

              <button type="submit" className="btn btn-primary submit-med-btn">
                Add to Checklist
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Mobile SOS Hover Button (Floating) */}
      <button className="mobile-sos-floating-btn" onClick={triggerSOS} title="Emergency SOS">
        <ShieldAlert size={24} />
      </button>

      <style>{`
        /* Mobile navigation styling */
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(11, 15, 25, 0.95);
          border-top: 1px solid var(--border-color);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 99;
          padding: 0 1rem;
        }

        .mobile-tab-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 0.75rem;
          font-weight: 500;
          transition: color var(--transition-fast);
        }

        .mobile-tab-btn:hover, .mobile-tab-btn.active {
          color: var(--color-primary);
        }

        .mobile-sos-floating-btn {
          position: fixed;
          bottom: 80px;
          right: 16px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--gradient-danger);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(244, 63, 94, 0.4);
          cursor: pointer;
          z-index: 98;
          display: none; /* Desktop hidden */
        }

        .mobile-sos-floating-btn:hover {
          transform: scale(1.05);
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
          }
          .mobile-sos-floating-btn {
            display: flex;
          }
        }

        @media (min-width: 769px) {
          .mobile-bottom-nav {
            display: none !important;
          }
          .mobile-sos-floating-btn {
            display: none !important;
          }
        }

        /* Modal additions styling */
        .manual-add-modal {
          max-width: 500px;
          width: 100%;
          background: #0d1321;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          text-align: left;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
        }

        .close-modal-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .close-modal-btn:hover {
          color: var(--text-primary);
        }

        .manual-add-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .manual-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .submit-med-btn {
          margin-top: 0.5rem;
          padding: 0.9rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

export default App;

