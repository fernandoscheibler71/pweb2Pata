-- Reparo para bancos criados pela versão inicial, que usava `organization`/`animals`.
-- Execute este arquivo PRIMEIRO. Ele não apaga dados existentes.
create extension if not exists "pgcrypto";
do $$ begin create type public.user_role as enum ('adopter', 'organization'); exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, city text, phone text,
  owner_id uuid references public.profiles(id) on delete cascade, description text, address text,
  email text, website text, cnpj text, gallery_urls text[] not null default '{}',
  cep text, neighborhood text, state text, logo_url text, latitude numeric, longitude numeric,
  created_at timestamptz not null default now()
);
-- Complementa tabelas criadas pela correção mínima anterior.
alter table public.organizations add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.organizations add column if not exists description text;
alter table public.organizations add column if not exists address text;
alter table public.organizations add column if not exists email text;
alter table public.organizations add column if not exists website text;
alter table public.organizations add column if not exists cnpj text;
alter table public.organizations add column if not exists gallery_urls text[] not null default '{}';
alter table public.organizations add column if not exists cep text;
alter table public.organizations add column if not exists neighborhood text;
alter table public.organizations add column if not exists state text;
alter table public.organizations add column if not exists logo_url text;
alter table public.organizations add column if not exists latitude numeric;
alter table public.organizations add column if not exists longitude numeric;
do $$ begin
  if to_regclass('public.organization') is not null then
    execute 'insert into public.organizations (id,name,city,phone,owner_id,description,address,email,website,cnpj,created_at) select id,name,city,phone,owner_id,description,address,email,website,cnpj,coalesce(created_at,now()) from public.organization on conflict (id) do nothing';
  end if;
end $$;

alter table public.profiles add column if not exists role public.user_role not null default 'adopter';
alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists cep text;
alter table public.profiles add column if not exists street text;
alter table public.profiles add column if not exists number text;
alter table public.profiles add column if not exists neighborhood text;
alter table public.profiles add column if not exists state text;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Novo usuário'), coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'adopter'))
  on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public) values ('pata-amiga-images', 'pata-amiga-images', true) on conflict (id) do update set public = true;
drop policy if exists "Public reads Pata Amiga images" on storage.objects;
drop policy if exists "Authenticated uploads Pata Amiga images" on storage.objects;
drop policy if exists "Users update their Pata Amiga images" on storage.objects;
create policy "Public reads Pata Amiga images" on storage.objects for select using (bucket_id = 'pata-amiga-images');
create policy "Authenticated uploads Pata Amiga images" on storage.objects for insert to authenticated with check (bucket_id = 'pata-amiga-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update their Pata Amiga images" on storage.objects for update to authenticated using (bucket_id = 'pata-amiga-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- Atualiza imediatamente o cache do PostgREST usado pelo frontend/Supabase JS.
select pg_notify('pgrst', 'reload schema');
