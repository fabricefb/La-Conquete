================================================================
  A EXECUTER DANS SUPABASE - INSTRUCTIONS
  Eglise Evangelique La Conquete
================================================================

COMMENT FAIRE :
1. Va sur https://supabase.com/dashboard
2. Ouvre ton projet
3. Clique sur "SQL Editor" dans le menu de gauche
4. Pour CHAQUE fichier SQL ci-dessous (dans l'ordre) :
   - Ouvre le fichier
   - Copie TOUT le contenu
   - Colle-le dans le SQL Editor
   - Clique sur "Run" (ou le bouton vert "Execute")
5. Attends que ca dise "Success" avant de passer au suivant

================================================================
ORDRE D'EXECUTION (important - respecte cet ordre) :
================================================================

1. migration-roles-v2.sql          <-- A FAIRE EN PREMIER (base des roles)
2. 20260711120000_full_schema.sql  <-- Schema complet des tables
3. 20260711060000_erp_roles.sql    <-- Systeme de roles avance
4. 20260710150815_create_events_table.sql  <-- Table evenements
5. 20260712000000_create_media_bucket.sql  <-- Stockage fichiers
6. 20260713000000_notifications_v2.sql    <-- Systeme notifications
7. 20260714000000_features_batch.sql      <-- Les 7 nouvelles fonctionnalites

================================================================
SI UNE REQUETE ECHOUE :
- Ca peut etre normal si la table ou colonne existe deja
- Lis le message d'erreur
- Si c'est "already exists" ou "duplicate" -> PAS BESOIN DE REFAIRE
- Passe au fichier suivant
- Si c'est une autre erreur -> note-la et dis-le moi

================================================================
APRES EXECUTION :
- Les 7 fonctionnalites seront actives dans la base
- Les pages admin que je code pourront acceder aux donnees
================================================================
