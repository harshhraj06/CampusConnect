-- =========================================================
-- CAMPUSCONNECT
-- PLACEMENT CELL READ-ONLY STUDENT RESUME ACCESS
-- =========================================================

-- Student resumes
drop policy if exists
"Placement team read student resumes"
on public.student_resumes;

create policy
"Placement team read student resumes"
on public.student_resumes
for select
to authenticated
using (
  public.can_manage_placements()
);


-- Resume projects
drop policy if exists
"Placement team read resume projects"
on public.resume_projects;

create policy
"Placement team read resume projects"
on public.resume_projects
for select
to authenticated
using (
  public.can_manage_placements()
);


-- Resume experience
drop policy if exists
"Placement team read resume experience"
on public.resume_experience;

create policy
"Placement team read resume experience"
on public.resume_experience
for select
to authenticated
using (
  public.can_manage_placements()
);


-- Resume achievements
drop policy if exists
"Placement team read resume achievements"
on public.resume_achievements;

create policy
"Placement team read resume achievements"
on public.resume_achievements
for select
to authenticated
using (
  public.can_manage_placements()
);


-- Resume certifications
drop policy if exists
"Placement team read resume certifications"
on public.resume_certifications;

create policy
"Placement team read resume certifications"
on public.resume_certifications
for select
to authenticated
using (
  public.can_manage_placements()
);


-- Resume custom links
drop policy if exists
"Placement team read resume links"
on public.resume_custom_links;

create policy
"Placement team read resume links"
on public.resume_custom_links
for select
to authenticated
using (
  public.can_manage_placements()
);
