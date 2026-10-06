-- Extensões do Product Backlog. Execute depois das migrations já documentadas.
alter type public.request_status add value if not exists 'completed';
alter table public.organizations add column if not exists latitude numeric;
alter table public.organizations add column if not exists longitude numeric;
alter table public.vaccination_events add column if not exists organizer_id uuid references public.organizations(id) on delete set null;

create table if not exists public.adoption_status_history (
  id uuid primary key default gen_random_uuid(),
  adoption_request_id uuid not null references public.adoption_requests(id) on delete cascade,
  status public.request_status not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.pet_medical_entries (
  id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id) on delete cascade,
  entry_type text not null check (entry_type in ('consultation','condition','treatment','procedure','medication')),
  occurred_on date not null, description text not null, veterinarian text, clinic text, created_at timestamptz not null default now()
);
create table if not exists public.vaccinations (
  id uuid primary key default gen_random_uuid(), pet_id uuid not null references public.pets(id) on delete cascade,
  name text not null, applied_on date not null, next_dose_on date, notes text, created_at timestamptz not null default now()
);
create table if not exists public.health_content (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null, species text, min_age_months integer, max_age_months integer,
  category text not null default 'general', is_veterinary_guidance boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.pet_services (
  id uuid primary key default gen_random_uuid(), name text not null, category text not null check (category in ('clinic','pet_shop','pharmacy','grooming','other')),
  address text not null, city text, phone text, opening_hours text, latitude numeric, longitude numeric, created_at timestamptz not null default now()
);
create table if not exists public.event_registrations (
  event_id uuid not null references public.vaccination_events(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (event_id, user_id)
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), adoption_request_id uuid references public.adoption_requests(id) on delete set null,
  adopter_id uuid not null references public.profiles(id) on delete cascade, ong_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(), unique(adoption_request_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade, body text not null, created_at timestamptz not null default now()
);
create table if not exists public.post_adoption_checkins (
  id uuid primary key default gen_random_uuid(), adoption_request_id uuid not null references public.adoption_requests(id) on delete cascade,
  adopter_id uuid not null references public.profiles(id) on delete cascade, notes text not null, photo_url text, status text not null default 'open' check (status in ('open','reviewed','closed')),
  created_at timestamptz not null default now()
);

alter table public.adoption_status_history enable row level security;
alter table public.pet_medical_entries enable row level security;
alter table public.vaccinations enable row level security;
alter table public.health_content enable row level security;
alter table public.pet_services enable row level security;
alter table public.event_registrations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.post_adoption_checkins enable row level security;

drop policy if exists "Public reads health content" on public.health_content;
drop policy if exists "Public reads services" on public.pet_services;
drop policy if exists "Public reads pet health" on public.pet_medical_entries;
drop policy if exists "Public reads vaccinations" on public.vaccinations;
drop policy if exists "ONG manages pet health" on public.pet_medical_entries;
drop policy if exists "ONG manages vaccinations" on public.vaccinations;
drop policy if exists "Participants read adoption history" on public.adoption_status_history;
drop policy if exists "ONG writes adoption history" on public.adoption_status_history;
drop policy if exists "Users manage event registrations" on public.event_registrations;
drop policy if exists "ONG creates vaccination events" on public.vaccination_events;
drop policy if exists "ONG updates own vaccination events" on public.vaccination_events;
drop policy if exists "Participants read conversations" on public.conversations;
drop policy if exists "Adopter creates own conversations" on public.conversations;
drop policy if exists "Participants read messages" on public.messages;
drop policy if exists "Participants send messages" on public.messages;
drop policy if exists "Adopters manage their checkins" on public.post_adoption_checkins;
drop policy if exists "ONG reads related checkins" on public.post_adoption_checkins;
create policy "Public reads health content" on public.health_content for select using (true);
create policy "Public reads services" on public.pet_services for select using (true);
create policy "Public reads pet health" on public.pet_medical_entries for select using (true);
create policy "Public reads vaccinations" on public.vaccinations for select using (true);
create policy "ONG manages pet health" on public.pet_medical_entries for all using (exists (select 1 from public.pets p join public.organizations o on o.id = p.ong_id where p.id = pet_medical_entries.pet_id and o.owner_id = auth.uid())) with check (exists (select 1 from public.pets p join public.organizations o on o.id = p.ong_id where p.id = pet_medical_entries.pet_id and o.owner_id = auth.uid()));
create policy "ONG manages vaccinations" on public.vaccinations for all using (exists (select 1 from public.pets p join public.organizations o on o.id = p.ong_id where p.id = vaccinations.pet_id and o.owner_id = auth.uid())) with check (exists (select 1 from public.pets p join public.organizations o on o.id = p.ong_id where p.id = vaccinations.pet_id and o.owner_id = auth.uid()));
create policy "Participants read adoption history" on public.adoption_status_history for select using (exists (select 1 from public.adoption_requests r join public.pets p on p.id = r.pet_id join public.organizations o on o.id = p.ong_id where r.id = adoption_status_history.adoption_request_id and (r.adopter_id = auth.uid() or o.owner_id = auth.uid())));
create policy "ONG writes adoption history" on public.adoption_status_history for insert with check (auth.uid() = changed_by and exists (select 1 from public.adoption_requests r join public.pets p on p.id = r.pet_id join public.organizations o on o.id = p.ong_id where r.id = adoption_status_history.adoption_request_id and o.owner_id = auth.uid()));
create policy "Users manage event registrations" on public.event_registrations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ONG creates vaccination events" on public.vaccination_events for insert with check (exists (select 1 from public.organizations where organizations.id = vaccination_events.organizer_id and organizations.owner_id = auth.uid()));
create policy "ONG updates own vaccination events" on public.vaccination_events for update using (exists (select 1 from public.organizations where organizations.id = vaccination_events.organizer_id and organizations.owner_id = auth.uid())) with check (exists (select 1 from public.organizations where organizations.id = vaccination_events.organizer_id and organizations.owner_id = auth.uid()));
create policy "Participants read conversations" on public.conversations for select using (auth.uid() = adopter_id or exists (select 1 from public.organizations where organizations.id = conversations.ong_id and organizations.owner_id = auth.uid()));
create policy "Adopter creates own conversations" on public.conversations for insert with check (auth.uid() = adopter_id and exists (select 1 from public.adoption_requests r join public.pets p on p.id = r.pet_id where r.id = conversations.adoption_request_id and r.adopter_id = auth.uid() and p.ong_id = conversations.ong_id));
create policy "Participants read messages" on public.messages for select using (exists (select 1 from public.conversations c where c.id = messages.conversation_id and (c.adopter_id = auth.uid() or exists (select 1 from public.organizations o where o.id = c.ong_id and o.owner_id = auth.uid()))));
create policy "Participants send messages" on public.messages for insert with check (auth.uid() = sender_id and exists (select 1 from public.conversations c where c.id = messages.conversation_id and (c.adopter_id = auth.uid() or exists (select 1 from public.organizations o where o.id = c.ong_id and o.owner_id = auth.uid()))));
create policy "Adopters manage their checkins" on public.post_adoption_checkins for all using (auth.uid() = adopter_id) with check (auth.uid() = adopter_id);
create policy "ONG reads related checkins" on public.post_adoption_checkins for select using (exists (select 1 from public.adoption_requests r join public.pets p on p.id = r.pet_id join public.organizations o on o.id = p.ong_id where r.id = post_adoption_checkins.adoption_request_id and o.owner_id = auth.uid()));

select pg_notify('pgrst', 'reload schema');
