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
import { AiGuide } from './components/AiGuide';
import { 
  LayoutDashboard, 
  ScanLine, 
  BarChart3, 
  User,
  X,
  Plus
} from 'lucide-react';

function App() {
  const { user, sosTriggered, addMedicine } = useMed();
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
      case 'aiguide':
        return <AiGuide />;
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
    { id: 'analytics', label: 'Stats', icon: BarChart3 },
    { id: 'reminders', label: 'Profile', icon: User }
  ];

  return (
    <div className={`app-container ${sosTriggered ? 'sos-siren-active' : ''}`}>
      {/* Navigation Sidebar (Desktop) */}
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

      {/* Mobile Bottom Navigation Bar (Reference-styled rounded pill nav) */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-nav-inner">
          {mobileTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button 
                key={tab.id}
                className={`mobile-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentTab(tab.id)}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                {isActive && <span>{tab.label}</span>}
              </button>
            );
          })}

          {/* FAB Add button like the reference */}
          <button 
            className="mobile-fab-btn"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>
      </nav>

      {/* Manual Add Medicine Modal Overlay */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content glass-card manual-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Medicine</h3>
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

      <style>{`
        /* === Mobile Bottom Navigation === */
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 99;
          padding: 0 0.75rem 0.5rem;
          pointer-events: none;
        }

        .mobile-nav-inner {
          background: #1a1a2e;
          border-radius: var(--radius-xl);
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 0.5rem;
          pointer-events: auto;
          box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.15);
        }

        .mobile-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }

        .mobile-tab-btn.active {
          background: rgba(255, 255, 255, 0.12);
          color: white;
        }

        .mobile-fab-btn {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: var(--color-primary);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(229, 57, 53, 0.35);
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .mobile-fab-btn:hover {
          transform: scale(1.05);
        }

        .mobile-fab-btn:active {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: block;
          }
        }

        @media (min-width: 769px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }

        /* === Modal styles === */
        .manual-add-modal {
          max-width: 480px;
          width: 100%;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          text-align: left;
          border-radius: var(--radius-lg);
          padding: 1.5rem;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .close-modal-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          transition: all var(--transition-fast);
        }

        .close-modal-btn:hover {
          color: var(--text-primary);
          background: var(--bg-input);
        }

        .manual-add-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .manual-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        @media (max-width: 480px) {
          .manual-form-row {
            grid-template-columns: 1fr;
          }
        }

        .submit-med-btn {
          margin-top: 0.25rem;
          padding: 0.85rem;
          font-weight: 700;
          width: 100%;
        }
      `}</style>
    </div>
  );
}

export default App;
