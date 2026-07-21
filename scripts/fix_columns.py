#!/usr/bin/env python3
"""Fix missing columns and add form_deadline_at to worship_services.
Execute SQL via Supabase Management API... but we can't.
Instead, generate the SQL for the user to run.
"""

# Actually, we can't execute DDL via REST API.
# Generate the ALTER TABLE statements.

sql_statements = []

# 1. Add form_deadline_at to worship_services
sql_statements.append("""ALTER TABLE worship_services ADD COLUMN IF NOT EXISTS form_deadline_at TIMESTAMPTZ;""")

# 2. Add updated_at to worship_form_links if missing  
sql_statements.append("""ALTER TABLE worship_form_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();""")

# 3. Remove sort_order from worship_services if it exists (extra column)
sql_statements.append("""DO $$ BEGIN ALTER TABLE worship_services DROP COLUMN IF EXISTS sort_order; EXCEPTION WHEN OTHERS THEN NULL; END $$;""")

print("-- Exécuter dans Supabase SQL Editor:")
for s in sql_statements:
    print(s)
    print()
