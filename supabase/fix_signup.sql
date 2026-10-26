-- ═══════════════════════════════════════════════════════════════════════════
-- LA CONQUÊTE — CORRECTION DE L'INSCRIPTION (« Database error saving new user »)
-- À exécuter UNE FOIS dans le SQL Editor du projet yltlpljqhjnescqufibx.
--
-- Cause : les fonctions de trigger sur auth.users n'avaient pas de search_path
-- fixe (GoTrue s'exécute avec un search_path restreint) et la table
-- notification_preferences était référencée sans schéma. L'insertion du profil
-- échouait donc à chaque inscription.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, joined_via)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN NEW.raw_user_meta_data->>'joined_via' IN (
        'word_of_mouth', 'social_media', 'event', 'website', 'invitation', 'other'
      )
      THEN NEW.raw_user_meta_data->>'joined_via'
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_notif_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'auto_create_notif_prefs: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_notif ON auth.users;
CREATE TRIGGER on_auth_user_created_notif
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_notif_prefs();

-- Vérification : 2 lignes attendues
SELECT tgname, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
WHERE t.tgrelid = 'auth.users'::regclass
  AND NOT t.tgisinternal
ORDER BY tgname;
