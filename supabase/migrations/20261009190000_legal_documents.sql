-- CampusConnect legal pages: immutable published snapshots, private drafts, and revisions.
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('privacy', 'terms')),
  title text not null,
  introduction text not null default '',
  sections jsonb not null default '[]'::jsonb,
  meta_description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  current_version integer not null default 1,
  published_version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  draft_title text,
  draft_introduction text,
  draft_sections jsonb,
  draft_meta_description text
);

create table if not exists public.legal_document_revisions (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.legal_documents(id) on delete cascade,
  version integer not null,
  title text not null,
  introduction text not null,
  sections jsonb not null,
  meta_description text not null,
  edited_by uuid references auth.users(id) on delete set null,
  edit_summary text not null default '',
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

-- Also support an earlier manual application of the partial draft migration.
alter table public.legal_documents
  add column if not exists draft_title text,
  add column if not exists draft_introduction text,
  add column if not exists draft_sections jsonb,
  add column if not exists draft_meta_description text,
  add column if not exists published_version integer not null default 1,
  alter column created_by drop not null;
alter table public.legal_document_revisions alter column edited_by drop not null;
alter table public.legal_documents enable row level security;
alter table public.legal_document_revisions enable row level security;
revoke all on public.legal_documents, public.legal_document_revisions from public, anon, authenticated;

-- Policies are deny-by-default unless a future grant is made. Public SQL reads use the published-only RPC.
drop policy if exists "Public read published legal documents" on public.legal_documents;
create policy "Public read published legal documents" on public.legal_documents
  for select to anon, authenticated using (status = 'published');
drop policy if exists "Main Admin read all legal documents" on public.legal_documents;
create policy "Main Admin read all legal documents" on public.legal_documents
  for select to authenticated using (public.current_campus_role() = 'Main Admin');
drop policy if exists "Read legal document revisions" on public.legal_document_revisions;
drop policy if exists "Main Admin read legal document revisions" on public.legal_document_revisions;
create policy "Main Admin read legal document revisions" on public.legal_document_revisions
  for select to authenticated using (public.current_campus_role() = 'Main Admin');
drop policy if exists "Main Admin insert legal document revisions" on public.legal_document_revisions;
drop policy if exists "Main Admin insert legal documents" on public.legal_documents;
drop policy if exists "Main Admin update legal documents" on public.legal_documents;

create or replace function public.get_published_legal_document(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('title', title, 'introduction', introduction,
    'sections', sections, 'meta_description', meta_description,
    'published_at', published_at, 'version', published_version)
  from public.legal_documents
  where slug = p_slug and p_slug in ('privacy', 'terms') and status = 'published'
  limit 1;
$$;
revoke all on function public.get_published_legal_document(text) from public;
grant execute on function public.get_published_legal_document(text) to anon, authenticated;

create or replace function public.get_legal_document_for_admin(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.current_campus_role() is distinct from 'Main Admin'
    or not exists (select 1 from public.profiles p where p.id = auth.uid()
      and coalesce(p.account_status::text, 'Active') = 'Active') then
    raise exception 'Active Main Admin permission required' using errcode = '42501';
  end if;
  return (select jsonb_build_object('id', id, 'slug', slug,
    'title', coalesce(draft_title, title),
    'introduction', coalesce(draft_introduction, introduction),
    'sections', coalesce(draft_sections, sections),
    'meta_description', coalesce(draft_meta_description, meta_description),
    'status', case when draft_title is null then status else 'draft' end,
    'current_version', current_version, 'published_version', published_version,
    'published_at', published_at,
    'published_by', published_by)
    from public.legal_documents where slug = p_slug and p_slug in ('privacy', 'terms'));
end;
$$;
revoke all on function public.get_legal_document_for_admin(text) from public;
grant execute on function public.get_legal_document_for_admin(text) to authenticated;

create or replace function public.get_legal_document_revisions_by_slug(p_slug text)
returns setof public.legal_document_revisions
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.current_campus_role() is distinct from 'Main Admin'
    or not exists (select 1 from public.profiles p where p.id = auth.uid()
      and coalesce(p.account_status::text, 'Active') = 'Active') then
    raise exception 'Active Main Admin permission required' using errcode = '42501';
  end if;
  return query select r.* from public.legal_document_revisions r
    join public.legal_documents d on d.id = r.document_id
    where d.slug = p_slug and p_slug in ('privacy', 'terms') order by r.version desc;
end;
$$;
revoke all on function public.get_legal_document_revisions_by_slug(text) from public;
grant execute on function public.get_legal_document_revisions_by_slug(text) to authenticated;

create or replace function public.get_legal_document_revision_by_slug(p_slug text, p_version integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.current_campus_role() is distinct from 'Main Admin'
    or not exists (select 1 from public.profiles p where p.id = auth.uid()
      and coalesce(p.account_status::text, 'Active') = 'Active') then
    raise exception 'Active Main Admin permission required' using errcode = '42501';
  end if;
  return (select jsonb_build_object('title', r.title, 'introduction', r.introduction,
    'sections', r.sections, 'meta_description', r.meta_description)
    from public.legal_document_revisions r join public.legal_documents d on d.id = r.document_id
    where d.slug = p_slug and p_slug in ('privacy', 'terms') and r.version = p_version);
end;
$$;
revoke all on function public.get_legal_document_revision_by_slug(text, integer) from public;
grant execute on function public.get_legal_document_revision_by_slug(text, integer) to authenticated;

create or replace function public.update_legal_document_by_slug(
  p_slug text, p_title text, p_introduction text, p_sections jsonb,
  p_meta_description text, p_action text, p_edit_summary text default ''
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_doc public.legal_documents%rowtype;
  v_version integer;
  v_section jsonb;
  v_block jsonb;
  v_item jsonb;
  v_url text;
  v_ids text[] := array[]::text[];
  v_published_at timestamptz;
begin
  if auth.uid() is null or public.current_campus_role() is distinct from 'Main Admin'
    or not exists (select 1 from public.profiles p where p.id = auth.uid()
      and coalesce(p.account_status::text, 'Active') = 'Active') then
    raise exception 'Active Main Admin permission required' using errcode = '42501';
  end if;
  if p_slug is null or p_slug not in ('privacy', 'terms') then raise exception 'Invalid legal document slug'; end if;
  if p_action is null or p_action not in ('save_draft', 'publish') then raise exception 'Invalid legal document action'; end if;
  if p_title is null or p_introduction is null or p_meta_description is null
    or length(coalesce(p_title, '')) not between 1 and 200
    or length(coalesce(p_introduction, '')) > 5000
    or length(coalesce(p_meta_description, '')) > 5000
    or jsonb_typeof(p_sections) is distinct from 'array'
    or p_title ~* '<[/]?[a-z][^>]*>' or p_introduction ~* '<[/]?[a-z][^>]*>' then
    raise exception 'Invalid legal document dimensions or markup';
  end if;

  if jsonb_array_length(p_sections) not between 1 and 100 then
    raise exception 'Invalid legal document dimensions or markup';
  end if;

  for v_section in select value from jsonb_array_elements(p_sections) loop
    if jsonb_typeof(v_section) is distinct from 'object'
      or coalesce(v_section->>'id', '') !~ '^[a-z0-9-]{1,100}$'
      or coalesce(v_section->>'id', '') = any(v_ids)
      or length(coalesce(v_section->>'title', '')) not between 1 and 200
      or (v_section->>'title') ~* '<[/]?[a-z][^>]*>'
      or jsonb_typeof(v_section->'blocks') is distinct from 'array' then
      raise exception 'Invalid legal section';
    end if;
    if jsonb_array_length(v_section->'blocks') > 200 then
      raise exception 'Invalid legal section';
    end if;
    v_ids := array_append(v_ids, v_section->>'id');
    for v_block in select value from jsonb_array_elements(v_section->'blocks') loop
      if v_block->>'type' in ('paragraph', 'heading') then
        if jsonb_typeof(v_block->'text') is distinct from 'string'
          or length(v_block->>'text') > 10000
          or (v_block->>'text') ~* '<[/]?[a-z][^>]*>' then
          raise exception 'Invalid legal text block';
        end if;
      elsif v_block->>'type' = 'list' then
        if jsonb_typeof(v_block->'items') is distinct from 'array' then
          raise exception 'Invalid legal list';
        end if;
        if jsonb_array_length(v_block->'items') > 100 then
          raise exception 'Invalid legal list';
        end if;
        for v_item in select value from jsonb_array_elements(v_block->'items') loop
          if jsonb_typeof(v_item) is distinct from 'string' or length(v_item #>> '{}') > 2000
            or (v_item #>> '{}') ~* '<[/]?[a-z][^>]*>' then
            raise exception 'Invalid legal list item';
          end if;
        end loop;
      elsif v_block->>'type' = 'link' then
        v_url := v_block->>'url';
        if length(coalesce(v_block->>'label', '')) not between 1 and 500
          or (v_block->>'label') ~* '<[/]?[a-z][^>]*>'
          or length(coalesce(v_block->>'prefix', '')) > 500
          or coalesce(v_block->>'prefix', '') ~* '<[/]?[a-z][^>]*>'
          or v_url is null
          or length(v_url) > 2000
          or v_url !~* '^(https?://|mailto:)'
          or v_url ~ '[[:cntrl:]<>" ]' then
          raise exception 'Legal links require safe HTTP, HTTPS, or mailto URLs';
        end if;
      else
        raise exception 'Unsupported legal content block';
      end if;
    end loop;
  end loop;

  select * into v_doc from public.legal_documents where slug = p_slug for update;
  if not found then raise exception 'Legal document not found'; end if;
  v_version := v_doc.current_version + 1;
  v_published_at := case when p_action = 'publish' then now() else v_doc.published_at end;
  if p_action = 'publish' then
    update public.legal_documents set title = p_title, introduction = p_introduction,
      sections = p_sections, meta_description = p_meta_description, status = 'published',
      published_at = v_published_at, published_by = auth.uid(), draft_title = null,
      draft_introduction = null, draft_sections = null, draft_meta_description = null,
      current_version = v_version, published_version = v_version,
      updated_at = now() where id = v_doc.id;
  else
    update public.legal_documents set draft_title = p_title, draft_introduction = p_introduction,
      draft_sections = p_sections, draft_meta_description = p_meta_description,
      current_version = v_version, updated_at = now() where id = v_doc.id;
  end if;
  insert into public.legal_document_revisions
    (document_id, version, title, introduction, sections, meta_description, edited_by, edit_summary)
  values (v_doc.id, v_version, p_title, p_introduction, p_sections,
    p_meta_description, auth.uid(), left(coalesce(p_edit_summary, ''), 500));
  return jsonb_build_object('title', p_title, 'introduction', p_introduction,
    'sections', p_sections, 'meta_description', p_meta_description,
    'status', case when p_action = 'publish' then 'published' else 'draft' end,
    'current_version', v_version,
    'published_version', case when p_action = 'publish' then v_version else v_doc.published_version end,
    'published_at', v_published_at,
    'published_by', case when p_action = 'publish' then auth.uid() else v_doc.published_by end);
end;
$$;
revoke all on function public.update_legal_document_by_slug(text, text, text, jsonb, text, text, text) from public;
grant execute on function public.update_legal_document_by_slug(text, text, text, jsonb, text, text, text) to authenticated;

-- Retire unsafe/obsolete partial-draft RPCs that may have been manually applied.
drop function if exists public.get_legal_document_revisions(uuid);
drop function if exists public.update_legal_document(uuid, text, text, jsonb, text, text, text);

-- Initial snapshots retain the current wording; unresolved legal placeholders are intentionally unchanged.
insert into public.legal_documents (slug, title, introduction, sections, meta_description, status)
values
('privacy', 'Privacy Policy',
 'CampusConnect Pro (“we”, “us”) is a campus platform for academics, attendance, placements, events and networking. This policy explains what data we collect and how we use it.',
 '[{"id":"data-we-collect","title":"1. Data we collect","blocks":[{"type":"list","items":["Account data: name, email, role, college ID / USN, profile details and photo.","Academic data: attendance, marks, timetables, assignments and syllabus progress.","Placement data: resumes, applications and related documents you upload.","Content you create: messages, posts, event registrations and notes.","Technical data: authentication cookies and local storage needed to keep you signed in and secure."]}]},{"id":"how-we-use-it","title":"2. How we use it","blocks":[{"type":"paragraph","text":"To run the platform, authenticate you, show you your academic and campus information, send notifications and emails, keep the service secure, and provide AI-assisted features you choose to use."}]},{"id":"service-providers","title":"3. Service providers who process data for us","blocks":[{"type":"list","items":["Supabase: database, authentication and file storage.","Cloudflare: hosting and delivery.","Brevo: transactional emails (verification codes, notifications).","Groq (AI provider): text you submit to AI chat, quiz or document features is sent to this provider to generate a response.","Google (Fonts, Drive/Docs embeds): loaded when those features are used."]},{"type":"paragraph","text":"We do not sell your personal data."}]},{"id":"cookies-and-local-storage","title":"4. Cookies and local storage","blocks":[{"type":"paragraph","text":"We use essential cookies and storage (authentication session cookies, security tokens, your cookie choice and an offline cache) that the platform needs to work. We do not currently load advertising or analytics trackers. If that changes, we will ask for your consent first. You can reopen your choices at any time using the “Privacy” button."}]},{"id":"retention","title":"5. Retention","blocks":[{"type":"paragraph","text":"[STATE RETENTION PERIOD, e.g. we keep your data while your account is active and delete it within X days after you delete your account or your institution asks us to.]"}]},{"id":"your-rights","title":"6. Your rights","blocks":[{"type":"paragraph","text":"You can access and correct your information in your profile, and delete your account from within the app. You can also withdraw consent, or request access, correction or erasure, by writing to us. Where required by Indian law (including the Digital Personal Data Protection Act, 2023), we will respond within the legally required time."}]},{"id":"children","title":"7. Children","blocks":[{"type":"paragraph","text":"If you are under 18, you should use CampusConnect only with the consent of a parent or guardian, or through your institution. [CONFIRM WITH YOUR LEGAL ADVISER.]"}]},{"id":"security","title":"8. Security","blocks":[{"type":"paragraph","text":"We use encryption in transit, access controls, row-level security and rate limiting. No system is perfectly secure; please protect your password."}]},{"id":"contact-and-grievance-officer","title":"9. Contact and grievance officer","blocks":[{"type":"paragraph","text":"[YOUR NAME], Grievance Officer: "},{"type":"link","label":"[YOUR_EMAIL]","url":"mailto:YOUR_EMAIL"}]},{"id":"changes","title":"10. Changes","blocks":[{"type":"paragraph","text":"We may update this policy and will change the date above when we do."}]}]'::jsonb,
 'CampusConnect Privacy Policy — how we collect, use, and protect your data.', 'draft'),
('terms', 'Terms of Use', 'By creating an account or using CampusConnect Pro you agree to these terms.',
 '[{"id":"eligibility-and-accounts","title":"1. Eligibility and accounts","blocks":[{"type":"paragraph","text":"Use your real identity and keep your login details private. You are responsible for activity under your account."}]},{"id":"acceptable-use","title":"2. Acceptable use","blocks":[{"type":"list","items":["No harassment, hate speech, impersonation or illegal content.","No attempts to access other users’ data, bypass security, or overload the service.","Do not upload content you do not have the right to share."]}]},{"id":"your-content","title":"3. Your content","blocks":[{"type":"paragraph","text":"You keep ownership of what you upload. You give us permission to store and display it as needed to run the platform. We may remove content that breaks these terms."}]},{"id":"ai-features","title":"4. AI features","blocks":[{"type":"paragraph","text":"AI responses may be inaccurate. Check important information, such as deadlines, marks and attendance, against official sources."}]},{"id":"availability","title":"5. Availability","blocks":[{"type":"paragraph","text":"We try to keep the service running but do not guarantee uninterrupted access. We may change or discontinue features."}]},{"id":"suspension","title":"6. Suspension","blocks":[{"type":"paragraph","text":"We may suspend or remove accounts that violate these terms or at the request of your institution."}]},{"id":"liability","title":"7. Liability","blocks":[{"type":"paragraph","text":"To the extent permitted by law, the platform is provided “as is” and we are not liable for indirect or consequential losses. [REVIEW WITH A LEGAL ADVISER.]"}]},{"id":"governing-law","title":"8. Governing law","blocks":[{"type":"paragraph","text":"These terms are governed by the laws of India. [ADD JURISDICTION / CITY.]"}]},{"id":"contact","title":"9. Contact","blocks":[{"type":"link","label":"[YOUR_EMAIL]","url":"mailto:YOUR_EMAIL"}]}]'::jsonb,
 'CampusConnect Terms of Use — rules and responsibilities for using the platform.', 'draft')
on conflict (slug) do nothing;

insert into public.legal_document_revisions
  (document_id, version, title, introduction, sections, meta_description, edit_summary)
select id, current_version, title, introduction, sections, meta_description, 'Initial published version'
from public.legal_documents where slug in ('privacy', 'terms')
on conflict (document_id, version) do nothing;

notify pgrst, 'reload schema';
