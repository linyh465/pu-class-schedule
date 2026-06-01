import { useState, useRef, useEffect } from 'react';
import './FilterPanel.css';

/* All 8 gen-ed dimensions with colors */
const ALL_DIMENSIONS = [
  { key: '生命智慧', color: '#e74c3c' },
  { key: '人文美學', color: '#9b59b6' },
  { key: '社會洞察', color: '#3498db' },
  { key: '自然科學', color: '#27ae60' },
  { key: '宗教與思維', color: '#e67e22' },
  { key: '永續與在地', color: '#2ecc71' },
  { key: '跨域與設計', color: '#1abc9c' },
  { key: '科技與服務', color: '#f39c12' },
];

/* Year filter buttons */
const YEAR_OPTIONS = [
  { value: null, label: '全部' },
  { value: 1, label: '大一' },
  { value: 2, label: '大二' },
  { value: 3, label: '大三' },
  { value: 4, label: '大四' },
  { value: 0, label: '共同' },
];

/* Type filter chips */
const TYPE_OPTIONS = [
  { value: null, label: '全部', chipClass: 'chip-all' },
  { value: '必修', label: '必修', chipClass: 'chip-required' },
  { value: '選修', label: '選修', chipClass: 'chip-elective' },
  { value: '通識', label: '通識', chipClass: 'chip-general' },
  { value: '師培', label: '師培', chipClass: 'chip-teaching' },
  { value: '體育', label: '體育/共同', chipClass: 'chip-common' },
];

function FilterPanel({ myDept, setMyDept, enrollYear, setEnrollYear, filters, setFilters, deptList }) {
  /* ── Searchable dropdown state ── */
  const [deptQuery, setDeptQuery] = useState(myDept);
  const [deptOpen, setDeptOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* Sync external myDept changes */
  useEffect(() => {
    setDeptQuery(myDept);
  }, [myDept]);

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDeptOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDepts = deptList.filter((d) =>
    d.toLowerCase().includes(deptQuery.toLowerCase())
  );

  const handleDeptSelect = (dept) => {
    setMyDept(dept);
    setDeptQuery(dept);
    setDeptOpen(false);
  };

  const handleDeptClear = () => {
    setMyDept('');
    setDeptQuery('');
  };

  /* ── Filter update helpers ── */
  const setYear = (val) => {
    setFilters((prev) => ({ ...prev, year: val }));
  };

  const setType = (val) => {
    setFilters((prev) => ({
      ...prev,
      type: val,
      /* Clear dimensions when switching away from 通識 */
      dimensions: val === '通識' ? prev.dimensions : [],
    }));
  };

  const setSearch = (val) => {
    setFilters((prev) => ({ ...prev, search: val }));
  };

  const toggleDimension = (dim) => {
    setFilters((prev) => {
      const dims = prev.dimensions.includes(dim)
        ? prev.dimensions.filter((d) => d !== dim)
        : [...prev.dimensions, dim];
      return { ...prev, dimensions: dims };
    });
  };

  return (
    <div className="filter-panel">
      {/* ── 1. 我的系所 ── */}
      <div className="filter-card">
        <div className="filter-section-title">
          <span className="filter-section-icon">🏫</span>
          我的系所
        </div>
        <div className="filter-dropdown-wrapper" ref={dropdownRef}>
          <input
            className="filter-dropdown-input"
            type="text"
            placeholder="搜尋並選擇系所..."
            value={deptQuery}
            onChange={(e) => {
              setDeptQuery(e.target.value);
              setDeptOpen(true);
            }}
            onFocus={() => setDeptOpen(true)}
          />
          {myDept && (
            <span className="filter-dropdown-clear" onClick={handleDeptClear}>
              ✕
            </span>
          )}
          {deptOpen && (
            <div className="filter-dropdown-list">
              {filteredDepts.length > 0 ? (
                filteredDepts.map((dept) => (
                  <div
                    key={dept}
                    className={`filter-dropdown-item ${dept === myDept ? 'active' : ''}`}
                    onClick={() => handleDeptSelect(dept)}
                  >
                    {dept}
                  </div>
                ))
              ) : (
                <div className="filter-dropdown-empty">找不到相符的系所</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. 入學學年度 ── */}
      <div className="filter-card">
        <div className="filter-section-title">
          <span className="filter-section-icon">🎓</span>
          入學學年度
        </div>
        <div className="filter-toggle-group">
          <button
            className={`filter-toggle-btn ${enrollYear === 115 ? 'active' : ''}`}
            onClick={() => setEnrollYear(115)}
          >
            115（新制）
          </button>
          <button
            className={`filter-toggle-btn ${enrollYear === 114 ? 'active' : ''}`}
            onClick={() => setEnrollYear(114)}
          >
            114以前（舊制）
          </button>
        </div>
      </div>

      {/* ── 3. 年級篩選 ── */}
      <div className="filter-card">
        <div className="filter-section-title">
          <span className="filter-section-icon">📅</span>
          年級篩選
        </div>
        <div className="filter-year-group">
          {YEAR_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              className={`filter-year-btn ${filters.year === opt.value ? 'active' : ''}`}
              onClick={() => setYear(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. 課程類型 ── */}
      <div className="filter-card">
        <div className="filter-section-title">
          <span className="filter-section-icon">📋</span>
          課程類型
        </div>
        <div className="filter-chips">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              className={`filter-chip ${opt.chipClass} ${filters.type === opt.value ? 'active' : ''}`}
              onClick={() => setType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 5. 搜尋 ── */}
      <div className="filter-card">
        <div className="filter-section-title">
          <span className="filter-section-icon">🔍</span>
          搜尋
        </div>
        <div className="filter-search-wrapper">
          <span className="filter-search-icon">🔎</span>
          <input
            className="filter-search-input"
            type="text"
            placeholder="搜尋課程名稱、教師、代碼..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── 6. 通識向度 (only when type=通識) ── */}
      {filters.type === '通識' && (
        <div className="filter-card">
          <div className="filter-section-title">
            <span className="filter-section-icon">🎯</span>
            通識向度
          </div>
          <div className="filter-dimensions">
            {ALL_DIMENSIONS.map((dim) => (
              <label
                key={dim.key}
                className="filter-dimension-item"
                onClick={() => toggleDimension(dim.key)}
              >
                <span
                  className={`filter-dimension-checkbox ${
                    filters.dimensions.includes(dim.key) ? 'checked' : ''
                  }`}
                />
                <span className="filter-dimension-dot" style={{ background: dim.color }} />
                {dim.key}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
