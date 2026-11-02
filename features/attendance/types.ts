/**
 * Attendance Domain Types
 */

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  subject: string;
  attended: number;
  total: number;
  updated_at?: string;
  updated_by?: string | null;
}

export interface SubjectAttendanceStat {
  subject: string;
  attended: number;
  total: number;
  percentage: number;
  isShortage: boolean;
  requiredClassesToClear: number;
  safeClassesToMiss: number;
}

export interface AttendanceSummary {
  overallPercentage: number;
  totalAttended: number;
  totalClasses: number;
  shortageSubjectsCount: number;
  hasShortage: boolean;
}
