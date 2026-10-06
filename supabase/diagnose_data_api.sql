-- Diagnóstico do banco. Execute no SQL Editor do MESMO projeto da URL em .env.local.
select current_database() as database_name, current_schema() as active_schema;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'organizations', 'animals', 'pets', 'adoption_requests')
order by table_name;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'organizations')
order by table_name, ordinal_position;

-- Recarrega o schema que o endpoint /rest/v1 usa.
select pg_notify('pgrst', 'reload schema');
