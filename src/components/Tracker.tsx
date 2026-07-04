import React, { useState } from 'react';
import { useMed } from '../context/MedContext';
import { 
  Flame, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export const Tracker: React.FC = () => {
  const { medicines, adherenceRecords, toggleDose, language, t } = useMed();
  
  // State for the selected day in calendar (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  // Helper to generate last 7 days starting from 4 days ago to 2 days ahead
  const getWeekDays = () => {
    const days = [];
    const start = new Date();
    start.setDate(start.getDate() - 4); // start 4 days ago
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Find doses for the selected day
  const selectedDayDoses: { medId: string; medName: string; dosage: string; timing: string; instructions: string }[] = [];
  
  medicines.forEach(med => {
    // Basic check: is the selected day after the medicine's start date?
    const medStartDate = new Date(med.startDate);
    const selDate = new Date(selectedDateStr);
    
    if (selDate >= medStartDate) {
      med.timing.forEach(t => {
        selectedDayDoses.push({
          medId: med.id,
          medName: med.name,
          dosage: med.dosage,
          timing: t,
          instructions: med.instructions
        });
      });
    }
  });

  const selectedDayRecords = adherenceRecords[selectedDateStr] || {};
  const totalDoses = selectedDayDoses.length;
  const takenDoses = selectedDayDoses.filter(dose => {
    const key = `${dose.medId}_${dose.timing}`;
    return selectedDayRecords[key]?.taken;
  }).length;

  const completionPercentage = totalDoses > 0 
    ? Math.round((takenDoses / totalDoses) * 100) 
    : 0;

  // Calculate Streak (consecutive days with 100% completion in the past)
  const calculateStreak = () => {
    let currentStreak = 0;
    const checkDate = new Date();
    
    // We check backwards from today
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const records = adherenceRecords[dateStr] || {};
      
      // Get medicines active on that check date
      const activeMeds = medicines.filter(m => new Date(dateStr) >= new Date(m.startDate));
      
      if (activeMeds.length === 0) {
        break; // Stop if no active medicines configured
      }

      let totalOnDay = 0;
      let takenOnDay = 0;

      activeMeds.forEach(m => {
        m.timing.forEach(t => {
          totalOnDay++;
          if (records[`${m.id}_${t}`]?.taken) {
            takenOnDay++;
          }
        });
      });

      if (totalOnDay > 0 && takenOnDay === totalOnDay) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break; // Streak broken
      }
    }

    return currentStreak;
  };

  const streakVal = calculateStreak();

  const handleDaySelect = (day: Date) => {
    setSelectedDate(day);
  };

  const changeDateByAmount = (amount: number) => {
    const copy = new Date(selectedDate);
    copy.setDate(selectedDate.getDate() + amount);
    setSelectedDate(copy);
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const check = new Date(date);
    check.setHours(0,0,0,0);
    return check > today;
  };

  return (
    <div className="tracker-view animate-fade-in">
      <header className="view-header">
        <h1>{t('trackerHeader')}</h1>
        <p>{t('trackerSub')}</p>
      </header>

      {/* Stats Summary Panel */}
      <div className="tracker-stats-row">
        
        {/* Streak card */}
        <div className="glass-card streak-card">
          <div className="streak-icon-wrapper">
            <Flame size={32} className={`streak-fire-icon ${streakVal > 0 ? 'active' : ''}`} />
          </div>
          <div className="streak-text-group">
            <span className="streak-title">{t('adherenceStreak')}</span>
            <h2 className="streak-value">{streakVal} {streakVal === 1 ? (language === 'bn' ? 'দিন' : 'Day') : (language === 'bn' ? 'দিন' : 'Days')}</h2>
            <p className="streak-subtitle">{t('streakBannerDesc')}</p>
          </div>
        </div>

        {/* Adherence Rate card */}
        <div className="glass-card stat-progress-card">
          <div className="stat-icon-wrapper">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="stat-lbl">{t('todaysCompliance')}</span>
            <div className="compliance-row">
              <h2 className="stat-value">{completionPercentage}%</h2>
              <span className="fraction-lbl">({takenDoses}/{totalDoses} {language === 'bn' ? 'টি ডোজ' : 'doses'})</span>
            </div>
            <div className="compliance-bar-container">
              <div 
                className="compliance-bar-fill" 
                style={{ width: `${completionPercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Belt Calendar */}
      <div className="glass-card calendar-belt-card">
        <div className="belt-header">
          <button className="btn btn-secondary date-nav-btn" onClick={() => changeDateByAmount(-1)}>
            <ChevronLeft size={16} />
          </button>
          
          <h3 className="belt-current-month">
            {selectedDate.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' })}
          </h3>

          <button className="btn btn-secondary date-nav-btn" onClick={() => changeDateByAmount(1)}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="belt-days-row">
          {weekDays.map((day, idx) => {
            const dayStr = day.toISOString().split('T')[0];
            const isSelected = dayStr === selectedDateStr;
            const isToday = dayStr === todayStr;
            const isFuture = isFutureDate(day);

            // Calculate day completion
            const dayDoses: string[] = [];
            medicines.forEach(m => {
              if (new Date(dayStr) >= new Date(m.startDate)) {
                m.timing.forEach(t => dayDoses.push(`${m.id}_${t}`));
              }
            });

            const dayRecs = adherenceRecords[dayStr] || {};
            const takenCount = dayDoses.filter(k => dayRecs[k]?.taken).length;
            const isFullyCompleted = dayDoses.length > 0 && takenCount === dayDoses.length;

            return (
              <button
                key={idx}
                className={`belt-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}
                onClick={() => handleDaySelect(day)}
                disabled={isFuture}
              >
                <span className="day-name">{day.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' })}</span>
                <span className="day-num">{day.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric' })}</span>
                {isFullyCompleted && <span className="day-completed-dot" />}
                {!isFullyCompleted && dayDoses.length > 0 && takenCount > 0 && (
                  <span className="day-partial-dot" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Checklist */}
      <div className="glass-card selected-checklist-card">
        <div className="checklist-card-head">
          <div className="head-title">
            <Calendar size={18} className="icon-teal" />
            <h3>
              {selectedDateStr === todayStr 
                ? t('todaysScheduleChecklist') 
                : language === 'bn'
                  ? `${selectedDate.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', weekday: 'long' })} এর লগ`
                  : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'long' })} Log`}
            </h3>
          </div>
          <span className="badge badge-info">
            {language === 'bn'
              ? `${takenDoses} / ${totalDoses} সম্পন্ন`
              : `${takenDoses} of ${totalDoses} Taken`}
          </span>
        </div>

        {totalDoses === 0 ? (
          <div className="empty-day-state">
            <p>{t('noMedsScheduledOnDate')}</p>
          </div>
        ) : (
          <div className="tracker-doses-list">
            {selectedDayDoses.map((dose, idx) => {
              const doseKey = `${dose.medId}_${dose.timing}`;
              const isTaken = selectedDayRecords[doseKey]?.taken;
              const isFuture = isFutureDate(selectedDate);

              const timeLabels: Record<string, string> = {
                morning: language === 'bn' ? 'সকাল' : 'MORNING',
                afternoon: language === 'bn' ? 'দুপুর' : 'AFTERNOON',
                evening: language === 'bn' ? 'সন্ধ্যা' : 'EVENING',
                night: language === 'bn' ? 'রাত' : 'NIGHT'
              };

              return (
                <div key={idx} className={`tracker-dose-row ${isTaken ? 'completed' : ''}`}>
                  <button 
                    className="tracker-check-btn"
                    onClick={() => toggleDose(selectedDateStr, dose.medId, dose.timing)}
                    disabled={isFuture}
                    title={isTaken 
                      ? (language === 'bn' ? 'বাদ গেছে হিসেবে চিহ্নিত করুন' : "Mark as missed") 
                      : (language === 'bn' ? 'গৃহীত হিসেবে চিহ্নিত করুন' : "Mark as taken")}
                  >
                    {isTaken ? (
                      <CheckCircle2 size={22} className="check-success" />
                    ) : (
                      <Circle size={22} className="check-pending" />
                    )}
                  </button>

                  <div className="dose-info-wrapper">
                    <span className="med-title">{dose.medName} <span className="med-dosage">{dose.dosage}</span></span>
                    <div className="dose-timings">
                      <span className="timing-label-pill">{timeLabels[dose.timing.toLowerCase()] || dose.timing.toUpperCase()}</span>
                      {dose.instructions && <span className="inst-sub">| {dose.instructions}</span>}
                    </div>
                  </div>

                  {isTaken && selectedDayRecords[doseKey]?.takenAt && (
                    <span className="taken-timestamp">
                      {language === 'bn'
                        ? `গৃহীত হয়েছে: ${selectedDayRecords[doseKey].takenAt}`
                        : `Checked at ${selectedDayRecords[doseKey].takenAt}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .tracker-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .tracker-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .tracker-stats-row {
            grid-template-columns: 1fr;
          }
        }

        .streak-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .streak-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .streak-fire-icon {
          color: var(--text-muted);
          transition: color var(--transition-normal);
        }

        .streak-fire-icon.active {
          color: var(--color-warning);
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
          animation: pulseGlow 2s infinite;
        }

        .streak-text-group {
          display: flex;
          flex-direction: column;
        }

        .streak-title {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .streak-value {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .streak-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }

        .stat-progress-card {
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
        }

        .stat-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          background: var(--color-primary-glow);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .compliance-row {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .fraction-lbl {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .compliance-bar-container {
          width: 200px;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-top: 0.5rem;
        }

        .compliance-bar-fill {
          height: 100%;
          background: var(--gradient-primary);
          border-radius: var(--radius-full);
          transition: width var(--transition-normal);
        }

        /* Calendar belt */
        .calendar-belt-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .belt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .date-nav-btn {
          padding: 0.4rem;
        }

        .belt-current-month {
          font-size: 1.05rem;
          font-weight: 700;
        }

        .belt-days-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.75rem;
        }

        .belt-day-btn {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.85rem 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
        }

        .belt-day-btn:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.03);
        }

        .belt-day-btn.selected {
          background: var(--color-primary-glow);
          border-color: var(--color-primary);
          box-shadow: 0 0 10px rgba(13, 148, 136, 0.2);
        }

        .belt-day-btn.today {
          border-color: var(--color-secondary);
        }

        .belt-day-btn.today::after {
          content: '';
          position: absolute;
          top: 4px;
          right: 4px;
          width: 5px;
          height: 5px;
          background: var(--color-secondary);
          border-radius: 50%;
        }

        .belt-day-btn.future {
          opacity: 0.35;
          cursor: not-allowed;
          background: transparent !important;
          border-color: rgba(255,255,255,0.03) !important;
        }

        .belt-day-btn .day-name {
          font-size: 0.7rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .belt-day-btn.selected .day-name {
          color: var(--color-primary);
        }

        .belt-day-btn .day-num {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .day-completed-dot {
          width: 6px;
          height: 6px;
          background: var(--color-success);
          border-radius: 50%;
          box-shadow: 0 0 6px var(--color-success);
        }

        .day-partial-dot {
          width: 6px;
          height: 6px;
          background: var(--color-warning);
          border-radius: 50%;
        }

        /* Selected Day Checklist */
        .selected-checklist-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .checklist-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
        }

        .head-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .icon-teal {
          color: var(--color-primary);
        }

        .empty-day-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .tracker-doses-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .tracker-dose-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.01);
          transition: all var(--transition-fast);
        }

        .tracker-dose-row:hover {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255,255,255,0.1);
        }

        .tracker-dose-row.completed {
          background: rgba(16, 185, 129, 0.03);
          border-color: rgba(16, 185, 129, 0.15);
        }

        .tracker-check-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: var(--text-muted);
        }

        .tracker-check-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .check-success {
          color: var(--color-success);
        }

        .check-pending {
          color: var(--text-muted);
        }

        .tracker-check-btn:not(:disabled):hover .check-pending {
          color: var(--color-primary);
        }

        .dose-info-wrapper {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .dose-info-wrapper .med-title {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .tracker-dose-row.completed .med-title {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .dose-info-wrapper .med-dosage {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
          padding: 0.05rem 0.3rem;
          border-radius: var(--radius-xs);
          margin-left: 0.3rem;
        }

        .dose-timings {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .timing-label-pill {
          font-weight: 600;
          color: var(--color-primary);
        }

        .inst-sub {
          color: var(--text-muted);
          font-style: italic;
        }

        .taken-timestamp {
          font-size: 0.75rem;
          color: var(--color-success);
          background: var(--color-success-glow);
          padding: 0.15rem 0.4rem;
          border-radius: var(--radius-xs);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
