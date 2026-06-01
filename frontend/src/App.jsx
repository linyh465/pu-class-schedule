import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import FilterPanel from './components/FilterPanel';
import CourseList from './components/CourseList';
import ScheduleGrid from './components/ScheduleGrid';
import CreditSummary from './components/CreditSummary';
import { detectConflict, getAllConflicts } from './utils/conflictDetector';
import { getGenEdTag } from './hooks/useGenEdTag';
import DepartmentNotes from './components/DepartmentNotes';
import './App.css';

const TOAST_ICONS = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };

function App() {
  /* ── Core state from localStorage ── */
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selected, setSelected] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedCourses');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [myDepts, setMyDepts] = useState(() => {
    try {
      const saved = localStorage.getItem('myDepts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [enrollYear, setEnrollYear] = useState(() => {
    const saved = localStorage.getItem('enrollYear');
    return saved ? parseInt(saved, 10) : 115;
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  const [filters, setFilters] = useState({
    year: null, type: null, search: '', dimensions: [],
  });

  /* ── Toast ── */
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const toastTimer = useRef(null);
  const showToast = useCallback((message, type = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, message, type });
    toastTimer.current = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  /* ── Mobile tab ── */
  const [mobileTab, setMobileTab] = useState('courses');

  /* ── Effects: Persistence & Theme ── */
  useEffect(() => {
    localStorage.setItem('selectedCourses', JSON.stringify(Array.from(selected)));
  }, [selected]);

  useEffect(() => {
    localStorage.setItem('myDepts', JSON.stringify(myDepts));
  }, [myDepts]);

  useEffect(() => {
    localStorage.setItem('enrollYear', enrollYear.toString());
  }, [enrollYear]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  /* ── Load courses ── */
  useEffect(() => {
    fetch('/data/courses_output.json')
      .then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then(data => { setCourses(data); setLoading(false); })
      .catch(err => {
        console.error(err);
        setLoading(false);
        showToast('課程資料載入失敗', 'error');
      });
  }, [showToast]);

  /* ── Dept list ── */
  const deptList = useMemo(() => {
    const exclude = new Set(['通識', '通識必修', '體選', '共同選', '初教', '中教',
      '資訊能力', '英語檢定', '多元文化', '職場英語', '資訊學院',
      '外語學院', '理學院', '人社院']);
    return [...new Set(courses.map(c => c.dept))]
      .filter(d => d && !exclude.has(d))
      .sort();
  }, [courses]);

  /* ── Selected course objects ── */
  const selectedCourses = useMemo(
    () => courses.filter(c => selected.has(c.id)),
    [courses, selected]
  );

  const totalCredits = useMemo(
    () => selectedCourses.reduce((s, c) => s + (c.credits || 0), 0),
    [selectedCourses]
  );

  const conflicts = useMemo(
    () => getAllConflicts(selectedCourses),
    [selectedCourses]
  );

  /* ══════════════════════════════════════════════════════════
     FIX #3: 嚴格課程過濾邏輯 (Updated for multiple depts)
     ══════════════════════════════════════════════════════════ */
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      /* ── 系所過濾 (支援多系所) ── */
      const isGenEdOrCommon = ['通識', '通必'].includes(course.type)
        || ['教必', '教選'].includes(course.type)
        || ['體選', '共同選', '初教', '中教'].includes(course.dept)
        || course.note === '共同課程'
        || course.note === '體育選修'
        || course.note === '共同選修'
        || course.note === '師培課程';

      if (myDepts.length > 0 && !isGenEdOrCommon && !myDepts.includes(course.dept)) {
        return false;
      }

      /* ── 年級過濾 ── */
      if (filters.year !== null) {
        if (filters.year === 0) {
          if (course.year !== null) return false;
        } else {
          if (!isGenEdOrCommon && course.year !== null && course.year !== filters.year) return false;
        }
      }

      /* ── 類型過濾 ── */
      if (filters.type) {
        switch (filters.type) {
          case '必修': if (course.type !== '必修') return false; break;
          case '選修': if (course.type !== '選修') return false; break;
          case '通識': if (course.type !== '通識' && course.type !== '通必') return false; break;
          case '師培': if (course.type !== '教必' && course.type !== '教選') return false; break;
          case '體育': {
            const isPE = course.dept === '體選' || course.dept === '共同選'
              || course.note === '體育選修' || course.note === '共同選修'
              || course.note === '共同課程';
            if (!isPE) return false;
            break;
          }
          default: break;
        }
      }

      /* ── 向度過濾 ── */
      if (filters.dimensions.length > 0) {
        if (!course.dimension || !filters.dimensions.includes(course.dimension)) return false;
      }

      /* ── 搜尋 ── */
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = course.name.toLowerCase().includes(q)
          || (course.instructor && course.instructor.toLowerCase().includes(q))
          || course.id.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [courses, filters, myDepts]);

  /* ── Toggle course ── */
  const toggleCourse = useCallback((courseId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
        showToast('已取消選課', 'info');
        return next;
      }

      const course = courses.find(c => c.id === courseId);
      if (!course) return prev;

      /* Conflict check */
      const currentSelected = courses.filter(c => prev.has(c.id));
      const conflict = detectConflict(course, currentSelected);
      if (conflict.conflict) {
        showToast(`❌ 衝堂！與「${conflict.with.name}」時間衝突`, 'error');
        return prev;
      }

      /* Cross-dept gen-ed warning */
      if (myDepts.length > 0 && course.gen_ed_group) {
        // Just checking against the primary dept (first one selected) for gen ed warning
        const primaryDept = myDepts[0];
        const tag = getGenEdTag(course.gen_ed_group, primaryDept);
        if (tag === '跨系二階') {
          showToast(`⚠️ 此為跨系時段 (${course.gen_ed_group})，需等選課第二階段才能選喔！`, 'warning');
        }
      }

      next.add(courseId);
      showToast(`已加選「${course.name}」(${course.credits}學分)`, 'success');
      return next;
    });
  }, [courses, myDepts, showToast]);

  /* ══════════════════════════════════════════════════════════
     FIX #4: 一鍵帶入必修 (針對所有選取的系所)
     ══════════════════════════════════════════════════════════ */
  const handleAddRequired = useCallback(() => {
    if (myDepts.length === 0) {
      showToast('請先選擇您的系所！', 'error');
      return;
    }

    const required = courses.filter(c => myDepts.includes(c.dept) && c.type === '必修');
    if (required.length === 0) {
      showToast('找不到所選系所的必修課程', 'warning');
      return;
    }

    setSelected(prev => {
      const next = new Set(prev);
      const currentSelected = courses.filter(c => next.has(c.id));
      let added = 0;
      let skippedConflict = 0;

      for (const course of required) {
        if (next.has(course.id)) continue;
        const conflict = detectConflict(course, currentSelected);
        if (conflict.conflict) {
          skippedConflict++;
          continue;
        }
        next.add(course.id);
        currentSelected.push(course);
        added++;
      }

      if (added > 0) {
        const msg = skippedConflict > 0
          ? `✅ 已帶入 ${added} 堂必修（${skippedConflict} 堂因衝堂跳過）`
          : `✅ 已帶入 ${added} 堂必修！`;
        showToast(msg, 'success');
      } else if (skippedConflict > 0) {
        showToast(`所有必修皆已選或衝堂 (${skippedConflict} 堂衝堂)`, 'warning');
      } else {
        showToast('所有必修課程皆已選取', 'info');
      }

      return next;
    });
  }, [courses, myDepts, showToast]);

  /* ── Loading ── */
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
          <DepartmentNotes />
          <button className="theme-toggle-btn" onClick={toggleTheme} title="切換主題">
            {theme === 'light' ? '🌙' : '🌞'}
          </button>
        </div>
        <div className="header-stats">
          <div className="header-stat">
            📚 已選 <span className="header-stat-value">{selected.size}</span> 門
          </div>
          <div className="header-stat">
            🎯 學分 <span className="header-stat-value">{totalCredits}</span>
          </div>
          {conflicts.length > 0 && (
            <div className="header-stat header-stat--conflict">
              ⚠️ 衝堂 <span className="header-stat-value">{conflicts.length}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile Tabs ── */}
      <div className="mobile-tabs">
        {['filter', 'courses', 'schedule'].map(tab => (
          <button
            key={tab}
            className={`mobile-tab-btn ${mobileTab === tab ? 'active' : ''}`}
            onClick={() => setMobileTab(tab)}
          >
            {tab === 'filter' ? '🔍 篩選' : tab === 'courses' ? '📋 課程' : '📅 課表'}
          </button>
        ))}
      </div>

      <div className="app-content">
        {/* ── 左側 Sidebar: FilterPanel + CreditSummary ── */}
        <aside className={`app-sidebar ${mobileTab === 'filter' ? 'mobile-active' : ''}`}>
          <FilterPanel
            myDepts={myDepts} setMyDepts={setMyDepts}
            enrollYear={enrollYear} setEnrollYear={setEnrollYear}
            filters={filters} setFilters={setFilters}
            deptList={deptList}
          />
          <div className="sidebar-divider" />
          <CreditSummary
            selectedCourses={selectedCourses}
            enrollYear={enrollYear}
          />
        </aside>

        {/* ── 中間: 一鍵帶入 + CourseList ── */}
        <div className={`app-center ${mobileTab === 'courses' ? 'mobile-active' : ''}`}>
          <div className="center-toolbar">
            <button className="btn-add-required" onClick={handleAddRequired}>
              ⚡ 一鍵帶入必修
            </button>
            <span className="center-count">
              共 {filteredCourses.length} 門課程
            </span>
          </div>
          <CourseList
            courses={filteredCourses}
            selected={selected}
            onToggle={toggleCourse}
            myDepts={myDepts}
          />
        </div>

        {/* ── 右側: ScheduleGrid (佔滿剩餘空間) ── */}
        <div className={`app-right ${mobileTab === 'schedule' ? 'mobile-active' : ''}`}>
          <ScheduleGrid
            selectedCourses={selectedCourses}
            onRemove={toggleCourse}
            conflicts={conflicts}
          />
        </div>
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
