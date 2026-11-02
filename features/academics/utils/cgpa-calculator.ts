import type { SemesterRecord, AcademicStanding } from '../types';

/**
 * Standard VTU percentage conversion formula:
 * Percentage = (CGPA - 0.75) * 10
 */
export function convertCgpaToPercentage(cgpa: number): number {
  if (cgpa <= 0.75) return 0;
  const raw = (cgpa - 0.75) * 10;
  return Math.min(100, Math.round(raw * 100) / 100);
}

/**
 * Calculates cumulative GPA across all completed semesters.
 */
export function calculateCgpa(semesters: SemesterRecord[]): number {
  if (!semesters || semesters.length === 0) return 0;

  let totalCreditPoints = 0;
  let totalCredits = 0;

  for (const sem of semesters) {
    if (sem.totalCredits > 0) {
      totalCreditPoints += sem.sgpa * sem.totalCredits;
      totalCredits += sem.totalCredits;
    }
  }

  if (totalCredits === 0) return 0;
  return Math.round((totalCreditPoints / totalCredits) * 100) / 100;
}

/**
 * Evaluates academic standing, classification honors, and active backlogs.
 */
export function evaluateAcademicStanding(semesters: SemesterRecord[]): AcademicStanding {
  const cgpa = calculateCgpa(semesters);
  const percentageEquivalent = convertCgpaToPercentage(cgpa);

  let backlogCount = 0;
  let totalCreditsEarned = 0;

  for (const sem of semesters) {
    for (const course of sem.courses) {
      if (course.grade === 'F') {
        backlogCount++;
      } else {
        totalCreditsEarned += course.credits;
      }
    }
  }

  let classification: AcademicStanding['classification'] = 'Pass Class';
  if (cgpa >= 7.75 && backlogCount === 0) {
    classification = 'First Class with Distinction';
  } else if (cgpa >= 6.75) {
    classification = 'First Class';
  } else if (cgpa >= 5.75) {
    classification = 'Second Class';
  } else if (cgpa < 5.0 || backlogCount > 0) {
    classification = 'Fail';
  }

  return {
    cgpa,
    percentageEquivalent,
    totalCreditsEarned,
    hasActiveBacklogs: backlogCount > 0,
    backlogCount,
    classification,
  };
}
