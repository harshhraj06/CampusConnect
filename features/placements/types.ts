/**
 * Placement Domain Types
 */

export type ApplicationStage =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Assessment'
  | 'Interview'
  | 'On Hold'
  | 'Offered'
  | 'Accepted'
  | 'Rejected';

export interface PlacementDrive {
  id: string;
  company: string;
  role_title: string;
  compensation: string;
  deadline: string;
  match_score?: number;
  logo_label?: string;
  location?: string;
  work_mode?: 'On-site' | 'Remote' | 'Hybrid';
  employment_type?: 'Full-time' | 'Internship' | 'Contract';
  minimum_cgpa: number;
  branches: string[];
  skills: string[];
  about?: string;
  rounds: string[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface PlacementApplication {
  id: string;
  student_id: string;
  student_name: string;
  company: string;
  role_title: string;
  status: ApplicationStage;
  next_step: string;
  applied_at: string;
  updated_at: string;
}

export interface CandidateEligibility {
  isEligible: boolean;
  cgpaSatisfied: boolean;
  branchSatisfied: boolean;
  matchPercentage: number;
  unmetCriteria: string[];
}
