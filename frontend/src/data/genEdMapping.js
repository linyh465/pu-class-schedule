/**
 * 115 新制通識學分需求
 * 4 向度，每向度至少 2 學分、至多 6 學分，合計 16 學分
 */
export const CREDIT_REQ_NEW = [
  { key: '生命智慧', label: '生命智慧', min: 2, max: 6 },
  { key: '人文美學', label: '人文美學', min: 2, max: 6 },
  { key: '社會洞察', label: '社會洞察', min: 2, max: 6 },
  { key: '自然科學', label: '自然科學', min: 2, max: 6 },
];

/**
 * 114 以前舊制通識學分需求
 * 4 向度，各有不同最低學分，合計 16 學分
 */
export const CREDIT_REQ_OLD = [
  { key: '永續與在地', label: '永續與在地', min: 4, max: 8 },
  { key: '宗教與思維', label: '宗教與思維', min: 2, max: 8 },
  { key: '科技與服務', label: '科技與服務', min: 2, max: 8 },
  { key: '跨域與設計', label: '跨域與設計', min: 4, max: 8 },
];

/**
 * 舊制學生選到新制課程時的向度對應表
 * 新制向度 → 舊制向度
 */
export const OLD_TO_NEW_MAP = {
  '生命智慧': '宗教與思維',
  '人文美學': '永續與在地',
  '社會洞察': '永續與在地',
  '自然科學': '科技與服務',
};

/**
 * 通識學分總需求
 */
export const GEN_ED_TOTAL = 16;
