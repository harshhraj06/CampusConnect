import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSubjectStat,
  calculateAttendanceSummary,
} from '../features/attendance/utils/attendance-calculator.ts';

import {
  evaluateEligibility,
} from '../features/placements/utils/eligibility-matcher.ts';

import {
  convertCgpaToPercentage,
  calculateCgpa,
  evaluateAcademicStanding,
} from '../features/academics/utils/cgpa-calculator.ts';

test('Attendance Calculator: calculates correct percentage and shortage detection', () => {
  // Attended 7 out of 10 = 70% -> Shortage (< 75%)
  const stat = calculateSubjectStat('Digital Signal Processing', 7, 10, 75);
  assert.equal(stat.percentage, 70);
  assert.equal(stat.isShortage, true);
  // To reach 75%: (7 + x) / (10 + x) >= 0.75 => 7 + x >= 7.5 + 0.75x => 0.25x >= 0.5 => x >= 2 classes
  assert.equal(stat.requiredClassesToClear, 2);
  assert.equal(stat.safeClassesToMiss, 0);

  // Attended 9 out of 10 = 90% -> Safe (> 75%)
  const safeStat = calculateSubjectStat('Embedded Systems', 9, 10, 75);
  assert.equal(safeStat.percentage, 90);
  assert.equal(safeStat.isShortage, false);
  assert.equal(safeStat.requiredClassesToClear, 0);
  // Max classes allowed to miss: 9 / (10 + y) >= 0.75 => 10 + y <= 12 => y = 2
  assert.equal(safeStat.safeClassesToMiss, 2);
});

test('Attendance Calculator: aggregate summary across subjects', () => {
  const records = [
    { id: '1', student_id: 's1', student_name: 'Harsh', subject: 'DSP', attended: 7, total: 10 },
    { id: '2', student_id: 's1', student_name: 'Harsh', subject: 'VLSI', attended: 9, total: 10 },
  ];
  const summary = calculateAttendanceSummary(records, 75);
  assert.equal(summary.totalAttended, 16);
  assert.equal(summary.totalClasses, 20);
  assert.equal(summary.overallPercentage, 80);
  assert.equal(summary.shortageSubjectsCount, 1);
  assert.equal(summary.hasShortage, true); // One subject is below 75%
});

test('Placement Eligibility: verifies CGPA and branch match criteria', () => {
  const drive = {
    id: 'd1',
    company: 'Google',
    role_title: 'Software Engineer',
    compensation: '24 LPA',
    deadline: '2026-11-30T00:00:00Z',
    minimum_cgpa: 8.0,
    branches: ['ECE', 'CSE', 'ISE'],
    skills: ['Python', 'Data Structures', 'System Design'],
    rounds: ['OA', 'Technical 1', 'Technical 2', 'HR'],
    created_at: new Date().toISOString(),
  };

  // Eligible candidate
  const eligibleCandidate = {
    cgpa: 8.5,
    department: 'ECE',
    skills: ['Python', 'Data Structures'],
  };
  const result1 = evaluateEligibility(drive, eligibleCandidate);
  assert.equal(result1.isEligible, true);
  assert.equal(result1.cgpaSatisfied, true);
  assert.equal(result1.branchSatisfied, true);
  assert.ok(result1.matchPercentage >= 70);

  // Ineligible candidate (CGPA below threshold)
  const lowCgpaCandidate = {
    cgpa: 7.2,
    department: 'ECE',
    skills: ['Python'],
  };
  const result2 = evaluateEligibility(drive, lowCgpaCandidate);
  assert.equal(result2.isEligible, false);
  assert.equal(result2.cgpaSatisfied, false);
  assert.ok(result2.unmetCriteria.length > 0);
});

test('Academics Calculator: VTU CGPA conversion and honors classification', () => {
  // VTU conversion: (CGPA - 0.75) * 10
  assert.equal(convertCgpaToPercentage(8.75), 80);
  assert.equal(convertCgpaToPercentage(7.75), 70);
  assert.equal(convertCgpaToPercentage(0.5), 0);

  const semesters = [
    {
      semester: 1,
      sgpa: 8.0,
      totalCredits: 20,
      courses: [
        { courseCode: '21MAT11', courseTitle: 'Maths', credits: 4, grade: 'A', gradePoint: 9 },
        { courseCode: '21PHY12', courseTitle: 'Physics', credits: 4, grade: 'B', gradePoint: 8 },
      ],
    },
    {
      semester: 2,
      sgpa: 8.4,
      totalCredits: 20,
      courses: [
        { courseCode: '21MAT21', courseTitle: 'Maths 2', credits: 4, grade: 'A', gradePoint: 9 },
        { courseCode: '21CHE22', courseTitle: 'Chemistry', credits: 4, grade: 'S', gradePoint: 10 },
      ],
    },
  ];

  const cgpa = calculateCgpa(semesters);
  assert.equal(cgpa, 8.2);

  const standing = evaluateAcademicStanding(semesters);
  assert.equal(standing.cgpa, 8.2);
  assert.equal(standing.hasActiveBacklogs, false);
  assert.equal(standing.classification, 'First Class with Distinction');
});
