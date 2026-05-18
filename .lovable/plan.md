## Part 1 — Run Chunk A migration first (was never executed)

Single migration file adding everything the checklist needs:

**`inspections`** — add: `inspector_name TEXT`, `job_type TEXT` CHECK in (`vehicle_return`,`repossession`,`new_acquisition`,`mechanic_run`,`dmv_reg`,`inspection`), `checklist_items JSONB DEFAULT '{}'::jsonb`, `ready_to_rent BOOLEAN`, `submitted_at TIMESTAMPTZ DEFAULT now()`. Widen `fuel_level` CHECK to (`full`,`three_quarter`,`half`,`quarter`,`empty`). Nothing to drop — the `*_status`/`*_notes` columns you mentioned don't exist on this project.

**`tasks`** — add: `runner_name TEXT`, `year INTEGER`, `make TEXT`, `model TEXT`, `plate TEXT`, `priority_level TEXT` CHECK in (`urgent`,`normal`,`flexible`) DEFAULT `'normal'`. Keep existing `priority INTEGER` (runner.tsx + tasks.tsx sort by it) — Chunk C/D can migrate later.

**`maintenance`** — add `source_inspection_id UUID` (nullable, FK → `inspections(id) ON DELETE SET NULL`).

**`vehicles`** — add `has_open_issues BOOLEAN NOT NULL DEFAULT false`.

**Triggers**:
- `inspections_after_write` (AFTER INSERT OR UPDATE): collects keys where `checklist_items->>key = 'fail'`, plus `'damage'` if `damage_noted`, plus `'flagged needs mechanic'` if `ready_to_rent = false`. If non-empty AND no existing open `maintenance` row with this `source_inspection_id`, INSERT `maintenance (vehicle_id, service_type='Auto-generated from inspection: '||list, date_completed=NULL, notes, source_inspection_id=NEW.id)` and set `vehicles.has_open_issues = true`.
- `maintenance_after_change` (AFTER INSERT OR UPDATE OF date_completed OR DELETE): recompute `vehicles.has_open_issues` = EXISTS(open ticket for that vehicle).

## Part 2 — Checklist UI

**Route**: new `src/routes/checklist.tsx` (public-ish, requires auth via existing pattern — same as current inspection flow). Old inspection form left untouched for now.

**Page**: `<h1>Vehicle Condition Checklist</h1>`, Camauto green `#00a849` primary, white bg / black text, all tap targets ≥44px, mobile-first single column.

**Tokens**: add `--brand-green: oklch(...)` for `#00a849` plus `--brand-green-foreground` in `src/styles.css`; new `Button` variant `brand` so we don't sprinkle hex.

**Sections** (in one form component, local state → single insert on submit):

1. **Job Info** — Inspector name input (read/write `localStorage.inspector_name`, save on blur). Vehicle `<Select>` populated from `vehicles` table (`year make model — plate`). "Jobs Completed Today" counter via server fn counting `inspections where inspector_name = X and submitted_at::date = current_date`.
2. **Job Type** — 6 toggle buttons in `grid-cols-2 md:grid-cols-3`, each with emoji + label, single-select → `jobType` state.
3. **Checklist** — 5 collapsible sections (`Accordion`, first open by default) with the 25 items exactly as listed. Each row: label + 3 buttons Pass/Fail/N/A. Section header shows `Name (n/total)` based on items with a value. State: `Record<string,'pass'|'fail'|'na'>`. Item keys hard-coded in a config object grouped by section so render + count stays simple.
4. **Ready to Rent** — two big radio cards, mutually exclusive → `readyToRent: boolean | null`.
5. **Visible Damage** — Yes/No toggle. If Yes: multi-file `<input type=file>`, upload to existing `inspections` bucket under `damage/<uuid>/<filename>`, collect public URLs into `damagePhotos[]`. `damage_noted = (toggle === 'yes')`.
6. **Fuel Level** — 5 buttons → `fuel_level` enum value.
7. **Notes** — `<Textarea>`.

**Submit bar** — sticky bottom on mobile (`sticky bottom-0`), label "Submit Checklist to Michael". Disabled until: inspector_name, vehicle_id, job_type, ≥1 checklist item set, ready_to_rent !== null, fuel_level set.

**On submit** — call server fn `submitInspection` (`createServerFn` + `requireSupabaseAuth`) that inserts one row into `inspections` with: `vehicle_id`, `inspector_name`, `job_type`, `checklist_items`, `fuel_level`, `ready_to_rent`, `damage_noted`, `damage_photos`, `notes`, `submitted_at=now()`, `type='checklist'` (existing NOT NULL column — pick a value that fits the enum; will read it in the migration to confirm). Trigger handles maintenance ticket.

**Confirmation screen** — after success, swap form for a summary card: vehicle string, job type, pass/fail/na counts, fuel level, ready-to-rent status, and a yellow notice "🛠️ Maintenance ticket auto-created" when `anyFail || damage_noted || !readyToRent`. Buttons: **New Inspection** (reset state, back to step 1) and **Done** (`navigate({ to: '/runner' })`).

**Files added/changed**
- `supabase/migrations/<ts>_inspection_checklist_schema.sql` (Chunk A)
- `src/routes/checklist.tsx`
- `src/lib/checklist.functions.ts` (server fns: `listVehicles`, `getJobsCompletedToday`, `submitInspection`, `uploadDamagePhoto` or use direct browser upload)
- `src/lib/checklist-items.ts` (the 25-item config)
- `src/styles.css` — add brand-green token
- `src/components/ui/button.tsx` — add `brand` variant (or use inline `className` against the token if you'd rather not touch the shared file — tell me)

**Out of scope** (per your message): tasks pages, owner dashboard, PIN auth, replacing the existing inspection form route.

**One thing I need to confirm before coding** — `inspections.type` is currently `NOT NULL` with a `USER-DEFINED` enum. I'll read that enum in the migration step and pick the safest existing value (likely `pickup` or similar) to default the new checklist rows to, unless you want me to add a new enum value `checklist`. Default plan: reuse the closest existing value silently; no schema change to the enum.