import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import FilterPanel from './components/FilterPanel';
import CourseList from './components/CourseList';
import ScheduleGrid from './components/ScheduleGrid';
import CreditSummary from './components/CreditSummary';
import { detectConflict, getAllConflicts } from './utils/conflictDetector';
import { getGenEdTag } from './hooks/useGenEdTag';
import './App.css';

/* ── Toast icons per type ── */
const TOAST_ICONS = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
};

function App() {
  /* ── Core state ── */
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [myDept, setMyDept] = useState('');
  const [enrollYear, setEnrollYear] = useState(115);
  const [filters, setFilters] = useState({
    year: null,
    type: null,
    search: '',
    dimensions: [],
  });

  /* ── Toast state ── */
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, message, type });
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  /* ── Mobile tab state ── */
  const [mobileTab, setMobileTab] = useState('courses');

  /* ── Load courses ── */
  useEffect(() => {
    fetch('/data/courses_output.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load courses');
        return res.json();
      })
      .then((data) => {
        setCourses(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading courses:', err);
        setLoading(false);
        showToast('課程資料載入失敗', 'error');
      });
  }, [showToast]);

  /* ── Derived: unique department list ── */
  const deptList = useMemo(() => {
    const depts = [...new Set(courses.map((c) => c.dept))].filter(Boolean).sort();
    return depts;
  }, [courses]);

  /* ── Derived: selected course objects ── */
  const selectedCourses = useMemo(() => {
    return courses.filter((c) => selected.has(c.id));
  }, [courses, selected]);

  /* ── Derived: total selected credits ── */
  const totalCredits = useMemo(() => {
    return selectedCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
  }, [selectedCourses]);

  /* ── Filter courses ── */
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      /* Year filter */
      if (filters.year !== null) {
        if (filters.year === 0) {
          /* 共同 = year is null */
          if (course.year !== null) return false;
        } else {
          if (course.year !== filters.year) return false;
        }
      }

      /* Type filter */
      if (filters.type) {
        switch (filters.type) {
          case '必修':
            if (course.type !== '必修') return false;
            break;
          case '選修':
            if (course.type !== '選修') return false;
            break;
          case '通識':
            if (course.type !== '通識' && course.type !== '通必') return false;
            break;
          case '師培':
            if (course.type !== '教必' && course.type !== '教選') return false;
            break;
          case '體育':
            /* courses with dept containing 體育 or type containing 共同 or common depts */
            if (
              course.type !== '必修' ||
              !course.name.includes('體育')
            ) {
              /* Broaden: check dept or name */
              const isPhysEd = course.name.includes('體育') || course.dept === '共同選';
              if (!isPhysEd) return false;
            }
            break;
          default:
            break;
        }
      }

      /* Dimension filter (only for 通識) */
      if (filters.dimensions.length > 0) {
        if (!course.dimension || !filters.dimensions.includes(course.dimension)) {
          return false;
        }
      }

      /* Search filter */
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const nameMatch = course.name.toLowerCase().includes(q);
        const instrMatch = course.instructor && course.instructor.toLowerCase().includes(q);
        const idMatch = course.id.includes(q);
        if (!nameMatch && !instrMatch && !idMatch) return false;
      }

      return true;
    });
  }, [courses, filters]);

  /* ── Toggle course selection ── */
  const toggleCourse = useCallback(
    (courseId) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(courseId)) {
          /* Deselect */
          next.delete(courseId);
          showToast('已取消選課', 'info');
          return next;
        }

        /* Find course object */
        const course = courses.find((c) => c.id === courseId);
        if (!course) return prev;

        /* Conflict detection */
        const currentSelected = courses.filter((c) => prev.has(c.id));
        const conflicts = getAllConflicts(course, currentSelected);
        if (conflicts.length > 0) {
          const conflictNames = conflicts.map((c) => c.name).join('、');
          showToast(`衝堂！與 ${conflictNames} 時間衝突`, 'error');
          return prev;
        }

        /* Cross-department warning */
        if (myDept && course.dept && course.dept !== myDept && course.type !== '通識' && course.type !== '通必') {
          showToast(`注意：此為跨系課程（${course.dept}）`, 'warning');
        }

        next.add(courseId);
        showToast(`已加選「${course.name}」(${course.credits}學分)`, 'success');
        return next;
      });
    },
    [courses, myDept, showToast]
  );

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <div className="loading-text">正在載入課程資料...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">靜</div>
          <div className="header-title">
            <span className="header-title-main">靜宜大學</span>
            <span className="header-title-sub">排課模擬系統 115-1</span>
          </div>
        </div>
        <div className="header-stats">
          <div className="header-stat">
            📚 已選 <span className="header-stat-value">{selected.size}</span> 門
          </div>
          <div className="header-stat">
            🎯 學分 <span className="header-stat-value">{totalCredits}</span>
          </div>
        </div>
      </header>

      {/* ── Mobile Tabs ── */}
      <div className="mobile-tabs">
        <button
          className={`mobile-tab-btn ${mobileTab === 'filter' ? 'active' : ''}`}
          onClick={() => setMobileTab('filter')}
        >
          🔍 篩選
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === 'courses' ? 'active' : ''}`}
          onClick={() => setMobileTab('courses')}
        >
          📋 課程
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setMobileTab('schedule')}
        >
          📅 課表
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="app-content">
        {/* Left Sidebar */}
        <aside className={`app-sidebar ${mobileTab === 'filter' ? 'mobile-active' : ''}`}>
          <FilterPanel
            myDept={myDept}
            setMyDept={setMyDept}
            enrollYear={enrollYear}
            setEnrollYear={setEnrollYear}
            filters={filters}
            setFilters={setFilters}
            deptList={deptList}
          />
        </aside>

        {/* Center */}
        <main className={`app-center ${mobileTab === 'courses' ? 'mobile-active' : ''}`}>
          <CourseList
            courses={filteredCourses}
            selected={selected}
            toggleCourse={toggleCourse}
            myDept={myDept}
            getGenEdTag={getGenEdTag}
          />
        </main>

        {/* Right Panel */}
        <aside className={`app-right ${mobileTab === 'schedule' ? 'mobile-active' : ''}`}>
          <ScheduleGrid
            selectedCourses={selectedCourses}
          />
          <CreditSummary
            selectedCourses={selectedCourses}
            enrollYear={enrollYear}
          />
        </aside>
      </div>

      {/* ── Toast ── */}
      {toast.show && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
