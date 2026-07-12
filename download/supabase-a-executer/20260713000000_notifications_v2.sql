-- ═══════════════════════════════════════════════════════════════════
--  Migration Complémentaire v2 — Notifications + Améliorations Profils
--  Église Évangélique La Conquête — Juillet 2026
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. TABLE: notifications (in-app) ──────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'prayer_prayed', 'service_assigned', 'service_accepted',
    'service_declined', 'role_approved', 'role_rejected',
    'new_post', 'new_comment', 'daily_thought', 'general',
    'visitor_assigned', 'onboarding_reminder'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  -- Pour lier à l'entité concernée (ex: prayer_request.id, role_request.id)
  ref_table TEXT,
  ref_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. Améliorations user_profiles ────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'joined_via'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN joined_via TEXT CHECK (joined_via IN (
      'word_of_mouth', 'social_media', 'event', 'website', 'invitation', 'other'
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'membership_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN membership_date DATE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'previous_role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN previous_role TEXT;
  END IF;
END $$;

-- ─── 3. Fonction : créer une notification ─────────────────────
-- Cette fonction SECURITY DEFINER permet de créer des notifications
-- depuis n'importe quel contexte (trigger, RPC, etc.)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_ref_table TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL
) RETURNS UUID AS $$
  DECLARE
    v_id UUID;
  BEGIN
    INSERT INTO notifications (user_id, type, title, body, link, ref_table, ref_id)
    VALUES (p_user_id, p_type, p_title, p_body, p_link, p_ref_table, p_ref_id)
    RETURNING id INTO v_id;
    RETURN v_id;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 4. RPC : Soumettre une requête de prière (anonyme ou non) ─
-- Permet aux visiteurs non authentifiés de soumettre des prières
-- via un appel RPC depuis le client Supabase
CREATE OR REPLACE FUNCTION submit_prayer_request(
  p_content TEXT,
  p_author_name TEXT DEFAULT 'Anonyme',
  p_is_anonymous BOOLEAN DEFAULT true,
  p_is_confidential BOOLEAN DEFAULT false
) RETURNS UUID AS $$
  DECLARE
    v_id UUID;
    v_user_id UUID;
  BEGIN
    -- Si l'utilisateur est connecté, lier à son profil
    v_user_id := auth.uid();

    INSERT INTO prayer_requests (user_id, author_name, content, is_anonymous, is_confidential)
    VALUES (
      v_user_id,
      CASE WHEN p_is_anonymous THEN 'Anonyme' ELSE COALESCE(p_author_name, 'Anonyme') END,
      p_content,
      p_is_anonymous,
      p_is_confidential
    )
    RETURNING id INTO v_id;

    -- Notifier les pasteurs de la nouvelle requête
    INSERT INTO notifications (user_id, type, title, body, ref_table, ref_id)
    SELECT
      up.id,
      'prayer_prayed'::text,
      'Nouvelle requête de prière'::text,
      CASE WHEN p_is_anonymous THEN 'Une demande anonyme a été soumise.' ELSE p_author_name || ' a soumis une demande de prière.' END,
      'prayer_requests'::text,
      v_id
    FROM user_profiles up
    WHERE up.role_level >= 5 OR up.is_admin = true;

    RETURN v_id;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Trigger : Notification quand un pasteur prie ──────────
CREATE OR REPLACE FUNCTION notify_prayer_prayed()
RETURNS TRIGGER AS $$
BEGIN
  -- Si prayed_by est défini et status change vers 'praying'
  IF NEW.prayed_by IS NOT NULL AND NEW.prayed_at IS NOT NULL AND (OLD.prayed_by IS NULL OR OLD.prayed_at IS NULL) THEN
    -- Notifier l'auteur de la requête
    IF NEW.user_id IS NOT NULL AND NEW.user_id != NEW.prayed_by THEN
      INSERT INTO notifications (user_id, type, title, body, ref_table, ref_id)
      VALUES (
        NEW.user_id,
        'prayer_prayed',
        'Votre requête de prière a été prise en charge',
        (SELECT full_name FROM user_profiles WHERE id = NEW.prayed_by) || ' a prié pour votre requête aujourd''hui.',
        'prayer_requests',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_prayer_prayed ON prayer_requests;
CREATE TRIGGER on_prayer_prayed
  AFTER UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION notify_prayer_prayed();

-- ─── 6. Trigger : Notification quand un rôle est validé ───────
CREATE OR REPLACE FUNCTION notify_role_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO notifications (user_id, type, title, body, ref_table, ref_id)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.status = 'approved' THEN 'role_approved' ELSE 'role_rejected' END,
      CASE WHEN NEW.status = 'approved'
        THEN 'Votre demande de rôle a été approuvée !'
        ELSE 'Votre demande de rôle a été refusée'
      END,
      CASE WHEN NEW.status = 'approved'
        THEN 'Vous êtes maintenant ' || NEW.requested_role || '.'
        ELSE COALESCE(NEW.admin_note, 'Contactez l''administration pour plus d''informations.')
      END,
      'role_requests',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_role_decision ON role_requests;
CREATE TRIGGER on_role_decision
  AFTER UPDATE ON role_requests
  FOR EACH ROW EXECUTE FUNCTION notify_role_decision();

-- ─── 7. RLS sur notifications ─────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS notif_select ON notifications;
  CREATE POLICY notif_select ON notifications FOR SELECT
    USING (user_id = auth.uid());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS notif_update ON notifications;
  CREATE POLICY notif_update ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

-- Pas de policy INSERT publique : les notifications sont créées
-- uniquement via triggers ou la fonction create_notification (SECURITY DEFINER)

-- ─── 8. Index ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifs_user_unread
  ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifs_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role_level ON user_profiles(role_level);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_membership ON user_profiles(membership_date) WHERE membership_date IS NOT NULL;

-- ─── 9. Mettre à jour le trigger handle_new_user pour le joined_via ─
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, joined_via)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'joined_via'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════
--  Done!
-- ═══════════════════════════════════════════════════════════════════