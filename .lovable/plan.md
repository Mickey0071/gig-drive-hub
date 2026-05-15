## Add Contacts page

A new "Contacts" section in the sidebar with a directory of phone numbers useful to the runner/staff. Admin can add, edit, and delete entries. Everyone signed in (admin, staff, driver) can view.

### Seed contacts
- Jr Mechanic — 856-842-6885
- Ronnie G — 609-481-9686
- AutoZone Sicklerville — 856-237-0081 (commercial PIN: camauto)
- Locksmith — 302-507-2387

### Database
New `contacts` table:
- `name` (text, required)
- `phone` (text, required)
- `category` (text, e.g. Mechanic, Parts, Locksmith, Other)
- `notes` (text, e.g. "Commercial PIN: camauto")
- `created_by` (uuid)
- standard id / created_at / updated_at

RLS:
- Anyone authenticated can SELECT
- Only admins can INSERT / UPDATE / DELETE

Seed the four contacts above via insert.

### UI
- New route `src/routes/_app/contacts.tsx`
- Sidebar entry "Contacts" (Phone icon), visible to admin / staff / driver
- Card list grouped by category, showing name, tap-to-call phone link, notes
- Admin sees "Add contact" button → dialog with name / phone / category / notes
- Admin sees inline edit + delete on each card
- Search box to filter by name/category

### Out of scope
No call logging, no per-driver visibility rules beyond "all signed-in users see all contacts."
