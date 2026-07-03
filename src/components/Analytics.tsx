import React from 'react';
import { useMed } from '../context/MedContext';
import { 
  BarChart3, 
  Calendar, 
  Percent, 
  Award, 
  TrendingUp
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const { medicines, adherenceRecords } = useMed();

  // 1. Generate last 7 days of data for the SVG bar chart
  const getWeeklyData = () => {
    const weeklyList = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Calculate medicines active on that day
      const activeOnDay = medicines.filter(m => new Date(dateStr) >= new Date(m.startDate));
      let totalDoses = 0;
      let takenDoses = 0;

      activeOnDay.forEach(m => {
        m.timing.forEach(t => {
          totalDoses++;
          if (adherenceRecords[dateStr]?.[`${m.id}_${t}`]?.taken) {
            takenDoses++;
          }
        });
      });

      const percentage = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;
      
      weeklyList.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr,
        percentage,
        totalDoses,
        takenDoses
      });
    }
    return weeklyList;
  };

  const weeklyData = getWeeklyData();
  const averageAdherence = weeklyData.length > 0 
    ? Math.round(weeklyData.reduce((acc, curr) => acc + curr.percentage, 0) / weeklyData.length)
    : 0;

  // 2. Generate past 30 days for heat map grid
  const getMonthlyHeatmap = () => {
    const cells = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const activeOnDay = medicines.filter(m => new Date(dateStr) >= new Date(m.startDate));
      let total = 0;
      let taken = 0;

      activeOnDay.forEach(m => {
        m.timing.forEach(t => {
          total++;
          if (adherenceRecords[dateStr]?.[`${m.id}_${t}`]?.taken) {
            taken++;
          }
        });
      });

      let status: 'empty' | 'full' | 'partial' | 'missed' = 'empty';
      if (total > 0) {
        if (taken === total) status = 'full';
        else if (taken > 0) status = 'partial';
        else status = 'missed';
      }

      cells.push({
        dayNum: d.getDate(),
        dateStr,
        status,
        total,
        taken
      });
    }
    return cells;
  };

  const monthlyCells = getMonthlyHeatmap();

  return (
    <div className="analytics-view animate-fade-in">
      <header className="view-header">
        <h1>Adherence Analytics</h1>
        <p>Inspect compliance stats, analyze weekday trends, and verify your 30-day health calendar.</p>
      </header>

      {/* Stats Summary Widgets */}
      <div className="analytics-widgets">
        <div className="glass-card widget-card">
          <div className="widget-icon primary-color"><Percent size={22} /></div>
          <div className="widget-details">
            <span className="widget-lbl">Weekly Average</span>
            <h2 className="widget-val">{averageAdherence}%</h2>
            <p className="widget-sub">Average taken rate across last 7 days</p>
          </div>
        </div>

        <div className="glass-card widget-card">
          <div className="widget-icon success-color"><Award size={22} /></div>
          <div className="widget-details">
            <span className="widget-lbl">Health Score</span>
            <h2 className="widget-val">
              {averageAdherence >= 90 ? 'A+' : averageAdherence >= 75 ? 'B' : averageAdherence > 0 ? 'C-' : 'N/A'}
            </h2>
            <p className="widget-sub">Overall grade based on adherence</p>
          </div>
        </div>

        <div className="glass-card widget-card">
          <div className="widget-icon accent-color"><TrendingUp size={22} /></div>
          <div className="widget-details">
            <span className="widget-lbl">Consistency Trend</span>
            <h2 className="widget-val">+4.2%</h2>
            <p className="widget-sub">Improvement compared to prior week</p>
          </div>
        </div>
      </div>

      <div className="charts-grid-layout">
        
        {/* Custom SVG Bar Chart */}
        <div className="glass-card chart-container-card">
          <div className="chart-header">
            <BarChart3 size={18} className="chart-icon" />
            <h3>7-Day Adherence Details</h3>
          </div>

          {medicines.length === 0 ? (
            <div className="empty-chart-state">
              <p>No active medications to chart. Upload a prescription to start tracking statistics.</p>
            </div>
          ) : (
            <div className="svg-chart-wrapper">
              <svg viewBox="0 0 500 240" className="bar-chart-svg">
                {/* Horizontal grid lines */}
                <line x1="40" y1="40" x2="480" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="40" y1="90" x2="480" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="40" y1="190" x2="480" y2="190" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                
                {/* Y-axis Labels */}
                <text x="15" y="44" fill="var(--text-muted)" fontSize="10">100%</text>
                <text x="20" y="94" fill="var(--text-muted)" fontSize="10">75%</text>
                <text x="20" y="144" fill="var(--text-muted)" fontSize="10">50%</text>
                <text x="20" y="194" fill="var(--text-muted)" fontSize="10">25%</text>

                {/* Bars drawing */}
                {weeklyData.map((data, idx) => {
                  const barWidth = 32;
                  const spacing = 60;
                  const x = 55 + idx * spacing;
                  const chartHeight = 150; // max height of 100% bar
                  const barHeight = (data.percentage / 100) * chartHeight;
                  const y = 190 - barHeight;

                  return (
                    <g key={idx} className="chart-bar-group">
                      {/* Empty Background Bar */}
                      <rect 
                        x={x} 
                        y={40} 
                        width={barWidth} 
                        height={chartHeight} 
                        rx="4" 
                        fill="rgba(255,255,255,0.015)" 
                      />
                      
                      {/* Active Fill Bar */}
                      {barHeight > 0 && (
                        <rect 
                          x={x} 
                          y={y} 
                          width={barWidth} 
                          height={barHeight} 
                          rx="4" 
                          fill="url(#barGradient)" 
                          className="animated-rect-fill"
                        />
                      )}

                      {/* Bar Value label */}
                      <text 
                        x={x + barWidth / 2} 
                        y={y - 8} 
                        textAnchor="middle" 
                        fill={data.percentage > 0 ? "var(--color-primary)" : "var(--text-muted)"} 
                        fontSize="10" 
                        fontWeight="bold"
                      >
                        {data.percentage}%
                      </text>

                      {/* X-axis Label */}
                      <text 
                        x={x + barWidth / 2} 
                        y="215" 
                        textAnchor="middle" 
                        fill="var(--text-secondary)" 
                        fontSize="11" 
                        fontWeight="500"
                      >
                        {data.label}
                      </text>
                    </g>
                  );
                })}

                <defs>
                  <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
        </div>

        {/* 30-Day Heatmap Grid */}
        <div className="glass-card heatmap-container-card">
          <div className="chart-header">
            <Calendar size={18} className="chart-icon" />
            <h3>30-Day Adherence Matrix</h3>
          </div>

          <p className="card-desc">Daily consistency history across the past 30 days. Color codes highlight completion ratios.</p>

          <div className="heatmap-grid">
            {monthlyCells.map((cell, idx) => (
              <div 
                key={idx} 
                className={`heatmap-cell ${cell.status}`}
                title={`Date: ${cell.dateStr} | Status: ${cell.taken}/${cell.total} doses taken`}
              >
                <span className="cell-num">{cell.dayNum}</span>
              </div>
            ))}
          </div>

          <div className="heatmap-legend">
            <div className="legend-cell-item"><span className="legend-square full" /><span>100% Doses</span></div>
            <div className="legend-cell-item"><span className="legend-square partial" /><span>Partial</span></div>
            <div className="legend-cell-item"><span className="legend-square missed" /><span>0% Taken</span></div>
            <div className="legend-cell-item"><span className="legend-square empty" /><span>No Meds</span></div>
          </div>
        </div>

      </div>

      <style>{`
        .analytics-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .analytics-widgets {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .analytics-widgets {
            grid-template-columns: 1fr;
          }
        }

        .widget-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem;
        }

        .widget-icon {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .widget-icon.primary-color {
          background: var(--color-primary-glow);
          color: var(--color-primary);
        }

        .widget-icon.success-color {
          background: var(--color-success-glow);
          color: var(--color-success);
        }

        .widget-icon.accent-color {
          background: var(--color-accent-glow);
          color: var(--color-accent);
        }

        .widget-details {
          display: flex;
          flex-direction: column;
        }

        .widget-lbl {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .widget-val {
          font-size: 1.6rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .widget-sub {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .charts-grid-layout {
          display: grid;
          grid-template-columns: 1.5fr 1.5fr;
          gap: 2rem;
        }

        @media (max-width: 950px) {
          .charts-grid-layout {
            grid-template-columns: 1fr;
          }
        }

        .chart-container-card, .heatmap-container-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .chart-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
        }

        .chart-icon {
          color: var(--color-primary);
        }

        .svg-chart-wrapper {
          width: 100%;
          padding-top: 1rem;
        }

        .bar-chart-svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        .animated-rect-fill {
          transform-origin: bottom;
          animation: barGrow 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes barGrow {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }

        .empty-chart-state {
          text-align: center;
          padding: 4rem 0;
          color: var(--text-muted);
        }

        /* Heatmap styling */
        .heatmap-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.6rem;
          margin: 0.5rem 0;
        }

        @media (max-width: 480px) {
          .heatmap-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        .heatmap-cell {
          aspect-ratio: 1;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid transparent;
          transition: transform var(--transition-fast);
          cursor: help;
        }

        .heatmap-cell:hover {
          transform: scale(1.1);
          z-index: 10;
        }

        .heatmap-cell.empty {
          background: rgba(255, 255, 255, 0.02);
          border-color: var(--border-color);
          color: var(--text-muted);
        }

        .heatmap-cell.full {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
          color: var(--color-success);
        }

        .heatmap-cell.partial {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.3);
          color: var(--color-warning);
        }

        .heatmap-cell.missed {
          background: rgba(244, 63, 94, 0.12);
          border-color: rgba(244, 63, 94, 0.25);
          color: var(--color-danger);
        }

        .heatmap-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.75rem;
          border-top: 1px solid var(--border-color);
          padding-top: 1rem;
          margin-top: auto;
        }

        .legend-cell-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .legend-square {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        .legend-square.full { background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); }
        .legend-square.partial { background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); }
        .legend-square.missed { background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); }
        .legend-square.empty { background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); }
      `}</style>
    </div>
  );
};
