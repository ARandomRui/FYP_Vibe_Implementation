-- Create a storage bucket for PDFs (Private for security)
insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', false);

-- Create pdfs table (Global Library)
create table public.pdfs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  filename text not null,
  file_url text not null, -- Stores the storage path
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create notes table (Research Papers)
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null default 'Untitled Research',
  content jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.pdfs enable row level security;
alter table public.notes enable row level security;

-- Policies for pdfs
create policy "Users can view their own pdfs" on public.pdfs for select using (auth.uid() = user_id);
create policy "Users can insert their own pdfs" on public.pdfs for insert with check (auth.uid() = user_id);
create policy "Users can delete their own pdfs" on public.pdfs for delete using (auth.uid() = user_id);

-- Policies for notes
create policy "Users can view their own notes" on public.notes for select using (auth.uid() = user_id);
create policy "Users can insert their own notes" on public.notes for insert with check (auth.uid() = user_id);
create policy "Users can update their own notes" on public.notes for update using (auth.uid() = user_id);
create policy "Users can delete their own notes" on public.notes for delete using (auth.uid() = user_id);

-- Storage policies
create policy "Users can upload their own PDFs" on storage.objects for insert with check (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can view their own PDFs" on storage.objects for select using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete their own PDFs" on storage.objects for delete using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

-- Create pdf_pages table for global search
create table public.pdf_pages (
  id uuid default gen_random_uuid() primary key,
  pdf_id uuid references public.pdfs on delete cascade not null,
  user_id uuid references auth.users not null,
  page_number integer not null,
  content_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.pdf_pages enable row level security;

-- Policies for pdf_pages
create policy "Users can view their own pdf_pages" on public.pdf_pages for select using (auth.uid() = user_id);
create policy "Users can insert their own pdf_pages" on public.pdf_pages for insert with check (auth.uid() = user_id);
create policy "Users can delete their own pdf_pages" on public.pdf_pages for delete using (auth.uid() = user_id);
