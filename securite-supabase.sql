-- =====================================================================
-- Nenu Jolof — Verrouillage de l'acces aux donnees
-- A executer dans Supabase : Dashboard > SQL Editor > New query > Run
-- =====================================================================
--
-- CONTEXTE
-- La table app_state contient tout le fichier client (noms, telephones,
-- adresses) et l'etat des creances. Jusqu'ici, RLS etait bien active mais
-- la politique « anon_full_access » accordait un acces TOTAL (lecture,
-- ecriture, suppression) au role anon. Or la cle anon est publiee dans
-- nenujolof.html, lui-meme dans un depot GitHub public : n'importe qui
-- pouvait donc lire et modifier ces donnees.
--
-- CE QUE FAIT CE SCRIPT
-- 1. Supprime la politique permissive.
-- 2. N'autorise l'acces qu'aux sessions authentifiees, et uniquement pour
--    les adresses email listees ci-dessous. Meme si une personne
--    inconnue parvenait a creer un compte sur le projet, elle ne verrait
--    rien.
-- 3. Ne cree AUCUNE politique DELETE : l'application n'a jamais besoin
--    d'effacer la ligne, donc plus personne ne peut l'effacer.
--
-- POUR AJOUTER UN COLLABORATEUR PLUS TARD
-- Ajoutez son email dans la liste des trois politiques ci-dessous, puis
-- reexecutez ce fichier en entier.
-- =====================================================================

drop policy if exists anon_full_access        on public.app_state;
drop policy if exists lecture_autorisee       on public.app_state;
drop policy if exists insertion_autorisee     on public.app_state;
drop policy if exists mise_a_jour_autorisee   on public.app_state;

alter table public.app_state enable row level security;

create policy lecture_autorisee on public.app_state
  for select to authenticated
  using ( (auth.jwt() ->> 'email') in ('nenujolof@gmail.com') );

create policy insertion_autorisee on public.app_state
  for insert to authenticated
  with check ( (auth.jwt() ->> 'email') in ('nenujolof@gmail.com') );

create policy mise_a_jour_autorisee on public.app_state
  for update to authenticated
  using      ( (auth.jwt() ->> 'email') in ('nenujolof@gmail.com') )
  with check ( (auth.jwt() ->> 'email') in ('nenujolof@gmail.com') );

-- Verification : doit renvoyer 3 lignes, toutes sur le role {authenticated}
select policyname, cmd, roles::text
from pg_policies
where schemaname = 'public' and tablename = 'app_state'
order by policyname;
