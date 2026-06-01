import { useMemo, useState } from 'react';
import './ScheduleGrid.css';

/* Days: Mon-Sat */
const DAYS = [
  { key: 1, label: '一' },
  { key: 2, label: '二' },
  { key: 3, label: '三' },
  { key: 4, label: '四' },
  { key: 5, label: '五' },
  { key: 6, label: '六' },
];

/* Period rows: 1-13 */
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/* Map type to block CSS class */
function blockClass(type) {
  switch (type) {
    case '必修': return 'block-required';
    case '選修': return 'block-elective';
    case '通識':
    case '通必': return 'block-general';
    case '教必':
    case '教選': return 'block-teaching';
    default: return 'block-common';
  }
}

function ScheduleGrid({ selectedCourses }) {
  const [hoveredId, setHoveredId] = useState(null);

  /* Build a grid map: { "day-period" -> course } */
  const grid = useMemo(() => {
    const map = {};
    for (const course of selectedCourses) {
      if (!course.times) continue;
      for (const t of course.times) {
        for (const p of t.periods) {
          const key = `${t.day}-${p}`;
          map[key] = course;
        }
      }
    }
    return map;
  }, [selectedCourses]);

  /* Determine if we have courses on Saturday */
  const hasSaturday = useMemo(() => {
    return selectedCourses.some((c) =>
      c.times?.some((t) => t.day === 6)
    );
  }, [selectedCourses]);

  /* Determine the max period to show (at least 9, up to 13) */
  const maxPeriod = useMemo(() => {
    let max = 9;
    for (const c of selectedCourses) {
      if (!c.times) continue;
      for (const t of c.times) {
        for (const p of t.periods) {
          if (p > max) max = p;
        }
      }
    }
    return max;
  }, [selectedCourses]);

  const displayDays = hasSaturday ? DAYS : DAYS.slice(0, 5);
  const displayPeriods = PERIODS.slice(0, maxPeriod);

  return (
    <div className="schedule-grid-wrap">
      <div className="schedule-grid-title">📅 我的課表</div>

      {selectedCourses.length === 0 ? (
        <div className="schedule-empty">
          <div className="schedule-empty-icon">📅</div>
          尚未選課，課表為空
        </div>
      ) : (
        <table className="schedule-table">
          <thead>
            <tr>
              <th></th>
              {displayDays.map((d) => (
                <th key={d.key}>週{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayPeriods.map((period) => (
              <tr key={period}>
                <td className="schedule-period-label">{period}</td>
                {displayDays.map((day) => {
                  const key = `${day.key}-${period}`;
                  const course = grid[key];

                  return (
                    <td key={key} className="schedule-cell">
                      {course && (
                        <div
                          className={`schedule-block ${blockClass(course.type)}`}
                          onMouseEnter={() => setHoveredId(key)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <div className="schedule-block-name">
                            {course.name.length > 6
                              ? course.name.slice(0, 6) + '…'
                              : course.name}
                          </div>
                          <div className="schedule-block-loc">
                            {course.location || ''}
                          </div>
                          {hoveredId === key && (
                            <div className="schedule-tooltip">
                              <strong>{course.name}</strong>
                              <br />
                              {course.instructor} · {course.location}
                              <br />
                              {course.credits}學分 · {course.type}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ScheduleGrid;
