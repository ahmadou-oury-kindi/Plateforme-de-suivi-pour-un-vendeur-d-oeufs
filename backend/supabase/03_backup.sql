-- =====================================================================
--  03_backup.sql — archivage automatique de app_state
--
--  Pourquoi : app_state ne contient qu'une ligne, reecrite en entier a
--  chaque sauvegarde. Une erreur de fusion, un import JSON malheureux ou
--  une « Restauration depuis le cloud » faite au mauvais moment
--  remplacent donc tout l'etat d'un coup, sans historique.
--
--  Ce script conserve les 50 versions precedentes. Il ne remplace pas la
--  fusion cote frontend (voir frontend/src/js/core/merge.js) : celle-la
--  empeche la perte, celui-ci la rend reparable.
--
--  Rejouable : le relancer ne detruit aucune donnee.
-- =====================================================================

create table if not exists app_state_backup (
  snap_id        bigserial   primary key,
  taken_at       timestamptz not null default now(),
  note           text,
  src_updated_at timestamptz,
  data           jsonb       not null
);

-- Archive la version precedente avant toute ecriture qui change data.
-- security definer : la fonction s'execute avec les droits de son
-- proprietaire, ce qui lui donne acces a une table que le frontend, lui,
-- ne peut pas toucher (voir le verrou plus bas).
create or replace function archive_app_state() returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  insert into app_state_backup (note, src_updated_at, data)
  values ('auto avant ecriture', old.updated_at, old.data);

  delete from app_state_backup
   where snap_id in (
     select snap_id from app_state_backup
      where note = 'auto avant ecriture'
      order by snap_id desc offset 50
   );

  return new;
end $$;

drop trigger if exists trg_archive_app_state on app_state;
create trigger trg_archive_app_state before update on app_state
for each row when (old.data is distinct from new.data)
execute function archive_app_state();

-- Verrou : les sauvegardes ne sont lisibles que depuis le SQL Editor.
-- RLS active sans aucune policy = personne ne passe, et les droits sont
-- retires aux deux roles que le frontend peut endosser.
alter table app_state_backup enable row level security;
revoke all on app_state_backup from anon, authenticated;

-- ---------------------------------------------------------------------
--  Verification : doit renvoyer une ligne, trg_archive_app_state
-- ---------------------------------------------------------------------
select tgname from pg_trigger
 where tgrelid = 'app_state'::regclass and not tgisinternal;

-- ---------------------------------------------------------------------
--  Restaurer une version archivee (a executer a la main, en connaissance
--  de cause — cela ecrase l'etat courant) :
--
--    select snap_id, taken_at, src_updated_at,
--           jsonb_array_length(data->'sales') as ventes
--      from app_state_backup order by snap_id desc limit 20;
--
--    update app_state set data = (
--      select data from app_state_backup where snap_id = <le bon snap_id>
--    ), updated_at = now() where id = 1;
-- ---------------------------------------------------------------------
