# Registration input validation — design

Items 1.1–1.4 of the client evaluation ("Improvement function based on the
evaluation", 2026-10-21). Three fields a user types freely took anything:

| Field | Was accepted | Now |
| --- | --- | --- |
| Full name | `Juan @#$%^&*`, `Juan Cruz3` | Letters and single spaces, max 80 |
| Grade level | `999`, `0`, `06` | `1`–`12` |
| Section | `!!!`, `St. Rizal` | Letters and digits, max 40 — e.g. `Infinity1` |

## Where each rule lives

The rule is written twice on purpose, as the email-domain rules already are:
the client checks first so a child sees the problem on the field, and the API
checks again because the client is not trustworthy.

- `juanwise-app-v2` `src/shared/lib/profile-fields.ts` — the patterns, the
  `is*` checks and a `filter*` per field.
- `juanwise-be` `src/shared/constants.ts` — the same three patterns, used by
  `fullNameSchema`, `gradeSchema` and `sectionSchema` in
  `src/modules/users/users.schema.ts`.

Every route that writes one of the fields shares those schemas: `POST
/auth/register`, `PATCH /users/me` and `POST /classes` (a class carries a grade
level and a section too).

## Decisions worth knowing

- **Filter, don't scold.** A refused character is dropped as it is typed —
  the client asked to *prevent* special characters, and a validation message
  that fires on every keystroke fights the keyboard. The `is*` check still
  runs on submit, because a filtered value can still be empty or one word.
- **`\p{L}`, not `A-Za-z`.** "Niña" and "José" are alphabetical; the rule is
  there to keep digits and punctuation out, not accents.
- **The literal rule refuses real names.** Letters and spaces only means
  `Dela Cruz-Santos` and `Jr.` are rejected. That is what was asked for; if
  the client would rather allow `-`, `'` and `.`, it is one character class in
  two files.
- **The API accepts a one-word name.** The two-word rule belongs to the
  registration form. A mononym is a real name and the API should not be the
  thing that refuses it.
- **Accounts created before the rule are left alone.** No migration: the
  stored value stays, and the admin dashboard cleans it for display (item 1.4)
  while naming the raw value on hover, so an admin can ask the student to fix
  it. A legacy user who edits their own profile is made to fix it then, because
  `PATCH /users/me` now applies the rules.

## Item 1.4 — the web dashboard

`juanwise-admin` is the Main Admin console the evaluation describes (Dashboard,
Teachers, Students). It is read-only for accounts, so the work was display:

- Teachers page gained a **Grade & section** column — a teacher's own section
  was shown nowhere.
- Students page, Teachers page and the dashboard's class list all render
  through `gradeSection()` / `sectionNote()` in `src/shared/lib/format.ts`.

Note for the web-admin batch (W1.1–W4.1): the earlier survey of those items
looked at `juanwise-be` `src/web/webapp.ts`, which is a different, developer
surface. The pages the client names are in `juanwise-admin`.

## Testing

- `juanwise-app-v2` — `src/shared/lib/profile-fields.test.ts` (10 cases).
- `juanwise-be` — `tests/profile-field-validation.test.ts` (11 cases), each
  rule asserted against registration, `PATCH /users/me` and class creation.
- `juanwise-admin` — `src/shared/lib/format.test.ts`.

Still to do by hand: register a student and a teacher on a device and confirm
the refused characters never appear, and that the Tagalog messages read well.
