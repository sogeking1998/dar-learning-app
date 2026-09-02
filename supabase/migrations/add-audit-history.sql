-- Immutable administrative audit history.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_email text,
  action text not null check (action in ('created', 'updated', 'deleted')),
  entity_type text not null,
  entity_id text,
  entity_label text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_type_idx on public.audit_logs (entity_type);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);

alter table public.audit_logs enable row level security;

drop policy if exists "staff read audit logs" on public.audit_logs;
create policy "staff read audit logs"
  on public.audit_logs for select to authenticated
  using (public.is_staff());

drop policy if exists "staff add audit logs" on public.audit_logs;
create policy "staff add audit logs"
  on public.audit_logs for insert to authenticated
  with check (public.is_staff() and actor_id = auth.uid());

create or replace function public.capture_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
  before_data jsonb;
  after_data jsonb;
  record_data jsonb;
  label text;
begin
  if auth.uid() is null or not public.is_staff() then
    return coalesce(new, old);
  end if;

  select * into actor from public.profiles where id = auth.uid();
  before_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  after_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  record_data := coalesce(after_data, before_data, '{}'::jsonb);

  -- Ignore ordinary self-profile edits (and the isolated account-setup client).
  -- Account creation is attributed explicitly by the main staff session.
  if tg_table_name = 'profiles' and record_data->>'id' = auth.uid()::text then
    return coalesce(new, old);
  end if;

  label := coalesce(
    record_data->>'title',
    record_data->>'question',
    record_data->>'name',
    record_data->>'email',
    record_data->>'code',
    record_data->>'id'
  );

  insert into public.audit_logs (
    actor_id, actor_name, actor_email, action, entity_type,
    entity_id, entity_label, details
  ) values (
    auth.uid(), actor.name, actor.email,
    case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    case tg_table_name
      when 'exam_questions' then 'exam'
      when 'profiles' then 'user'
      else rtrim(tg_table_name, 's')
    end,
    record_data->>'id', label,
    jsonb_build_object('before', before_data, 'after', after_data)
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_courses on public.courses;
create trigger audit_courses after insert or update or delete on public.courses
for each row execute function public.capture_admin_audit();

drop trigger if exists audit_exam_questions on public.exam_questions;
create trigger audit_exam_questions after insert or update or delete on public.exam_questions
for each row execute function public.capture_admin_audit();

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements
for each row execute function public.capture_admin_audit();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
for each row execute function public.capture_admin_audit();
