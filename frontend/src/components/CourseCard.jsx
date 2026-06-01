import { useState, useRef } from 'react';
import './CourseCard.css';

const TYPE_COLORS = {
  '必修': '#c0392b',
  '選修': '#2980b9',
  '通識': '#27ae60',
  '通必': '#27ae60',
  '教必': '#8e44ad',
  '教選': '#8e44ad',
};
const DEFAULT_COLOR = '#e67e22';

const DAY_LABELS = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' };

function getTypeColor(type) {
  return TYPE_COLORS[type] || DEFAULT_COLOR;
}

function formatTimes(times) {
  if (!times || times.length === 0) return '未定';
  return times
    .map(t => `週${DAY_LABELS[t.day] || t.day} 第${t.periods.join(',')}節`)
    .join('、');
}

export default function CourseCard({ course, isSelected, onToggle, genEdTag }) {
  const [showPrecautions, setShowPrecautions] = useState(false);
  const precautionsRef = useRef(null);
  const color = getTypeColor(course.type);

  const handleClick = () => {
    if (onToggle) onToggle(course.id);
  };

  const handlePrecautionMouseEnter = (e) => {
    e.stopPropagation();
    setShowPrecautions(true);
  };

  const handlePrecautionMouseLeave = (e) => {
    e.stopPropagation();
    setShowPrecautions(false);
  };

  const hasPrecautions = course.precautions && course.precautions.length > 0;

  return (
    <div
      className={`course-card${isSelected ? ' course-card--selected' : ''}`}
      style={{ '--type-color': color }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      aria-pressed={isSelected}
      aria-label={`${course.name} - ${course.type} - ${course.credits}學分`}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <div className="course-card__check">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill={color} opacity="0.9" />
            <path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Header row: name + credits */}
      <div className="course-card__header">
        <h4 className="course-card__name">{course.name}</h4>
        <span className="course-card__credits" style={{ background: `${color}22`, color }}>
          {course.credits}學分
        </span>
      </div>

      {/* Meta row: type badge + instructor */}
      <div className="course-card__meta">
        <span className="course-card__type-badge" style={{ background: `${color}20`, color }}>
          {course.type}
        </span>
        <span className="course-card__instructor">
          {course.instructor}
        </span>
      </div>

      {/* Time and location */}
      <div className="course-card__details">
        <span className="course-card__time">
          <svg className="course-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {formatTimes(course.times)}
        </span>
        {course.location && (
          <span className="course-card__location">
            <svg className="course-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {course.location}
          </span>
        )}
      </div>

      {/* Tags row: genEdTag, dimension, gen_ed_group */}
      <div className="course-card__tags">
        {genEdTag === '本系時段' && (
          <span className="course-card__tag course-card__tag--dept">本系時段</span>
        )}
        {genEdTag === '跨系二階' && (
          <span className="course-card__tag course-card__tag--cross">跨系二階</span>
        )}
        {course.dimension && (
          <span className="course-card__tag course-card__tag--dimension">
            {course.dimension}
          </span>
        )}
        {course.gen_ed_group && (
          <span className="course-card__tag course-card__tag--group">
            {course.gen_ed_group}
          </span>
        )}
      </div>

      {/* Note */}
      {course.note && (
        <p className="course-card__note">{course.note}</p>
      )}

      {/* Precautions warning */}
      {hasPrecautions && (
        <div
          className="course-card__precautions-trigger"
          ref={precautionsRef}
          onMouseEnter={handlePrecautionMouseEnter}
          onMouseLeave={handlePrecautionMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="course-card__warning-icon">⚠️</span>
          <span className="course-card__warning-text">注意事項</span>
          {showPrecautions && (
            <div className="course-card__precautions-tooltip">
              <ul>
                {course.precautions.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
