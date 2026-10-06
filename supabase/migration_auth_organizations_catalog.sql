-- Execute depois do schema.sql caso o projeto Supabase já exista.
do $$ begin
  create type public.user_role as enum ('adopter', 'organization');
exception when duplicate_object then null;
end $$;

alter table public.profiles add column if not exists role public.user_role not null default 'adopter';
alter table public.organizations add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.organizations add column if not exists description text;
alter table public.organizations add column if not exists address text;
alter table public.organizations add column if not exists email text;
alter table public.organizations add column if not exists website text;
alter table public.organizations add column if not exists cnpj text;
alter table public.organizations add column if not exists gallery_urls text[] not null default '{}';
alter table public.animals add column if not exists sex text check (sex in ('male', 'female'));
alter table public.animals add column if not exists size text check (size in ('small', 'medium', 'large'));

create table if not exists public.favorites (
  adopter_id uuid not null references public.profiles(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (adopter_id, animal_id)
);
alter table public.favorites enable row level security;
drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites" on public.favorites for all using (auth.uid() = adopter_id) with check (auth.uid() = adopter_id);

-- Uma ONG só administra seu próprio perfil, seus animais e suas solicitações.
drop policy if exists "Organizations create own profile" on public.organizations;
drop policy if exists "Organizations update own profile" on public.organizations;
drop policy if exists "Organizations create own animals" on public.animals;
drop policy if exists "Organizations update own animals" on public.animals;
drop policy if exists "Organizations read animal requests" on public.adoption_requests;
drop policy if exists "Organizations update animal requests" on public.adoption_requests;
create policy "Organizations create own profile" on public.organizations for insert with check (auth.uid() = owner_id);
create policy "Organizations update own profile" on public.organizations for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Organizations create own animals" on public.animals for insert with check (exists (select 1 from public.organizations where organizations.id = animals.organization_id and organizations.owner_id = auth.uid()));
create policy "Organizations update own animals" on public.animals for update using (exists (select 1 from public.organizations where organizations.id = animals.organization_id and organizations.owner_id = auth.uid())) with check (exists (select 1 from public.organizations where organizations.id = animals.organization_id and organizations.owner_id = auth.uid()));
create policy "Organizations read animal requests" on public.adoption_requests for select using (exists (select 1 from public.animals join public.organizations on organizations.id = animals.organization_id where animals.id = adoption_requests.animal_id and organizations.owner_id = auth.uid()));
create policy "Organizations update animal requests" on public.adoption_requests for update using (exists (select 1 from public.animals join public.organizations on organizations.id = animals.organization_id where animals.id = adoption_requests.animal_id and organizations.owner_id = auth.uid()));

-- O gatilho registra o tipo de usuário informado no cadastro.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Novo usuário'), coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'adopter'));
  return new;
end;
$$;

select pg_notify('pgrst', 'reload schema');
