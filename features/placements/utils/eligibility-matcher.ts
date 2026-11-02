import type { PlacementDrive, CandidateEligibility } from '../types';

export interface StudentProfileCriteria {
  cgpa: number;
  department: string;
  skills?: string[];
}

/**
 * Pure evaluator for placement drive eligibility.
 */
export function evaluateEligibility(
  drive: PlacementDrive,
  student: StudentProfileCriteria
): CandidateEligibility {
  const unmetCriteria: string[] = [];

  const cgpaSatisfied = student.cgpa >= drive.minimum_cgpa;
  if (!cgpaSatisfied) {
    unmetCriteria.push(
      `CGPA ${student.cgpa} is below the minimum required ${drive.minimum_cgpa}`
    );
  }

  const branchSatisfied =
    drive.branches.length === 0 ||
    drive.branches.includes('All') ||
    drive.branches.includes(student.department);

  if (!branchSatisfied) {
    unmetCriteria.push(
      `Department ${student.department} is not in the eligible list (${drive.branches.join(', ')})`
    );
  }

  // Calculate skill match score
  let skillMatchRatio = 1;
  if (drive.skills && drive.skills.length > 0 && student.skills && student.skills.length > 0) {
    const studentSkillsLower = new Set(student.skills.map(s => s.toLowerCase().trim()));
    const matchedCount = drive.skills.filter(s =>
      studentSkillsLower.has(s.toLowerCase().trim())
    ).length;
    skillMatchRatio = matchedCount / drive.skills.length;
  }

  // Weighted match percentage: 40% CGPA headroom, 30% branch, 30% skills
  let matchScore = 0;
  if (branchSatisfied) matchScore += 30;
  if (cgpaSatisfied) {
    const headroom = Math.min(2, Math.max(0, student.cgpa - drive.minimum_cgpa));
    matchScore += 30 + Math.round((headroom / 2) * 10);
  }
  matchScore += Math.round(skillMatchRatio * 30);

  return {
    isEligible: cgpaSatisfied && branchSatisfied,
    cgpaSatisfied,
    branchSatisfied,
    matchPercentage: Math.min(100, Math.max(0, matchScore)),
    unmetCriteria,
  };
}
