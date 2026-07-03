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
  ShieldAlert
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
    { id: 'reminders', label: 'Reminders & SOS', icon: BellRing }
  ];

  if (!user) return null;

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo Section */}
        <div className="sidebar-logo">
          <div className="logo-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 10.5C4.5 7.46243 6.96243 5 10 5C13.0376 5 15.5 7.46243 15.5 10.5C15.5 12.0188 14.8826 13.3938 13.8826 14.3938M4.5 10.5C4.5 13.5376 6.96243 16 10 16C11.5188 16 12.8938 15.3826 13.8826 14.3938M4.5 10.5H15.5M13.8826 14.3938L19.5 20M13.8826 14.3938C13.8826 14.3938 15.5 14.5 17 13C18.5 11.5 18.5 9.5 18.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="10" cy="5" r="1.5" fill="currentColor"/>
              <circle cx="4.5" cy="10.5" r="1.5" fill="currentColor"/>
              <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
              <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          {!collapsed && <span className="logo-text">Med<span className="text-gradient">DNA</span></span>}
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <button className="collapse-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle Sidebar">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Nav Links */}
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
                <Icon size={20} className="nav-icon" />
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="nav-badge">{item.badge}</span>
                )}
                {collapsed && item.badge && (
                  <span className="nav-badge-dot" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section: Profile & Emergency */}
        <div className="sidebar-footer">
          {/* Actionable SOS Button in Sidebar (if not collapsed) */}
          {!collapsed && (
            <button className="sidebar-sos-btn" onClick={triggerSOS}>
              <ShieldAlert size={18} />
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
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Styles local to sidebar */}
      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: rgba(11, 15, 25, 0.85);
          border-right: 1px solid var(--border-color);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1rem;
          z-index: 100;
          transition: width var(--transition-normal);
        }

        .sidebar.collapsed {
          width: var(--sidebar-collapsed-width);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem 2rem 0.75rem;
          color: var(--text-primary);
        }

        .logo-icon-wrapper {
          background: var(--gradient-primary);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px var(--color-primary-glow);
          flex-shrink: 0;
        }

        .logo-text {
          font-family: var(--font-sans);
          font-weight: 800;
          font-size: 1.4rem;
          letter-spacing: -0.03em;
        }

        .text-gradient {
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .collapse-toggle {
          position: absolute;
          top: 24px;
          right: -12px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #111827;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 110;
          transition: color var(--transition-fast);
        }

        .collapse-toggle:hover {
          color: var(--color-primary);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          width: 100%;
          text-align: left;
          font-family: var(--font-sans);
          font-weight: 500;
          font-size: 0.95rem;
          transition: all var(--transition-fast);
          position: relative;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--color-primary-glow);
          color: var(--color-primary);
          box-shadow: inset 3px 0 0 var(--color-primary);
        }

        .nav-icon {
          flex-shrink: 0;
        }

        .nav-badge {
          margin-left: auto;
          background: var(--color-secondary);
          color: white;
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        .nav-badge-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background-color: var(--color-secondary);
          border-radius: 50%;
          border: 2px solid #090d16;
        }

        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
        }

        .sidebar-sos-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: var(--gradient-danger);
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.25);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .sidebar-sos-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(244, 63, 94, 0.4);
        }

        .profile-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .profile-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--color-primary);
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex: 1;
        }

        .profile-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-email {
          font-size: 0.7rem;
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
        }

        .logout-btn:hover {
          color: var(--color-danger);
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none; /* hidden on mobile, replaced by bottom bar */
          }
        }
      `}</style>
    </>
  );
};
