import React from 'react';
import { useMed } from '../context/MedContext';
import { 
  LayoutDashboard, 
  ScanLine, 
  CalendarDays, 
  Pill, 
  MapPin, 
  BellRing, 
  BarChart3, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  collapsed, 
  setCollapsed 
}) => {
  const { user, logout, triggerSOS, medicines } = useMed();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'OCR Scanner', icon: ScanLine },
    { id: 'tracker', label: 'Dose Tracker', icon: CalendarDays },
    { id: 'meds', label: 'Medicine List', icon: Pill, badge: medicines.length > 0 ? medicines.length : undefined },
    { id: 'pharmacy', label: 'Find Pharmacy', icon: MapPin },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reminders', label: 'Reminders & SOS', icon: BellRing },
    { id: 'aiguide', label: 'AI Health Guide', icon: MessageSquare }
  ];

  if (!user) return null;

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <span className="logo-letter">M</span>
          </div>
          {!collapsed && <span className="logo-text">Med<span className="logo-accent">DNA</span></span>}
        </div>

        {/* Collapse Toggle */}
        <button className="collapse-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle Sidebar">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Nav */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentTab(item.id)}
              >
                <Icon size={19} className="nav-icon" />
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <button className="sidebar-sos-btn" onClick={triggerSOS}>
              <ShieldAlert size={16} />
              <span>EMERGENCY SOS</span>
            </button>
          )}
          
          <div className="profile-badge">
            <img src={user.avatar} alt={user.name} className="profile-avatar" />
            {!collapsed && (
              <div className="profile-info">
                <span className="profile-name">{user.name}</span>
                <span className="profile-email">{user.email}</span>
              </div>
            )}
            <button className="logout-btn" onClick={logout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: white;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 1.25rem 0.75rem;
          z-index: 100;
          transition: width var(--transition-normal);
        }

        .sidebar.collapsed {
          width: var(--sidebar-collapsed-width);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.25rem 0.75rem 1.5rem 0.75rem;
        }

        .logo-mark {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-sm);
          background: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .logo-letter {
          color: white;
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.1rem;
        }

        .logo-text {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.3rem;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }

        .logo-accent {
          color: var(--color-primary);
        }

        .collapse-toggle {
          position: absolute;
          top: 22px;
          right: -11px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 110;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .collapse-toggle:hover {
          color: var(--color-primary);
          border-color: var(--color-primary);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.85rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          width: 100%;
          text-align: left;
          font-family: var(--font-sans);
          font-weight: 500;
          font-size: 0.88rem;
          transition: all var(--transition-fast);
          position: relative;
        }

        .nav-item:hover {
          background: var(--bg-input);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--color-primary-glow);
          color: var(--color-primary);
          font-weight: 600;
        }

        .nav-icon {
          flex-shrink: 0;
        }

        .nav-badge {
          margin-left: auto;
          background: var(--color-primary);
          color: white;
          font-size: 0.68rem;
          padding: 0.1rem 0.4rem;
          border-radius: var(--radius-full);
          font-weight: 700;
          min-width: 20px;
          text-align: center;
        }

        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .sidebar-sos-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: var(--color-danger);
          color: white;
          border: none;
          padding: 0.6rem;
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          letter-spacing: 0.04em;
          box-shadow: 0 2px 8px rgba(211, 47, 47, 0.2);
          transition: all var(--transition-fast);
        }

        .sidebar-sos-btn:hover {
          background: #b71c1c;
          transform: translateY(-1px);
        }

        .profile-badge {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex: 1;
        }

        .profile-name {
          font-weight: 600;
          font-size: 0.8rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-email {
          font-size: 0.65rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .logout-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--transition-fast);
          padding: 0.25rem;
          flex-shrink: 0;
        }

        .logout-btn:hover {
          color: var(--color-danger);
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </>
  );
};
