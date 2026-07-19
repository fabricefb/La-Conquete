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
- Commit: 6e68447 pushed to main