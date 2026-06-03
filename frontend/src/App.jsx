import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  GripVertical,
  Trash2,
  BookOpen,
  Plus,
  CheckCircle2,
  Sparkles,
  Bot,
  X,
  Pointer,
  Download,
  Info,
  AlertTriangle,
} from 'lucide-react';

// TAB_ORDER determines left-panel tab sequence; only tabs whose type exists in the
// filtered course list are shown (except '全部' which is always shown).
const TAB_ORDER = ['全部', '必修', '備用必修', '教必', '選修', '教選', '通識', '通必', '兵役', '大一重補修', '其他'];

const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五'];
const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const getContinuousChunks = (periodsArray) => {
  const sorted = [...periodsArray].sort((a, b) => a - b);
  const chunks = [];
  let currentChunk = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentChunk.push(sorted[i]);
    } else {
      chunks.push(currentChunk);
      currentChunk = [sorted[i]];
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
};

const formatTimes = (times) => {
  return times.map(t => `${dayNames[t.day - 1]} ${t.periods.join(', ')}`).join(' / ');
};

const loadStoredTab = () => {
  try {
    return localStorage.getItem('activeTab') || '全部';
  } catch {
    return '全部';
  }
};

const parseCourseName = (fullName) => {
  const match = fullName.match(/^(.*?)\s*\((.+?)\)$/);
  if (match) {
    return { baseName: match[1].trim(), className: match[2].trim() };
  }
  return { baseName: fullName, className: '一般' };
};

