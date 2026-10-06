-- Execute this file in Supabase Dashboard > SQL Editor.
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  city text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  phone text,
  created_at timestamptz not null default now()
);

create type public.animal_status as enum ('available', 'pending', 'adopted');
create table public.animals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete set null,
  name text not null,
  species text not null check (species in ('dog', 'cat', 'other')),
  breed text,
  age_months integer check (age_months >= 0),
  city text,
  photo_url text,
  description text,
  status public.animal_status not null default 'available',
  created_at timestamptz not null default now()
);

create type public.request_status as enum ('submitted', 'reviewing', 'approved', 'declined');
create table public.adoption_requests (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals on delete cascade,
  adopter_id uuid not null references public.profiles on delete cascade,
  message text,
  status public.request_status not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (animal_id, adopter_id)
);

-- Pets pessoais são separados dos animais disponibilizados pelas ONGs.
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null,
  species text not null check (species in ('dog', 'cat', 'other')),
  breed text,
  birth_date date,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets on delete cascade,
  record_type text not null,
  occurred_on date not null,
  notes text,
  veterinarian text,
  clinic text,
  created_at timestamptz not null default now()
);

create table public.vaccination_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  location text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles on delete set null,
  location_description text not null,
  details text not null,
  contact_phone text,
  status text not null default 'received',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.animals enable row level security;
alter table public.adoption_requests enable row level security;
alter table public.pets enable row level security;
alter table public.medical_records enable row level security;
alter table public.abuse_reports enable row level security;
alter table public.vaccination_events enable row level security;

create policy "Public reads available animals" on public.animals for select using (status = 'available');
create policy "Everyone reads organizations" on public.organizations for select using (true);
create policy "Users read their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update their profile" on public.profiles for update using (auth.uid() = id);
create policy "Users create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users read own adoption requests" on public.adoption_requests for select using (auth.uid() = adopter_id);
create policy "Users create own adoption requests" on public.adoption_requests for insert with check (auth.uid() = adopter_id);
create policy "Users manage own pets" on public.pets for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users manage own medical records" on public.medical_records for all using (exists (select 1 from public.pets where pets.id = medical_records.pet_id and pets.owner_id = auth.uid())) with check (exists (select 1 from public.pets where pets.id = medical_records.pet_id and pets.owner_id = auth.uid()));
create policy "Users create reports" on public.abuse_reports for insert with check (auth.uid() = reporter_id);
create policy "Everyone reads vaccination events" on public.vaccination_events for select using (true);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Novo adotante'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
