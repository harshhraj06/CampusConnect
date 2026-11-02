import type { AttendanceRecord, SubjectAttendanceStat, AttendanceSummary } from '../types';

export const MANDATORY_ATTENDANCE_PERCENTAGE = 75;

/**
 * Computes individual subject statistics including shortage and needed/safe classes.
 */
export function calculateSubjectStat(
  subject: string,
  attended: number,
  total: number,
  targetPercentage = MANDATORY_ATTENDANCE_PERCENTAGE
): SubjectAttendanceStat {
  const safeAttended = Math.max(0, attended);
  const safeTotal = Math.max(safeAttended, total);

  if (safeTotal === 0) {
    return {
      subject,
      attended: 0,
      total: 0,
      percentage: 100,
      isShortage: false,
      requiredClassesToClear: 0,
      safeClassesToMiss: 0,
    };
  }

  const rawPercentage = (safeAttended / safeTotal) * 100;
  const percentage = Math.round(rawPercentage * 10) / 10;
  const isShortage = percentage < targetPercentage;

  let requiredClassesToClear = 0;
  let safeClassesToMiss = 0;

  if (isShortage) {
    // Formula: (attended + x) / (total + x) >= target / 100
    // => x * (1 - target/100) >= (target/100 * total) - attended
    const targetFrac = targetPercentage / 100;
    const numerator = targetFrac * safeTotal - safeAttended;
    const denominator = 1 - targetFrac;
    requiredClassesToClear = Math.max(0, Math.ceil(numerator / denominator));
  } else {
    // Formula: attended / (total + y) >= target / 100
    // => total + y <= attended / (target/100)
    // => y <= (attended / targetFrac) - total
    const targetFrac = targetPercentage / 100;
    const maxTotalAllowed = Math.floor(safeAttended / targetFrac);
    safeClassesToMiss = Math.max(0, maxTotalAllowed - safeTotal);
  }

  return {
    subject,
    attended: safeAttended,
    total: safeTotal,
    percentage,
    isShortage,
    requiredClassesToClear,
    safeClassesToMiss,
  };
}

/**
 * Computes campus-wide or student-wide overall attendance summary.
 */
export function calculateAttendanceSummary(
  records: AttendanceRecord[],
  targetPercentage = MANDATORY_ATTENDANCE_PERCENTAGE
): AttendanceSummary {
  if (!records || records.length === 0) {
    return {
      overallPercentage: 100,
      totalAttended: 0,
      totalClasses: 0,
      shortageSubjectsCount: 0,
      hasShortage: false,
    };
  }

  let totalAttended = 0;
  let totalClasses = 0;
  let shortageCount = 0;

  for (const record of records) {
    const stat = calculateSubjectStat(record.subject, record.attended, record.total, targetPercentage);
    totalAttended += stat.attended;
    totalClasses += stat.total;
    if (stat.isShortage) {
      shortageCount++;
    }
  }

  const overallPercentage =
    totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 1000) / 10 : 100;

  return {
    overallPercentage,
    totalAttended,
    totalClasses,
    shortageSubjectsCount: shortageCount,
    hasShortage: shortageCount > 0 || overallPercentage < targetPercentage,
  };
}
