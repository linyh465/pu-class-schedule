import CourseCard from './CourseCard';
import { getGenEdTag } from '../hooks/useGenEdTag';
import './CourseList.css';

/* 分組順序 */
const TYPE_ORDER = [
  { key: '必修', label: '必修', icon: '🔴' },
  { key: '選修', label: '選修', icon: '🔵' },
  { key: '通識', label: '通識', icon: '🟢', includes: ['通識', '通必'] },
  { key: '師培', label: '師培', icon: '🟣', includes: ['教必', '教選'] },
  { key: '其他', label: '體育 / 共同', icon: '🟠' },
];

function groupCourses(courses) {
  const groups = TYPE_ORDER.map(g => ({ ...g, courses: [] }));

  for (const course of courses) {
    let placed = false;
    for (const group of groups) {
      if (group.includes) {
        if (group.includes.includes(course.type)) {
          group.courses.push(course);
          placed = true;
          break;
        }
      } else if (group.key === course.type) {
        group.courses.push(course);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups[groups.length - 1].courses.push(course);
    }
  }

  return groups.filter(g => g.courses.length > 0);
}

export default function CourseList({ courses, selected, onToggle, myDept }) {
  const groups = groupCourses(courses);

  if (courses.length === 0) {
    return (
      <div className="course-list">
        <div className="course-list-empty">
          <div className="course-list-empty-icon">📭</div>
          <div className="course-list-empty-text">沒有符合篩選條件的課程</div>
          <div className="course-list-empty-hint">請調整左側篩選條件</div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-list">
      {groups.map(group => (
        <div key={group.key} className="course-list-group">
          <div className="course-list-group-header">
            <span className="course-list-group-icon">{group.icon}</span>
            <span className="course-list-group-label">{group.label}</span>
            <span className="course-list-group-count">{group.courses.length}</span>
          </div>
          <div className="course-list-group-items">
            {group.courses.map(course => {
              const isSelected = selected instanceof Set
                ? selected.has(course.id)
                : Array.isArray(selected) && selected.includes(course.id);
              const genEdTag = course.gen_ed_group
                ? getGenEdTag(course.gen_ed_group, myDept)
                : null;

              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  isSelected={isSelected}
                  onToggle={onToggle}
                  genEdTag={genEdTag}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
