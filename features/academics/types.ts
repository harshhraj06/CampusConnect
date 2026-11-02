/**
 * Academic Domain Types
 */

export interface CourseGrade {
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  gradePoint: number;
}

export interface SemesterRecord {
  semester: number | string;
  sgpa: number;
  totalCredits: number;
  courses: CourseGrade[];
}

export interface AcademicStanding {
  cgpa: number;
  percentageEquivalent: number;
  totalCreditsEarned: number;
  hasActiveBacklogs: boolean;
  backlogCount: number;
  classification: 'First Class with Distinction' | 'First Class' | 'Second Class' | 'Pass Class' | 'Fail';
}
