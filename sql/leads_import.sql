-- À lancer une seule fois dans Supabase > SQL Editor

create table if not exists public.leads_import (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fichier text,
  imported_by uuid references auth.users(id),
  civilite text,
  prenom text,
  nom text,
  adresse text,
  code_postal text,
  ville text,
  mobile text,
  telephone_1 text,
  telephone_2 text,
  email text,
  proprietaire boolean,
  nb_personnes integer,
  revenus text,
  maison_plus_15_ans boolean,
  type_habitat text,
  surface_habitable numeric,
  chauffage text
);

create index if not exists leads_import_created_idx on public.leads_import (created_at desc);
create index if not exists leads_import_fichier_idx on public.leads_import (fichier);

alter table public.leads_import enable row level security;

-- Lecture : tous les profils connectés (admin, agent, call_center)
create policy "leads_import_select" on public.leads_import
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','call_center')));

-- Import : admin seulement
create policy "leads_import_insert" on public.leads_import
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Suppression : nécessaire pour retirer la ligne quand le contact est ajouté au CRM
-- (le bouton corbeille n'est affiché qu'à l'admin dans l'interface)
create policy "leads_import_delete" on public.leads_import
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','call_center')));

-- Liste des fichiers importés (pour le filtre)
create or replace function public.leads_import_fichiers()
returns table(fichier text, n bigint)
language sql security invoker stable
as $$
  select fichier, count(*) from public.leads_import group by fichier order by max(created_at) desc
$$;
