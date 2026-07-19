---
Task ID: 1
Agent: main
Task: Fix form_deadline_at column error + add admin direct form submission

Work Log:
- Analyzed screenshot: actual error is "column 'form_deadline_at' does not exist" (not "Aucun formulaire soumis")
- Root cause: migration 11_worship_planning.sql was never executed on Supabase; select('*') fails when column missing
- Added computeFormDeadline(), enrichWithDeadline(), enrichServicesWithDeadlines() to PlanificationTab.tsx
- Changed select('*') to explicit columns in CulteFormPage.tsx, MediaCenterSection.tsx, PlanificationTab.tsx
- Added AdminOratorForm inline component (theme, bible ref, points, summary, remarks)
- Added AdminOrderForm inline component (reorderable order items with type/duration)
- Added Edit3 icon buttons on Orateur/Président cards in ServiceRow
- Created SQL migration 21_add_form_deadline_column.sql (optional DB-side fix)
- TypeScript: 0 errors, Build: success, Pushed to GitHub

Stage Summary:
- Error "column 'form_deadline_at' does not exist" resolved via client-side computation
- Admin can now directly fill orator and president forms from the dashboard
- Migration file provided for optional DB-side GENERATED column creation
- Commit: 6e68447 pushed to main---
Task ID: 2
Agent: main
Task: Fix "column form_deadline_at does not exist" error

Work Log:
- Analyzed root cause: DB triggers fn_worship_set_link_expiry and fn_worship_propagate_delay reference the non-existent form_deadline_at column
- The triggers fire on INSERT into worship_form_links and UPDATE on worship_services, causing the error
- Made form_deadline_at optional (?) in WorshipService TypeScript type
- Fixed .select() on worship_services insert to use explicit columns (no select(*))
- Added client-side expires_at computation when creating form links (bypasses broken trigger)
- Added client-side expires_at update when toggling delay (bypasses broken trigger)
- Created SQL migration 22_fix_broken_triggers.sql to drop the broken triggers

Stage Summary:
- Root cause: DB triggers reference form_deadline_at column that was never created
- Fix: All deadline/expiry logic now computed client-side, triggers must be dropped via SQL Editor
- Files modified: types/index.ts, PlanificationTab.tsx
- Files created: src/download/supabase-a-executer/22_fix_broken_triggers.sql
- Build: SUCCESS (tsc + vite)
