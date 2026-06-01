import './CourseList.css';

/* Day labels (1-based index: 1=Mon..6=Sat) */
const DAY_LABELS = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' };

/* Map type string to CSS class suffix */
function getTypeClass(type) {
  switch (type) {
    case '必修': return 'type-required';
    case '選修': return 'type-elective';
    case '通識':
    case '通必': return 'type-general';
    case '教必':
    case '教選': return 'type-teaching';
    default: return 'type-common';
  }
}

/* Map type to badge class */
function getBadgeClass(type) {
  switch (type) {
    case '必修': return 'badge-required';
    case '選修': return 'badge-elective';
    case '通識':
    case '通必': return 'badge-general';
    case '教必':
    case '教選': return 'badge-teaching';
    default: return '';
  }
}

/* Format time slots */
function formatTimes(times) {
  if (!times || times.length === 0) return '未定';
  return times
    .map((t) => `週${DAY_LABELS[t.day] || t.day} 第${t.periods.join(',')}節`)
    .join('、');
}

function CourseList({ courses, selected, toggleCourse, myDept, getGenEdTag }) {
  return (
    <div className="course-list">
      <div className="course-list-header">
        <span className="course-list-title">📋 課程列表</span>
        <span className="course-list-count">共 {courses.length} 門課</span>
      </div>

      {courses.length === 0 ? (
        <div className="course-list-empty">
          <div className="course-list-empty-icon">🔍</div>
          <div className="course-list-empty-text">沒有符合篩選條件的課程</div>
        </div>
      ) : (
        <div className="course-list-items">
          {courses.map((course) => {
            const isSelected = selected.has(course.id);
            const typeClass = getTypeClass(course.type);
            const genEdTag = getGenEdTag ? getGenEdTag(course) : null;
            const isCrossDept = myDept && course.dept && course.dept !== myDept
              && course.type !== '通識' && course.type !== '通必';

            return (
              <div
                key={course.id}
                className={`course-card ${typeClass} ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleCourse(course.id)}
              >
                <div className="course-card-top">
                  <div className="course-card-name">{course.name}</div>
                  <div className="course-card-badges">
                    <span className={`course-badge badge-type ${getBadgeClass(course.type)}`}>
                      {course.type}
                    </span>
                    {genEdTag && (
                      <span
                        className="course-badge badge-dim"
                        style={{
                          background: `${genEdTag.color}20`,
                          borderColor: `${genEdTag.color}50`,
                          color: genEdTag.color,
                        }}
                      >
                        {genEdTag.label}
                      </span>
                    )}
                    {isCrossDept && (
                      <span className="course-badge badge-cross-dept">跨系</span>
                    )}
                  </div>
                </div>

                <div className="course-card-meta">
                  <span className="course-meta-item">
                    <span className="course-meta-icon">👤</span>
                    {course.instructor || '未定'}
                  </span>
                  <span className="course-meta-item">
                    <span className="course-meta-icon">📍</span>
                    {course.location || '未定'}
                  </span>
                  <span className="course-meta-item">
                    <span className="course-meta-icon">🕐</span>
                    {formatTimes(course.times)}
                  </span>
                  <span className="course-meta-item">
                    <span className="course-meta-icon">📚</span>
                    {course.credits} 學分
                  </span>
                  <span className="course-meta-item">
                    <span className="course-meta-icon">🏛️</span>
                    {course.dept}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CourseList;
