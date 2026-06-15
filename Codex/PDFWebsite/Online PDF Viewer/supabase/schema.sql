create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_path text not null unique,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled workspace',
  note_content_html text not null default '<p></p>',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_id, document_id)
);

create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  selected_text text not null,
  selection_rects jsonb not null default '[]'::jsonb,
  selection_anchor jsonb not null default '{}'::jsonb,
  citation_label text not null,
  citation_order integer not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_documents enable row level security;
alter table public.citations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

drop policy if exists "documents_manage_own" on public.documents;
create policy "documents_manage_own" on public.documents
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workspaces_manage_own" on public.workspaces;
create policy "workspaces_manage_own" on public.workspaces
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workspace_documents_manage_own" on public.workspace_documents;
create policy "workspace_documents_manage_own" on public.workspace_documents
for all using (
  exists (
    select 1
    from public.workspaces
    where workspaces.id = workspace_documents.workspace_id
      and workspaces.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.workspaces
    join public.documents on documents.id = workspace_documents.document_id
    where workspaces.id = workspace_documents.workspace_id
      and documents.id = workspace_documents.document_id
      and workspaces.user_id = auth.uid()
      and documents.user_id = auth.uid()
  )
);

drop policy if exists "citations_manage_own" on public.citations;
create policy "citations_manage_own" on public.citations
for all using (
  exists (
    select 1
    from public.workspaces
    join public.documents on documents.id = citations.document_id
    where workspaces.id = citations.workspace_id
      and workspaces.user_id = auth.uid()
      and documents.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.workspaces
    join public.documents on documents.id = citations.document_id
    where workspaces.id = citations.workspace_id
      and workspaces.user_id = auth.uid()
      and documents.user_id = auth.uid()
  )
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_documents to authenticated;
grant select, insert, update, delete on public.citations to authenticated;

insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

drop policy if exists "pdfs_select_own" on storage.objects;
create policy "pdfs_select_own" on storage.objects
for select using (
  bucket_id = 'pdfs'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "pdfs_insert_own" on storage.objects;
create policy "pdfs_insert_own" on storage.objects
for insert with check (
  bucket_id = 'pdfs'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "pdfs_update_own" on storage.objects;
create policy "pdfs_update_own" on storage.objects
for update using (
  bucket_id = 'pdfs'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "pdfs_delete_own" on storage.objects;
create policy "pdfs_delete_own" on storage.objects
for delete using (
  bucket_id = 'pdfs'
  and auth.uid()::text = split_part(name, '/', 1)
);
