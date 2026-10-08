import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModuleSyllabus, distributeMinutes } from '../lib/syllabus-document.ts';
const sample = `Course Title Entrepreneurship\nCourse Code BEC501 CIE Marks 50\n(L: T: P) + SL (3: 2: 0) + 45 Hours/Sem SEE Marks 50\nCredits 4 Exam Hours 3\nSEMESTER - V\n` + Array.from({length:5},(_,i)=>`Module-${i+1} Module title ${i+1} 9 hrs\nManagement: Planning, Organizing, Staffing; Leadership. (Selected topics from Chapter 1, Text 1).\n`).join('') + 'Course Outcomes:\nCO1 Apply management concepts.\nAssessment Details:\nCIE 50.\nText Books:\nSource title.';
test('45 SL header is not added to five nine-hour modules',()=>{
  const d=parseModuleSyllabus(sample);assert.ok(d);assert.equal(d.units.length,5);assert.equal(d.metadata.moduleMinutes.reduce((n,u)=>n+u.minutes,0),2700);assert.match(d.metadata.hoursLabel,/45 Hours\/Sem/);assert.equal(d.metadata.courseCode,'BEC501');
});
test('topic minute allocation preserves every module total exactly',()=>{
  for(const count of [1,7,28,93]){const n=distributeMinutes(540,count);assert.equal(n.reduce((a,b)=>a+b,0),540);assert.ok(n.every(x=>Number.isInteger(x)&&x>0));}
});
test('source details retained, outcomes and books not treated as topics',()=>{
  const d=parseModuleSyllabus(sample);assert.match(d.metadata.text,/CO1 Apply/);assert.match(d.metadata.text,/CIE 50/);assert.ok(d.units.every(u=>u.topics.every(t=>!/(?:CO1|Assessment|Text Books|Selected topics)/.test(t.title))));
});
test('does not infer module hours from credits or marks',()=>{assert.equal(parseModuleSyllabus('Credits 4 Marks 50 Module-1 Planning\nIntroduction'),null);});
test('keeps MSME phrases and act years together',()=>{const d=parseModuleSyllabus('Module-1 MSME 9 hrs\nMicro, Small, and Medium Enterprises: The MSMED Act, 2006, Government Policy.\nCourse Outcomes: CO1');assert.ok(d.units[0].topics.some(t=>t.title.includes('The MSMED Act, 2006')));assert.ok(d.units[0].topics.every(t=>t.title.length>5));});
test('continued module text survives page furniture',()=>{const d=parseModuleSyllabus('Module-1 Leadership 9 hrs\nLeadership: Meaning,\nRNS Institute of Technology Page 1\nRN Shetty Trust ®\nDepartment of Electronics and Communication\nEngineering\nAutonomous Scheme (Effective from 2024)\nCharacteristics, Behavioural Approach.\nCourse Outcomes: CO1');assert.ok(d.units[0].topics.some(t=>t.title.includes('Behavioural Approach')));assert.ok(d.units[0].topics.every(t=>!t.title.includes('Trust')));});
