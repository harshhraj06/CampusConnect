create table if not exists public.network_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type text not null default 'Update'
    check (
      post_type in (
        'Update',
        'Project',
        'Achievement',
        'Internship',
        'Placement',
        'Opportunity',
        'Technical'
      )
    ),
  body text not null
    check (
      length(trim(body)) between 1 and 5000
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_post_reactions (
  post_id uuid not null
    references public.network_posts(id)
    on delete cascade,
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  reaction text not null default 'Like'
    check (
      reaction in (
        'Like',
        'Celebrate',
        'Support',
        'Insightful'
      )
    ),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.network_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.network_posts(id)
    on delete cascade,
  author_id uuid not null
    references public.profiles(id)
    on delete cascade,
  body text not null
    check (
      length(trim(body)) between 1 and 2000
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_post_reposts (
  post_id uuid not null
    references public.network_posts(id)
    on delete cascade,
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.network_saved_posts (
  post_id uuid not null
    references public.network_posts(id)
    on delete cascade,
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists network_posts_created_at_idx
  on public.network_posts(created_at desc);

create index if not exists network_posts_author_id_idx
  on public.network_posts(author_id);

create index if not exists network_post_comments_post_id_idx
  on public.network_post_comments(post_id, created_at);

create index if not exists network_post_reactions_post_id_idx
  on public.network_post_reactions(post_id);

create index if not exists network_post_reposts_post_id_idx
  on public.network_post_reposts(post_id);

create index if not exists network_saved_posts_user_id_idx
  on public.network_saved_posts(user_id);

alter table public.network_posts
enable row level security;

alter table public.network_post_reactions
enable row level security;

alter table public.network_post_comments
enable row level security;

alter table public.network_post_reposts
enable row level security;

alter table public.network_saved_posts
enable row level security;

drop policy if exists
  "Authenticated users view network posts"
on public.network_posts;

create policy
  "Authenticated users view network posts"
on public.network_posts
for select
to authenticated
using (true);

drop policy if exists
  "Users create own network posts"
on public.network_posts;

create policy
  "Users create own network posts"
on public.network_posts
for insert
to authenticated
with check (
  author_id = auth.uid()
);

drop policy if exists
  "Users update own network posts"
on public.network_posts;

create policy
  "Users update own network posts"
on public.network_posts
for update
to authenticated
using (
  author_id = auth.uid()
)
with check (
  author_id = auth.uid()
);

drop policy if exists
  "Users delete own network posts"
on public.network_posts;

create policy
  "Users delete own network posts"
on public.network_posts
for delete
to authenticated
using (
  author_id = auth.uid()
);

drop policy if exists
  "Authenticated users view network reactions"
on public.network_post_reactions;

create policy
  "Authenticated users view network reactions"
on public.network_post_reactions
for select
to authenticated
using (true);

drop policy if exists
  "Users add own network reactions"
on public.network_post_reactions;

create policy
  "Users add own network reactions"
on public.network_post_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists
  "Users update own network reactions"
on public.network_post_reactions;

create policy
  "Users update own network reactions"
on public.network_post_reactions
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

drop policy if exists
  "Users remove own network reactions"
on public.network_post_reactions;

create policy
  "Users remove own network reactions"
on public.network_post_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists
  "Authenticated users view network comments"
on public.network_post_comments;

create policy
  "Authenticated users view network comments"
on public.network_post_comments
for select
to authenticated
using (true);

drop policy if exists
  "Users create own network comments"
on public.network_post_comments;

create policy
  "Users create own network comments"
on public.network_post_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
);

drop policy if exists
  "Users update own network comments"
on public.network_post_comments;

create policy
  "Users update own network comments"
on public.network_post_comments
for update
to authenticated
using (
  author_id = auth.uid()
)
with check (
  author_id = auth.uid()
);

drop policy if exists
  "Users delete own network comments"
on public.network_post_comments;

create policy
  "Users delete own network comments"
on public.network_post_comments
for delete
to authenticated
using (
  author_id = auth.uid()
);

drop policy if exists
  "Authenticated users view network reposts"
on public.network_post_reposts;

create policy
  "Authenticated users view network reposts"
on public.network_post_reposts
for select
to authenticated
using (true);

drop policy if exists
  "Users create own network reposts"
on public.network_post_reposts;

create policy
  "Users create own network reposts"
on public.network_post_reposts
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists
  "Users remove own network reposts"
on public.network_post_reposts;

create policy
  "Users remove own network reposts"
on public.network_post_reposts
for delete
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists
  "Users view own saved network posts"
on public.network_saved_posts;

create policy
  "Users view own saved network posts"
on public.network_saved_posts
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists
  "Users save network posts"
on public.network_saved_posts;

create policy
  "Users save network posts"
on public.network_saved_posts
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists
  "Users unsave network posts"
on public.network_saved_posts;

create policy
  "Users unsave network posts"
on public.network_saved_posts
for delete
to authenticated
using (
  user_id = auth.uid()
);

grant select, insert, update, delete
on public.network_posts
to authenticated;

grant select, insert, update, delete
on public.network_post_reactions
to authenticated;

grant select, insert, update, delete
on public.network_post_comments
to authenticated;

grant select, insert, delete
on public.network_post_reposts
to authenticated;

grant select, insert, delete
on public.network_saved_posts
to authenticated;

notify pgrst, 'reload schema';
