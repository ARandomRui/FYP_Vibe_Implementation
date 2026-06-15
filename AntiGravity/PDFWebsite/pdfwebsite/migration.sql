-- Migration: Add pdf_pages table for global search

-- Create pdf_pages table
create table if not exists public.pdf_pages (
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
