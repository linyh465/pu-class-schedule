/**
 * Check if two courses have a time conflict.
 * @param {Object} courseA - First course object
 * @param {Object} courseB - Second course object
 * @returns {boolean} true if there is a time conflict
 */
export function detectConflict(courseA, courseB) {
  if (!courseA.times || !courseB.times) return false;

  for (const timeA of courseA.times) {
    for (const timeB of courseB.times) {
      if (timeA.day === timeB.day) {
        const periodsA = new Set(timeA.periods);
        for (const p of timeB.periods) {
          if (periodsA.has(p)) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Find all conflicts between a candidate course and a set of selected courses.
 * @param {Object} candidate - The course to check
 * @param {Array} selectedCourses - Array of currently selected course objects
 * @returns {Array} Array of conflicting course objects
 */
export function getAllConflicts(candidate, selectedCourses) {
  return selectedCourses.filter((sc) => detectConflict(candidate, sc));
}
