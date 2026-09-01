-- Adds task review support to databases created with the older setup script.
-- Safe to run more than once in the Supabase SQL editor.
alter table public.task_submissions
  add column if not exists status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id);

alter table public.task_submissions enable row level security;

drop policy if exists "users manage own submissions" on public.task_submissions;
create policy "users manage own submissions"
  on public.task_submissions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "staff read all submissions" on public.task_submissions;
create policy "staff read all submissions"
  on public.task_submissions for select to authenticated
  using (public.is_staff());

drop policy if exists "staff review submissions" on public.task_submissions;
create policy "staff review submissions"
  on public.task_submissions for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- File replacements use an update when the same task path already exists.
drop policy if exists "taskfiles owner update" on storage.objects;
create policy "taskfiles owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'task-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'task-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Make PostgREST recognize the new columns immediately.
notify pgrst, 'reload schema';