const CourseCard = ({ group, selectedCourses, onAdd, onDragStart }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const safeIndex = activeTabIndex < group.sections.length ? activeTabIndex : 0;
  const activeSection = group.sections[safeIndex];
  const isSelected = selectedCourses.some(c => c.id === activeSection.id);

  const isRequired = activeSection.type === '必修';
  const isBackupReq = activeSection.type === '備用必修';
  const isEduReq = activeSection.type === '教必';
  const isGeneral = activeSection.type === '通識';
  const isGenReq = activeSection.type === '通必';
  const isMilitary = activeSection.type === '兵役';
  const isOther = activeSection.type === '其他';
  const isEduElective = activeSection.type === '教選';

  let borderClass = 'border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';
  if (isSelected) borderClass = 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed';
  else if (isRequired) borderClass = 'border-indigo-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';
  else if (isBackupReq) borderClass = 'border-amber-200 bg-white hover:border-amber-400 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';
  else if (isEduReq) borderClass = 'border-teal-200 bg-white hover:border-teal-400 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';
  else if (isGeneral) borderClass = 'border-purple-200 bg-white hover:border-purple-400 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';
  else if (isGenReq) borderClass = 'border-violet-200 bg-white hover:border-violet-400 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';
  else if (isMilitary) borderClass = 'border-slate-300 bg-white hover:border-slate-500 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';
  else if (isOther) borderClass = 'border-rose-200 bg-white hover:border-rose-400 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';
  else if (isEduElective) borderClass = 'border-cyan-200 bg-white hover:border-cyan-400 hover:shadow-md cursor-pointer md:cursor-grab active:cursor-grabbing';

  let badgeClass = 'bg-emerald-100 text-emerald-700';
  if (isRequired) badgeClass = 'bg-indigo-100 text-indigo-700';
  else if (isBackupReq) badgeClass = 'bg-amber-100 text-amber-700';
  else if (isEduReq) badgeClass = 'bg-teal-100 text-teal-700';
  else if (isGeneral) badgeClass = 'bg-purple-100 text-purple-700';
  else if (isGenReq) badgeClass = 'bg-violet-100 text-violet-700';
  else if (isMilitary) badgeClass = 'bg-slate-200 text-slate-700';
  else if (isOther) badgeClass = 'bg-rose-100 text-rose-700';
  else if (isEduElective) badgeClass = 'bg-cyan-100 text-cyan-700';

  return (
    <div
      draggable={!isSelected}
      onDragStart={(event) => onDragStart(event, activeSection.id)}
      onClick={() => !isSelected && onAdd(activeSection.id)}
      className={`relative p-3 rounded-xl border-2 transition-all flex flex-col ${borderClass}`}
    >
      {!isSelected && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 hidden md:block">
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      <div className={`md:pl-6 ${isSelected ? 'opacity-70' : ''} flex-1 flex flex-col`}>
        {group.sections.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-2" onClick={(e) => e.stopPropagation()}>
            {group.sections.map((sec, idx) => (
              <button
                key={sec.id}
                onClick={() => setActiveTabIndex(idx)}
                className={`px-2 py-1 rounded-md text-[11px] md:text-xs font-bold transition-colors ${
                  safeIndex === idx
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {sec.className}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5 mb-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] md:text-xs px-2 py-0.5 rounded-md font-bold ${badgeClass}`}>
              {activeSection.type}
            </span>

            <span className="text-[11px] md:text-xs px-2 py-0.5 rounded-md font-bold bg-gray-100 text-gray-600 border border-gray-200">
              {activeSection.id}
            </span>

            {activeSection.note === '本系時段' && (
              <span className="text-[11px] md:text-xs px-2 py-0.5 rounded-md font-bold bg-blue-100 text-blue-700">
                本系時段
              </span>
            )}
            {activeSection.note === '跨系二階' && (
              <span className="text-[11px] md:text-xs px-2 py-0.5 rounded-md font-bold bg-orange-100 text-orange-700">
                跨班時段
              </span>
            )}
            {activeSection.note && activeSection.note !== '本系時段' && activeSection.note !== '跨系二階' && (
              <span className="text-[11px] md:text-xs px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600">
                {activeSection.note}
              </span>
            )}
            {activeSection.dimension && (
              <span className="text-[11px] md:text-xs px-2 py-0.5 rounded-md font-bold bg-violet-50 text-violet-600 border border-violet-100">
                {activeSection.dimension}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-start">
          <h3 className="font-bold text-slate-800 leading-tight text-sm md:text-base pr-2">{group.name}</h3>
          <span className="text-xs text-slate-400 font-bold whitespace-nowrap shrink-0">{group.credits} 學分</span>
        </div>

        <p className="text-[11px] md:text-xs text-slate-500 mt-1">{group.instructor} • {group.location}</p>
        <p className="text-[11px] md:text-xs font-medium text-slate-600 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded w-fit">
          ⏰ {formatTimes(group.times)}
        </p>
      </div>

      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
            <CheckCircle2 className="w-4 h-4" /> 已加入
          </span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(() => {
    try { return localStorage.getItem('selectedDept') || ''; } catch { return ''; }
  });
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [storageRestored, setStorageRestored] = useState(false);
  const [activeTab, setActiveTab] = useState(loadStoredTab);
  const [toast, setToast] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(() => {
    try { return !sessionStorage.getItem('updateModalDismissed'); } catch { return true; }
  });
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [disclaimerModalOpen, setDisclaimerModalOpen] = useState(false);

  const pdfRef = useRef(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  // Fetch courses data on mount
  useEffect(() => {
    fetch('/data/courses_output.json')
      .then(r => r.json())
      .then(data => {
        setAllCourses(data);
        setCoursesLoading(false);
      })
      .catch(() => {
        setCoursesLoading(false);
      });
  }, []);

  // Restore selectedCourses from localStorage after allCourses is loaded
  useEffect(() => {
    if (coursesLoading || storageRestored) return;
    try {
      const saved = localStorage.getItem('selectedCourses');
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          const restored = ids.map(id => allCourses.find(c => c.id === id)).filter(Boolean);
          setSelectedCourses(restored);
        }
      }
    } catch {
      // ignore
    }
    setStorageRestored(true);
  }, [coursesLoading, allCourses, storageRestored]);

  // Persist selectedCourses
  useEffect(() => {
    if (!storageRestored) return;
    localStorage.setItem('selectedCourses', JSON.stringify(selectedCourses.map(c => c.id)));
  }, [selectedCourses, storageRestored]);

  // Persist activeTab
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Persist selectedDept
  useEffect(() => {
    try { localStorage.setItem('selectedDept', selectedDept); } catch { /* ignore */ }
  }, [selectedDept]);

  // --- Derived values ---

  const deptList = useMemo(() => {
    const depts = [...new Set(allCourses.map(c => c.dept))].sort();
    return depts;
  }, [allCourses]);

  const filteredCourses = useMemo(() => {
    if (!selectedDept) return [];
    return allCourses.filter(c => c.dept === selectedDept);
  }, [allCourses, selectedDept]);

  const groupedCoursesList = useMemo(() => {
    const groups = {};
    filteredCourses.forEach(course => {
      const { baseName, className } = parseCourseName(course.name);
      const timeStr = JSON.stringify(course.times);
      const key = `${baseName}|${timeStr}|${course.location}`;

      if (!groups[key]) {
        groups[key] = {
          ...course,
          name: baseName,
          sections: [],
        };
      }
      groups[key].sections.push({
        id: course.id,
        className: className,
        type: course.type,
        note: course.note,
        dimension: course.dimension,
        originalName: course.name,
      });
    });
    return Object.values(groups);
  }, [filteredCourses]);

  const availableTabs = useMemo(() => {
    const types = new Set(filteredCourses.map(c => c.type));
    return TAB_ORDER.filter(t => t === '全部' || types.has(t));
  }, [filteredCourses]);

  // If active tab becomes unavailable after dept change, reset to 全部
  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab('全部');
    }
  }, [availableTabs, activeTab]);

  const filteredGroups = useMemo(() => {
    return groupedCoursesList.filter(group => {
      if (activeTab === '全部') return true;
      return group.sections.some(sec => sec.type === activeTab);
    });
  }, [groupedCoursesList, activeTab]);

  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  const scheduleBlocks = [];
  selectedCourses.forEach(course => {
    course.times.forEach(time => {
      const chunks = getContinuousChunks(time.periods);
      chunks.forEach(chunk => {
        scheduleBlocks.push({
          ...course,
          day: time.day,
          startPeriod: chunk[0],
          length: chunk.length,
          chunkText: chunk.join(', '),
        });
      });
    });
  });

  // --- Handlers ---

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkConflict = (newCourse) => {
    for (const selected of selectedCourses) {
      for (const t1 of newCourse.times) {
        for (const t2 of selected.times) {
          if (t1.day === t2.day) {
            const overlap = t1.periods.some(p => t2.periods.includes(p));
            if (overlap) return selected;
          }
        }
      }
    }
    return null;
  };

  const tryAddCourse = (courseId) => {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    if (selectedCourses.some(c => c.id === course.id)) {
      showToast('⚠️ 這堂課已經在課表裡囉！', 'error');
      return;
    }

    const conflict = checkConflict(course);
    if (conflict) {
      showToast(`🚫 衝堂警告：與【${conflict.name}】時間重疊！`, 'error');
      return;
    }

    setSelectedCourses(prev => [...prev, course]);
    showToast(`✅ 成功加入 ${course.name}`, 'success');
  };

  const handleDragStart = (event, courseId) => {
    event.dataTransfer.setData('courseId', courseId);
  };

  const handleDropToSchedule = (event) => {
    event.preventDefault();
    const courseId = event.dataTransfer.getData('courseId');
    if (courseId) tryAddCourse(courseId);
  };

  const removeCourse = (courseId) => {
    setSelectedCourses(selectedCourses.filter(c => c.id !== courseId));
  };

  const autoLoadRequired = () => {
    const requiredCourses = filteredCourses.filter(c => c.type === '必修');
    let addedCount = 0;
    const newSelected = [...selectedCourses];

    requiredCourses.forEach(reqCourse => {
      if (!newSelected.some(c => c.id === reqCourse.id)) {
        let conflict = false;
        for (const selected of newSelected) {
          for (const t1 of reqCourse.times) {
            for (const t2 of selected.times) {
              if (t1.day === t2.day && t1.periods.some(p => t2.periods.includes(p))) {
                conflict = true;
              }
            }
          }
        }
        if (!conflict) {
          newSelected.push(reqCourse);
          addedCount += 1;
        }
      }
    });

    if (addedCount > 0) {
      setSelectedCourses(newSelected);
      showToast(`✅ 已自動帶入 ${addedCount} 堂必修課！`, 'success');
    } else {
      showToast('💡 必修課都已在課表內，或因衝堂無法加入！', 'success');
    }
  };

  const handleExportPDF = async () => {
    if (selectedCourses.length === 0) {
      showToast('⚠️ 課表目前是空的，請先加入課程再匯出喔！', 'error');
      return;
    }

    setIsExporting(true);
    showToast('⏳ 正在產生 PDF，這可能需要幾秒鐘...', 'success');

    const element = pdfRef.current;
    const originalClassName = element.className;

    element.className = 'absolute top-0 left-0 w-[950px] font-sans z-[-1]';

    try {
      const page1 = document.getElementById('pdf-page-1');
      const page2 = document.getElementById('pdf-page-2');

      const opt = {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 950,
      };

      const canvas1 = await html2canvas(page1, opt);
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.98);

      const canvas2 = await html2canvas(page2, opt);
      const imgData2 = canvas2.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const pdfHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
      pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight1);

      pdf.addPage();
      const pdfHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
      pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight2);

      pdf.save('我的專屬課表.pdf');

      showToast('✅ PDF 匯出成功！', 'success');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showToast('❌ PDF 匯出失敗，請稍後再試。', 'error');
    } finally {
      element.className = originalClassName;
      setIsExporting(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (selectedCourses.length === 0) {
      showToast('⚠️ 請先加入課程再進行健檢喔！', 'error');
      return;
    }

    setAiModalOpen(true);
    setAiLoading(true);
    setAiResult('');

    const courseList = selectedCourses.map(c => `- [${c.id}] ${c.name} (${c.type}, ${c.credits}學分, 星期${c.times[0].day} 第${c.times[0].periods.join(',')}節)`).join('\n');

    const attemptFetch = async (retries, delay) => {
      try {
        const res = await fetch('/api/ai-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseList }),
        });
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        return data.text || '哎呀，分析失敗了，AI 腦袋當機中 🤯';
      } catch (err) {
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptFetch(retries - 1, delay * 2);
      }
    };

    try {
      const text = await attemptFetch(3, 1000);
      setAiResult(text);
    } catch (err) {
      setAiResult('很抱歉，AI 暫時無法連線，請稍後再試！');
    } finally {
      setAiLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    const html = text
      .replace(/### (.*)/g, '<h3 class="text-xl font-bold text-purple-800 mt-6 mb-3 border-b border-purple-100 pb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-900">$1</strong>')
      .replace(/\n- (.*)/g, '<li class="ml-5 text-slate-700 my-1 list-disc">$1</li>')
      .replace(/\n/g, '<br />');
    return { __html: html };
  };

  const hasDeptRequired = selectedDept && filteredCourses.some(c => c.type === '必修');

  return (
    <>
      <div className="flex flex-col md:flex-row h-[100dvh] bg-slate-50 font-sans overflow-hidden">
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full shadow-lg font-bold text-white text-sm md:text-base transition-all transform animate-in slide-in-from-top-4 w-11/12 max-w-sm text-center ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
            {toast.message}
          </div>
        )}

        {/* 左側：課程選擇區 */}
        <div className="w-full md:w-1/3 lg:w-1/4 h-[40dvh] md:h-full flex flex-col bg-white border-b md:border-b-0 md:border-r border-slate-200 shadow-sm z-10 shrink-0">
          <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-800 text-white shrink-0">
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> 課程資料庫
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 flex items-center gap-1">
              <Pointer className="w-3 h-3 md:hidden" /> 點擊課程直接加入課表
            </p>
            {/* 系所選擇器 */}
            <div className="mt-2">
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                <option value="">— 請選擇系所 —</option>
                {deptList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            {selectedDept && !coursesLoading && (
              <p className="text-slate-400 text-xs mt-1">
                共 {filteredCourses.length} 門課程
              </p>
            )}
          </div>

          <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto shrink-0 scrollbar-hide">
            {availableTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 md:py-3 px-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50 pb-6">
            {coursesLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Sparkles className="w-8 h-8 animate-spin mb-3" />
                <p className="font-bold text-sm">載入課程資料中…</p>
              </div>
            ) : !selectedDept ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center px-4">
                <BookOpen className="w-10 h-10 mb-3 opacity-40" />
                <p className="font-bold text-sm">請先選擇系所</p>
                <p className="text-xs mt-1 text-slate-400">從上方下拉選單選擇你的系所</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center px-4">
                <p className="font-bold text-sm">此分類無課程</p>
              </div>
            ) : (
              filteredGroups.map(group => (
                <CourseCard
                  key={group.sections[0].id}
                  group={group}
                  selectedCourses={selectedCourses}
                  onAdd={tryAddCourse}
                  onDragStart={handleDragStart}
                />
              ))
            )}
          </div>
        </div>

        {/* 右側：課表區 */}
        <div className="w-full md:w-2/3 lg:w-3/4 h-[60dvh] md:h-full flex flex-col bg-slate-100 relative z-20 shrink-0 md:shrink">
          {/* 工具列 */}
          <div className="p-3 md:p-4 bg-white border-b border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-3 shrink-0 relative z-30">
            <div className="flex items-center justify-between w-full lg:w-auto gap-4">
              <h2 className="text-lg md:text-xl font-black text-slate-800 shrink-0">我的專屬課表</h2>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-xs md:text-sm shrink-0">
                {totalCredits} 學分
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              {/* PDF 匯出按鈕 */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1 md:gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-2 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-all shadow-sm transform hover:scale-105 whitespace-nowrap disabled:opacity-70 disabled:hover:scale-100"
              >
                {isExporting ? <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                匯出 PDF
              </button>

              <button
                onClick={handleAIAnalysis}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1 md:gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-2 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-all shadow-sm transform hover:scale-105 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /> AI 健檢
              </button>

              {/* 一鍵必修 */}
              {hasDeptRequired && (
                <button
                  onClick={autoLoadRequired}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-1 md:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-2 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> 一鍵必修
                </button>
              )}
            </div>
          </div>

          {/* 課表網格 (主畫面) */}
          <div
            className="flex-1 overflow-auto p-2 sm:p-4 md:p-6"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropToSchedule}
          >
            <div className="min-w-[700px] md:min-w-[800px] min-h-[750px] bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200 relative">
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: '50px repeat(5, 1fr)',
                  gridTemplateRows: '40px repeat(10, minmax(60px, 1fr))',
                }}
              >
                <div className="border-b border-r border-slate-100 bg-slate-50 rounded-tl-xl md:rounded-tl-2xl" style={{ gridColumn: 1, gridRow: 1 }}></div>

                {dayNames.map((day, idx) => (
                  <div key={day} className={`border-b border-r border-slate-100 bg-slate-50 flex items-center justify-center font-bold text-slate-600 text-sm md:text-base ${idx === 4 ? 'rounded-tr-xl md:rounded-tr-2xl' : ''}`} style={{ gridColumn: idx + 2, gridRow: 1 }}>
                    {day}
                  </div>
                ))}

                {periods.map(period => (
                  <React.Fragment key={period}>
                    <div className={`border-b border-r border-slate-100 bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-xs md:text-sm ${period === 10 ? 'rounded-bl-xl md:rounded-bl-2xl border-b-0' : ''}`} style={{ gridColumn: 1, gridRow: period + 1 }}>
                      第{period}節
                    </div>
                    {[1, 2, 3, 4, 5].map(day => (
                      <div
                        key={`${day}-${period}`}
                        className={`border-b border-r border-slate-50 bg-white ${period === 10 ? 'border-b-0' : ''} ${period === 10 && day === 5 ? 'rounded-br-xl md:rounded-br-2xl' : ''}`}
                        style={{ gridColumn: day + 1, gridRow: period + 1 }}
                      ></div>
                    ))}
                  </React.Fragment>
                ))}

                {scheduleBlocks.map((block, idx) => {
                  const isRequired = block.type === '必修';
                  const isBackupReq = block.type === '備用必修';
                  const isEduReq = block.type === '教必';
                  const isGeneral = block.type === '通識';
                  const isGenReq = block.type === '通必';
                  const isMilitary = block.type === '兵役';
                  const isOther = block.type === '其他';
                  const isEduElective = block.type === '教選';

                  return (
                    <div
                      key={`${block.id}-${idx}`}
                      className="p-1 z-10"
                      style={{
                        gridColumn: block.day + 1,
                        gridRow: `${block.startPeriod + 1} / span ${block.length}`,
                      }}
                    >
                      <div className={`relative h-full w-full rounded-md md:rounded-lg p-1.5 md:p-2 border shadow-sm flex flex-col group overflow-hidden ${
                        isRequired ? 'bg-indigo-50 border-indigo-200 text-indigo-900' :
                        isBackupReq ? 'bg-amber-50 border-amber-200 text-amber-900' :
                        isEduReq ? 'bg-teal-50 border-teal-200 text-teal-900' :
                        isGeneral ? 'bg-purple-50 border-purple-200 text-purple-900' :
                        isGenReq ? 'bg-violet-50 border-violet-200 text-violet-900' :
                        isMilitary ? 'bg-slate-100 border-slate-300 text-slate-800' :
                        isOther ? 'bg-rose-50 border-rose-200 text-rose-900' :
                        isEduElective ? 'bg-cyan-50 border-cyan-200 text-cyan-900' :
                        'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}>
                        <div className="font-bold text-[10px] md:text-xs mb-0.5 opacity-80">[{block.id}]</div>
                        <div className="font-bold text-[11px] md:text-sm leading-tight mb-0.5 md:mb-1 break-words line-clamp-2 md:line-clamp-none pr-4">{block.name}</div>

                        {block.note && (
                          <div className={`text-[10px] md:text-xs font-bold inline-block px-1 md:px-1.5 py-0.5 rounded mb-1 w-fit ${
                            block.note === '本系時段' ? 'bg-blue-100/80 text-blue-800' :
                            block.note === '跨系二階' ? 'bg-orange-100/80 text-orange-800' :
                            'bg-slate-100/80 text-slate-700'
                          }`}>
                            {block.note === '跨系二階' ? '跨班時段' : block.note}
                          </div>
                        )}

                        <div className="text-[10px] md:text-xs opacity-70 mb-auto line-clamp-1">{block.location}</div>

                        <button
                          onClick={(event) => { event.stopPropagation(); removeCourse(block.id); }}
                          className="absolute top-1 right-1 p-1 bg-white/90 backdrop-blur rounded-sm md:rounded-md text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white shadow-sm"
                          title="移除此課程"
                        >
                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedCourses.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                  <div className="w-16 h-16 md:w-24 md:h-24 mb-4 text-slate-200">
                    <BookOpen className="w-full h-full" />
                  </div>
                  <p className="text-lg md:text-xl font-bold text-slate-300">將左側課程拖曳至此處</p>
                  <p className="text-xs md:text-sm text-slate-400 mt-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    <span className="md:hidden">💡 手機版可以直接點擊左側課程加入喔！</span>
                    <span className="hidden md:inline">或選擇系所後點擊「一鍵必修」快速開始</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 隱藏的 PDF 渲染版面 */}
      <div
        ref={pdfRef}
        className="fixed left-[-9999px] top-[-9999px] w-[950px] font-sans z-[-1]"
      >
        {/* 第 1 頁：課表 */}
        <div id="pdf-page-1" className="w-full pb-4 bg-white p-8">
          <h1 className="text-3xl font-black text-center mb-6 text-slate-800 tracking-wider">我的專屬課表</h1>

          <div
            className="grid border-2 border-slate-800"
            style={{
              gridTemplateColumns: '60px repeat(5, 1fr)',
              gridTemplateRows: '50px repeat(10, 85px)',
            }}
          >
            <div className="border-b-2 border-r-2 border-slate-800 bg-slate-200" style={{ gridColumn: 1, gridRow: 1 }}></div>
            {dayNames.map((day, idx) => (
              <div key={day} className="border-b-2 border-r-2 border-slate-800 bg-slate-200 flex items-center justify-center font-bold text-lg" style={{ gridColumn: idx + 2, gridRow: 1 }}>
                {day}
              </div>
            ))}

            {periods.map(period => (
              <React.Fragment key={`pdf-p${period}`}>
                <div className="border-b border-r-2 border-slate-800 bg-slate-100 flex items-center justify-center font-bold text-base" style={{ gridColumn: 1, gridRow: period + 1 }}>
                  第{period}節
                </div>
                {[1, 2, 3, 4, 5].map(day => (
                  <div
                    key={`pdf-${day}-${period}`}
                    className="border-b border-r border-slate-300"
                    style={{ gridColumn: day + 1, gridRow: period + 1 }}
                  ></div>
                ))}
              </React.Fragment>
            ))}

            {/* Course Blocks for PDF */}
            {scheduleBlocks.map((block, idx) => {
              const isRequired = block.type === '必修';
              const isBackupReq = block.type === '備用必修';
              const isEduReq = block.type === '教必';
              const isGeneral = block.type === '通識';
              const isGenReq = block.type === '通必';
              const isMilitary = block.type === '兵役';
              const isOther = block.type === '其他';
              const isEduElective = block.type === '教選';

              const bgColor = isRequired ? '#eef2ff'
                : isBackupReq ? '#fffbeb'
                : isEduReq ? '#f0fdfa'
                : isGeneral ? '#faf5ff'
                : isGenReq ? '#f5f3ff'
                : isMilitary ? '#f1f5f9'
                : isOther ? '#fff1f2'
                : isEduElective ? '#ecfeff'
                : '#ecfdf5';

              const borderColor = isRequired ? '#c7d2fe'
                : isBackupReq ? '#fde68a'
                : isEduReq ? '#99f6e4'
                : isGeneral ? '#e9d5ff'
                : isGenReq ? '#ddd6fe'
                : isMilitary ? '#cbd5e1'
                : isOther ? '#fecdd3'
                : isEduElective ? '#a5f3fc'
                : '#a7f3d0';

              return (
                <div
                  key={`pdf-${block.id}-${idx}`}
                  className="p-1 z-10"
                  style={{
                    gridColumn: block.day + 1,
                    gridRow: `${block.startPeriod + 1} / span ${block.length}`,
                  }}
                >
                  <div
                    className="h-full w-full rounded flex flex-col justify-center items-center text-center shadow-sm p-2"
                    style={{ backgroundColor: bgColor, border: `2px solid ${borderColor}` }}
                  >
                    <div className="font-bold text-xs text-slate-700 opacity-90 mb-1">[{block.id}]</div>
                    <div className="font-bold text-[15px] text-slate-900 leading-tight mb-1">{block.name}</div>

                    {block.note && (
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${
                        block.note === '本系時段' ? 'bg-blue-100 text-blue-800' :
                        block.note === '跨系二階' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {block.note === '跨系二階' ? '跨班時段' : block.note}
                      </div>
                    )}

                    <div className="text-sm font-medium text-slate-700">{block.instructor}</div>
                    <div className="text-sm font-medium text-slate-700 mt-0.5">{block.location}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 第 2 頁：詳細資訊清單 */}
        <div id="pdf-page-2" className="w-full bg-white p-8 pt-4">
          <h1 className="text-3xl font-black text-center mb-6 text-slate-800 tracking-wider">各課程詳細資訊</h1>
          <table className="w-full border-collapse border-2 border-slate-800 text-[15px]">
            <thead>
              <tr className="bg-slate-200 border-b-2 border-slate-800">
                <th className="border-r-2 border-slate-800 p-3 text-left font-bold w-[12%]">代號</th>
                <th className="border-r-2 border-slate-800 p-3 text-left font-bold w-[25%]">課程名稱</th>
                <th className="border-r-2 border-slate-800 p-3 text-left font-bold w-[13%]">類別</th>
                <th className="border-r-2 border-slate-800 p-3 text-left font-bold w-[8%]">學分</th>
                <th className="border-r-2 border-slate-800 p-3 text-left font-bold w-[12%]">授課教師</th>
                <th className="border-r-2 border-slate-800 p-3 text-left font-bold w-[15%]">時間</th>
                <th className="p-3 text-left font-bold w-[15%]">教室</th>
              </tr>
            </thead>
            <tbody>
              {selectedCourses.length > 0 ? selectedCourses.map(course => (
                <tr key={course.id} className="border-b border-slate-400">
                  <td className="border-r border-slate-400 p-3 font-mono font-bold text-slate-700">{course.id}</td>
                  <td className="border-r border-slate-400 p-3 font-bold">{course.name}</td>
                  <td className="border-r border-slate-400 p-3 text-slate-700 font-medium">{course.type}</td>
                  <td className="border-r border-slate-400 p-3 text-center font-medium">{course.credits}</td>
                  <td className="border-r border-slate-400 p-3 text-slate-700">{course.instructor}</td>
                  <td className="border-r border-slate-400 p-3 text-slate-700">{formatTimes(course.times)}</td>
                  <td className="p-3 text-slate-700">{course.location}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-bold">目前無選修課程</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-8 text-right text-slate-500 font-medium">
            總計學分：<span className="font-bold text-slate-800 text-lg">{totalCredits}</span> 學分
          </div>
        </div>
      </div>

      {/* AI 健檢分析 Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 md:p-5 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2 md:gap-3 font-bold text-base md:text-lg">
                <Bot className="w-5 h-5 md:w-6 md:h-6" />
                <span>AI 學長姐分析報告</span>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50/50 text-sm md:text-base">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-purple-600">
                  <Sparkles className="w-10 h-10 md:w-12 md:h-12 animate-spin-slow mb-4" />
                  <p className="font-bold text-base md:text-lg animate-pulse text-center">正在召喚學長姐看課表...</p>
                  <p className="text-xs md:text-sm text-purple-400 mt-2">馬上為你生成專屬分析 ✨</p>
                </div>
              ) : (
                <div
                  className="prose prose-purple max-w-none text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={renderMarkdown(aiResult)}
                />
              )}
            </div>

            <div className="p-3 md:p-4 bg-white border-t border-slate-100 shrink-0">
              <button
                onClick={() => setAiModalOpen(false)}
                className="w-full py-2.5 md:py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors shadow-sm active:scale-95 text-sm md:text-base"
              >
                收到！我準備好了 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 課表更新通知彈窗（第一個彈出，每次有新推送即更新內容） */}
      {updateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 flex flex-col items-center text-white shrink-0 relative">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3 shadow-lg -rotate-3">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">課表更新通知 🎉</h2>
              <p className="text-sky-100 text-sm mt-1">2026-06-03 更新</p>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">新增通識課程跨班時段</h4>
                  <p className="text-slate-500 text-sm mt-0.5">
                    人社院 <span className="font-bold text-orange-600">週一 第 1、2 節</span> 共 9 門通識課程，已可加入課表。
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                {[
                  { id: '2299', name: '人與當代社會的建構', cat: '永續與在地', loc: '主顧222' },
                  { id: '2300', name: '社會學思考與在地議題分析', cat: '永續與在地', loc: '思源423' },
                  { id: '2524', name: '臺灣原住民文化與創意設計', cat: '永續與在地', loc: '主顧102' },
                  { id: '2303', name: '哲學的傳統與現在', cat: '宗教與思維', loc: '思源427' },
                  { id: '2304', name: '宗教情操的社會關懷', cat: '宗教與思維', loc: '主顧301' },
                  { id: '2305', name: '無人機生態影像解析', cat: '科技與服務', loc: '任垣403' },
                  { id: '2306', name: '自說自話——編輯有意思', cat: '跨域與設計', loc: '思源429' },
                  { id: '2307', name: '音像詮釋so easy', cat: '跨域與設計', loc: '主顧104' },
                  { id: '2308', name: '書畫與創意設計的美感探索', cat: '跨域與設計', loc: '任垣305' },
                ].map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">{c.id}</span>
                    <span className="text-sm font-bold text-slate-800 leading-tight flex-1">{c.name}</span>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">{c.loc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => {
                  sessionStorage.setItem('updateModalDismissed', '1');
                  setUpdateModalOpen(false);
                  setGuideModalOpen(true);
                }}
                className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                下一步 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 使用說明彈窗 */}
      {guideModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-800 p-6 flex flex-col items-center text-white shrink-0 relative">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg rotate-3">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">歡迎使用課表小幫手 ✨</h2>
              <p className="text-slate-400 text-sm mt-1">輕鬆安排你的大學新生活</p>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Pointer className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">快速加入課程</h4>
                    <p className="text-slate-500 text-sm mt-0.5">點擊左側課程卡片或「拖曳」至右側課表，即可輕鬆排入時段。</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <GripVertical className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">班級快速切換 (Tabs)</h4>
                    <p className="text-slate-500 text-sm mt-0.5">相同課程的不同班級已自動合併，點擊卡片內的頁籤即可切換班級與代碼。</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">高品質 PDF 匯出</h4>
                    <p className="text-slate-500 text-sm mt-0.5">一鍵產生精美的兩頁式 PDF，包含彩色網格課表與詳細課程清單。</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">AI 智慧健檢</h4>
                    <p className="text-slate-500 text-sm mt-0.5">由 AI 學長姐為你分析課表戰力，並給予幽默的生存建議與提醒。</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">衝堂偵測與提示</h4>
                    <p className="text-slate-500 text-sm mt-0.5">系統會自動偵測時間重疊；重補修課程設有特殊閃爍標籤，提醒加退選時段。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => {
                  setGuideModalOpen(false);
                  setDisclaimerModalOpen(true);
                }}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                下一步 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 免責聲明與學分提醒彈窗 */}
      {disclaimerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-amber-500 p-6 flex flex-col items-center text-white shrink-0 relative">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3 shadow-sm rotate-3">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">使用前注意事項 ⚠️</h2>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">系統僅供參考</h4>
                    <p className="text-slate-500 text-sm mt-0.5">本系統所提供之課程資訊如有錯誤，排課結果與選課規則仍以學校官方公告為準，作者不負任何責任喔～</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">畢業學分提醒</h4>
                    <p className="text-slate-500 text-sm mt-0.5">人工智慧應用學系除本系 85 學分（校訂＋專業必修）外，還需修習 <span className="font-bold text-rose-600">選修學分至少 43 學分以上</span> 才能畢業！</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setDisclaimerModalOpen(false)}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                我瞭解了，開始排課！
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
