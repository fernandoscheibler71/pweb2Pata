-- Execute após schema.sql e migration_auth_organizations_catalog.sql.
-- Preserva dados existentes ao separar prontuários pessoais do catálogo de adoção.
do $$ begin
  if to_regclass('public.personal_pets') is null and to_regclass('public.pets') is not null and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name = 'owner_id') then
    alter table public.pets rename to personal_pets;
  end if;
  if to_regclass('public.pets') is null and to_regclass('public.animals') is not null then
    alter table public.animals rename to pets;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name = 'organization_id') and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name = 'ong_id') then
    alter table public.pets rename column organization_id to ong_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'adoption_requests' and column_name = 'animal_id') and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'adoption_requests' and column_name = 'pet_id') then
    alter table public.adoption_requests rename column animal_id to pet_id;
  end if;
end $$;

alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists cep text;
alter table public.profiles add column if not exists street text;
alter table public.profiles add column if not exists number text;
alter table public.profiles add column if not exists neighborhood text;
alter table public.profiles add column if not exists state text;

alter table public.organizations add column if not exists cep text;
alter table public.organizations add column if not exists neighborhood text;
alter table public.organizations add column if not exists state text;
alter table public.organizations add column if not exists logo_url text;

alter table public.pets add column if not exists location text;
alter table public.pets add column if not exists personality text;
alter table public.pets alter column ong_id set not null;
alter table public.pets alter column description set not null;

drop policy if exists "Public reads available animals" on public.pets;
drop policy if exists "Public reads available pets" on public.pets;
create policy "Public reads available pets" on public.pets for select using (status = 'available');
drop policy if exists "Organizations create own animals" on public.pets;
drop policy if exists "Organizations update own animals" on public.pets;
drop policy if exists "Organizations create own pets" on public.pets;
drop policy if exists "Organizations update own pets" on public.pets;
create policy "Organizations create own pets" on public.pets for insert with check (
  exists (select 1 from public.organizations where organizations.id = pets.ong_id and organizations.owner_id = auth.uid())
);
create policy "Organizations update own pets" on public.pets for update using (
  exists (select 1 from public.organizations where organizations.id = pets.ong_id and organizations.owner_id = auth.uid())
) with check (
  exists (select 1 from public.organizations where organizations.id = pets.ong_id and organizations.owner_id = auth.uid())
);

alter table public.medical_records drop constraint if exists medical_records_pet_id_fkey;
alter table public.medical_records add constraint medical_records_pet_id_fkey foreign key (pet_id) references public.personal_pets(id) on delete cascade;
drop policy if exists "Users manage own medical records" on public.medical_records;
create policy "Users manage own medical records" on public.medical_records for all using (
  exists (select 1 from public.personal_pets where personal_pets.id = medical_records.pet_id and personal_pets.owner_id = auth.uid())
) with check (
  exists (select 1 from public.personal_pets where personal_pets.id = medical_records.pet_id and personal_pets.owner_id = auth.uid())
);

select pg_notify('pgrst', 'reload schema');
