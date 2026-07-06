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
  const { user, logout, triggerSOS, medicines, language, setLanguage, t } = useMed();

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'scanner', label: t('scanner'), icon: ScanLine },
    { id: 'tracker', label: t('tracker'), icon: CalendarDays },
    { id: 'meds', label: t('meds'), icon: Pill, badge: medicines.length > 0 ? medicines.length : undefined },
    { id: 'pharmacy', label: t('pharmacy'), icon: MapPin },
    { id: 'analytics', label: t('analytics'), icon: BarChart3 },
    { id: 'reminders', label: t('reminders'), icon: BellRing },
    { id: 'aiguide', label: t('aiguide'), icon: MessageSquare }
  ];

  if (!user) return null;

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          {collapsed ? (
            /* Collapsed icon: just the red pill capsule */
            <div className="sidebar-logo-capsule-only">
              <span className="sidebar-capsule">
                <span className="sidebar-char sidebar-char--white sidebar-char--flipped">D</span>
                <span className="sidebar-char sidebar-char--white">D</span>
              </span>
            </div>
          ) : (
            /* Full Logo: ME [DD] NA */
            <div className="sidebar-logo-full">
              <span className="sidebar-char">M</span>
              <span className="sidebar-char">E</span>
              <span className="sidebar-capsule">
                <span className="sidebar-char sidebar-char--white sidebar-char--flipped">D</span>
                <span className="sidebar-char sidebar-char--white">D</span>
              </span>
              <span className="sidebar-char">N</span>
              <span className="sidebar-char">A</span>
            </div>
          )}
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
          {/* Language Toggle */}
          <button 
            className="sidebar-lang-btn" 
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            title={language === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'}
          >
            <span>🌐</span>
            {!collapsed && <span style={{ marginLeft: '0.4rem' }}>{language === 'en' ? 'বাংলা (BN)' : 'English (EN)'}</span>}
          </button>

          {!collapsed && (
            <button className="sidebar-sos-btn" onClick={triggerSOS}>
              <ShieldAlert size={16} />
              <span>{t('emergencySos')}</span>
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
            <button className="logout-btn" onClick={logout} title={t('signOut')}>
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
          justify-content: center;
          padding: 0.75rem 0.5rem 2rem 0.5rem;
          min-height: 60px;
          width: 100%;
        }

        .sidebar-logo-full {
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display), var(--font-sans), sans-serif;
          font-size: 2.3rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          user-select: none;
          width: 100%;
        }

        .sidebar-logo-capsule-only {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          font-size: 2.2rem;
        }

        .sidebar-char {
          display: inline-block;
          color: var(--text-primary);
        }

        .sidebar-capsule {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          border-radius: 999px;
          padding: 0 0.24em;
          margin: 0 0.05em;
          height: 1.15em;
          box-shadow: 0 2px 8px var(--color-primary-glow);
        }

        .sidebar-capsule .sidebar-char {
          font-size: 0.82em;
          line-height: 1;
        }

        .sidebar-char--white {
          color: #ffffff !important;
        }

        .sidebar-char--flipped {
          transform: scaleX(-1);
          margin-right: -0.02em;
        }

        .sidebar-capsule .sidebar-char:not(.sidebar-char--flipped) {
          margin-left: -0.02em;
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

        .sidebar-lang-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          padding: 0.6rem;
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 0.78rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sidebar-lang-btn:hover {
          border-color: var(--border-color-hover);
          background: #f1f5f9;
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
