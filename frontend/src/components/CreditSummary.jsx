import { useMemo } from 'react';
import {
  CREDIT_REQ_NEW,
  CREDIT_REQ_OLD,
  OLD_TO_NEW_MAP,
  GEN_ED_TOTAL,
} from '../data/genEdMapping';
import './CreditSummary.css';

/* Dimension colors for progress fills */
const DIM_COLORS = {
  '生命智慧': '#e74c3c',
  '人文美學': '#9b59b6',
  '社會洞察': '#3498db',
  '自然科學': '#27ae60',
  '宗教與思維': '#e67e22',
  '永續與在地': '#2ecc71',
  '跨域與設計': '#1abc9c',
  '科技與服務': '#f39c12',
};

/* Type colors for breakdown */
const TYPE_COLORS = {
  '必修': '#c0392b',
  '選修': '#2980b9',
  '通識': '#27ae60',
  '通必': '#27ae60',
  '教必': '#8e44ad',
  '教選': '#8e44ad',
};

function CreditSummary({ selectedCourses, enrollYear }) {
  /* ── Compute credit breakdown by type ── */
  const breakdown = useMemo(() => {
    const result = { 必修: 0, 選修: 0, 通識: 0, 其他: 0 };
    for (const c of selectedCourses) {
      if (c.type === '必修') result['必修'] += c.credits;
      else if (c.type === '選修') result['選修'] += c.credits;
      else if (c.type === '通識' || c.type === '通必') result['通識'] += c.credits;
      else result['其他'] += c.credits;
    }
    return result;
  }, [selectedCourses]);

  const totalCredits = selectedCourses.reduce((s, c) => s + (c.credits || 0), 0);

  /* ── Compute gen-ed credits per dimension ── */
  const dimCredits = useMemo(() => {
    const counts = {};
    const genEdCourses = selectedCourses.filter(
      (c) => (c.type === '通識' || c.type === '通必') && c.dimension
    );

    for (const c of genEdCourses) {
      let dim = c.dimension;

      /* For old-system students (114), map new dimensions to old ones */
      if (enrollYear <= 114 && OLD_TO_NEW_MAP[dim]) {
        dim = OLD_TO_NEW_MAP[dim];
      }

      counts[dim] = (counts[dim] || 0) + c.credits;
    }

    return counts;
  }, [selectedCourses, enrollYear]);

  /* ── Select requirement set ── */
  const requirements = enrollYear >= 115 ? CREDIT_REQ_NEW : CREDIT_REQ_OLD;

  /* ── Compute gen-ed total ── */
  const genEdTotal = Object.values(dimCredits).reduce((s, v) => s + v, 0);
  const genEdMet = genEdTotal >= GEN_ED_TOTAL;

  /* ── Circular progress values ── */
  const circleRadius = 34;
  const circumference = 2 * Math.PI * circleRadius;
  const progressRatio = Math.min(genEdTotal / GEN_ED_TOTAL, 1);
  const dashOffset = circumference * (1 - progressRatio);
  const circleColor = genEdMet ? '#27ae60' : genEdTotal > 0 ? '#f39c12' : 'rgba(255,255,255,0.15)';

  return (
    <div className="credit-summary">
      <div className="credit-summary-title">📊 學分統計</div>

      {/* ── Circular total progress ── */}
      <div className="credit-circular-wrap">
        <div className="credit-circle">
          <svg viewBox="0 0 80 80">
            <circle className="credit-circle-bg" cx="40" cy="40" r={circleRadius} />
            <circle
              className="credit-circle-fill"
              cx="40"
              cy="40"
              r={circleRadius}
              stroke={circleColor}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="credit-circle-text">
            <span className="credit-circle-number">{totalCredits}</span>
            <span className="credit-circle-label">總學分</span>
          </div>
        </div>
        <div className="credit-total-info">
          {genEdMet ? (
            <div className="credit-total-status met">🎓 通識已達標</div>
          ) : (
            <div className="credit-total-status unmet">
              ⚠️ 通識尚需 {Math.max(GEN_ED_TOTAL - genEdTotal, 0)} 學分
            </div>
          )}
          <div className="credit-total-detail">
            通識已選 {genEdTotal} / {GEN_ED_TOTAL} 學分
            <br />
            {enrollYear >= 115 ? '115 新制規定' : '114 舊制規定'}
          </div>
        </div>
      </div>

      {/* ── Credit Breakdown ── */}
      <div className="credit-breakdown">
        {Object.entries(breakdown).map(([label, val]) => (
          <div className="credit-breakdown-item" key={label}>
            <span
              className="credit-breakdown-dot"
              style={{
                background:
                  label === '必修' ? '#c0392b'
                  : label === '選修' ? '#2980b9'
                  : label === '通識' ? '#27ae60'
                  : '#6b6b80',
              }}
            />
            {label}
            <span className="credit-breakdown-val">{val}</span>
          </div>
        ))}
      </div>

      {/* ── Gen-Ed Dimension Rows ── */}
      <div className="credit-section-sub">
        {enrollYear >= 115 ? '📐 新制通識向度' : '📐 舊制通識向度'}
      </div>

      {selectedCourses.length === 0 ? (
        <div className="credit-empty">
          <div className="credit-empty-icon">📚</div>
          尚未選課，請從左側選擇課程
        </div>
      ) : (
        <div className="credit-dim-rows">
          {requirements.map((req) => {
            const current = dimCredits[req.key] || 0;
            const isMet = current >= req.min;
            const isOver = current > req.max;
            const fillPct = Math.min((current / req.max) * 100, 100);
            const color = DIM_COLORS[req.key] || '#a0a0b0';

            return (
              <div className="credit-dim-row" key={req.key}>
                <div className="credit-dim-header">
                  <span className="credit-dim-label">
                    <span className="credit-dim-icon" style={{ background: color }} />
                    {req.label}
                  </span>
                  <span className="credit-dim-value">
                    {current}
                    <span className="req"> / ≥{req.min}</span>
                    {isMet && !isOver && (
                      <span className="credit-dim-status" style={{ color: '#27ae60' }}>✓</span>
                    )}
                    {isOver && (
                      <span className="credit-dim-status" style={{ color: '#f39c12' }}>⚠</span>
                    )}
                  </span>
                </div>
                <div className="credit-progress-track">
                  <div
                    className="credit-progress-fill"
                    style={{
                      width: `${fillPct}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CreditSummary;
