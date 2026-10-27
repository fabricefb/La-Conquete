-- ═══════════════════════════════════════════════════════════════
-- 29 — Fiche pasteur : famille et ministère
-- Ajoute deux champs éditoriaux lus par la page Équipe pastorale
-- et le dossier de fiche. Idempotent : peut être rejoué sans risque.
-- À exécuter dans Supabase → SQL Editor.
-- Les policies existantes de public.pastors ne sont pas modifiées.
-- ═══════════════════════════════════════════════════════════════

alter table public.pastors
  add column if not exists family text not null default '',
  add column if not exists ministry text not null default '';

comment on column public.pastors.family is
  'Situation familiale / présentation de la famille du pasteur (texte libre).';
comment on column public.pastors.ministry is
  'Ministère, département ou charge portée au sein de l''église (texte libre).';

select '29_pastors_profile_fields appliqué' as resultat;
