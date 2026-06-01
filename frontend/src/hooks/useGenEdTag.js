const DIMENSION_COLORS = {
  '生命智慧': '#e74c3c',
  '人文美學': '#9b59b6',
  '社會洞察': '#3498db',
  '自然科學': '#27ae60',
  '宗教與思維': '#e67e22',
  '永續與在地': '#2ecc71',
  '跨域與設計': '#1abc9c',
  '科技與服務': '#f39c12',
};

/**
 * Get the gen-ed dimension tag info for a course.
 * @param {Object} course
 * @returns {{ label: string, color: string } | null}
 */
export function getGenEdTag(course) {
  if (!course.dimension) return null;
  return {
    label: course.dimension,
    color: DIMENSION_COLORS[course.dimension] || '#a0a0b0',
  };
}
