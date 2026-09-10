-- =====================================================================
-- Nenu Jolof — Schema de la base
-- A executer dans Supabase : Dashboard > SQL Editor > New query > Run
-- A executer AVANT 02_policies.sql
-- =====================================================================
--
-- L'application stocke tout son etat dans une seule ligne JSONB
-- (id = 1). C'est volontaire : le frontend travaille sur un objet unique
-- (clients, dettes, depenses, receptions, journal, ventes) qu'il ecrit
-- entierement a chaque sauvegarde. Le meme objet est mis en cache dans
-- le localStorage du navigateur sous la cle « nj_data ».
--
-- Ne changez pas le nom de la table ni celui de la colonne « data » :
-- le frontend les utilise tels quels dans frontend/src/js/core/supabase.js.
-- =====================================================================

create table if not exists public.app_state (
  id         bigint primary key,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- La ligne unique de travail. « on conflict do nothing » rend le script
-- rejouable sans jamais ecraser les donnees existantes.
insert into public.app_state (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.app_state enable row level security;

-- Verification : doit renvoyer une ligne avec id = 1
select id, updated_at, pg_column_size(data) as taille_octets
from public.app_state;
