/**
 * The rules for the three profile fields a user types freely: full name, grade
 * level and section. Registration and the profile editor both check them, and
 * `juanwise-be` `shared/constants.ts` keeps the same three patterns — a value
 * this module accepts must be one the API accepts, or the user is told the
 * field is fine and then handed a server error.
 *
 * Asked for in the client evaluation (items 1.1–1.3): a name with `@#$%^&*` in
 * it, a grade of `999` and a section of `!!!` were all being stored.
 */

/**
 * Letters and spaces only. `\p{L}` rather than `A-Za-z` so "Niña" and
 * "José" pass — they are alphabetical, and the point of the rule is to keep
 * punctuation and digits out.
 *
 * Note the cost of taking the rule literally: "Dela Cruz-Santos" and "Jr."
 * are refused, since a hyphen and a period are not letters or spaces.
 */
export const FULL_NAME_REGEX = /^\p{L}+(?: \p{L}+)*$/u;
/** Letters and digits, no spaces or punctuation — e.g. "Infinity1". */
export const SECTION_REGEX = /^[A-Za-z0-9]+$/;
/** 1 to 12, no leading zero. */
export const GRADE_REGEX = /^(?:[1-9]|1[0-2])$/;

export const MAX_FULL_NAME = 80;
export const MAX_SECTION = 40;

/**
 * A full name is letters and single spaces, and carries at least two words —
 * the two-word rule predates the evaluation and the client never asked for it
 * to go.
 */
export function isFullName(value: string): boolean {
  const name = value.trim();
  if (name.length === 0 || name.length > MAX_FULL_NAME) return false;
  if (!FULL_NAME_REGEX.test(name)) return false;
  return name.split(' ').length >= 2;
}

export function isGradeLevel(value: string): boolean {
  return GRADE_REGEX.test(value.trim());
}

export function isSection(value: string): boolean {
  const section = value.trim();
  return section.length > 0 && section.length <= MAX_SECTION && SECTION_REGEX.test(section);
}

/**
 * What a text field should keep as the user types. Dropping the character
 * instead of waiting for a blur is what the client asked for — "prevent"
 * special characters, not report them afterwards — and it keeps the keyboard
 * from fighting the error message on every keystroke.
 *
 * Each of these is paired with its `is*` check: filtering stops `@` from being
 * typed, the check still has to run, because a filtered value can be empty or
 * a single word.
 */
export function filterNameInput(value: string): string {
  // Internal runs of whitespace collapse to one space so "Juan   Cruz" cannot
  // be typed, but a trailing space has to survive: the user is mid-name.
  return value.replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').slice(0, MAX_FULL_NAME);
}

export function filterGradeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

export function filterSectionInput(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, MAX_SECTION);
}

// ─── Identity fields (Correction 1, F9) ──────────────────────────────────────
// Set at registration and, since F9, fixable by the user from their profile.
// Both screens check them with these; the API (`users.schema.ts`) has the same
// rules and also checks the email's domain against the role.

export const LRN_REGEX = /^\d{12}$/;
export const TEACHER_ID_REGEX = /^\d{7}$/;
export const GMAIL_REGEX = /^[^\s@]+@gmail\.com$/i;
export const USERNAME_REGEX = /^\S+$/;

/**
 * Mirrors TEACHER_EMAIL_DOMAINS in juanwise-be `shared/constants.ts` — kept here
 * only for instant feedback; the API re-checks it. Not every teacher has a
 * department mailbox yet, and an admin is a teacher account granted the claim
 * out of band, so admins inherit the same list.
 */
export const TEACHER_EMAIL_DOMAINS = ['@deped.gov.ph', '@gmail.com', '@yopmail.com'];
export const TEACHER_EMAIL_REGEX = /^\S+@(deped\.gov\.ph|gmail\.com|yopmail\.com)$/i;

/** 3 to 30 characters with no spaces, as the API's `usernameSchema`. */
export function isUsername(value: string): boolean {
  const username = value.trim();
  return username.length >= 3 && username.length <= 30 && USERNAME_REGEX.test(username);
}

export interface IdentityFields {
  username: string;
  email: string;
  lrn: string;
  teacherId: string;
}

/**
 * The identity fields the user actually changed, trimmed, holding only the
 * ones their role has: LRN for a student, teacher ID for a teacher. An empty
 * object means there is nothing to confirm with a password.
 */
export function identityChanges(
  current: IdentityFields,
  draft: IdentityFields,
  isTeacher: boolean,
): Partial<IdentityFields> {
  const changes: Partial<IdentityFields> = {};
  const keys: (keyof IdentityFields)[] = ['username', 'email', isTeacher ? 'teacherId' : 'lrn'];
  // The API stores emails lowercased, so a change of case alone is no change.
  const normal = (key: keyof IdentityFields, value: string) => (key === 'email' ? value.trim().toLowerCase() : value.trim());
  for (const key of keys) {
    const next = normal(key, draft[key]);
    if (next !== normal(key, current[key])) changes[key] = next;
  }
  return changes;
}

/** The translation key of the first rule a changed identity field breaks, or null. */
export function identityError(
  changes: Partial<IdentityFields>,
  isTeacher: boolean,
): 'invalidUsernameMsg' | 'invalidGmailMsg' | 'invalidDepedGmailMsg' | 'invalidLrnMsg' | 'invalidTeacherIdMsg' | null {
  if (changes.username !== undefined && !isUsername(changes.username)) return 'invalidUsernameMsg';
  if (changes.email !== undefined) {
    if (isTeacher && !TEACHER_EMAIL_REGEX.test(changes.email)) return 'invalidDepedGmailMsg';
    if (!isTeacher && !GMAIL_REGEX.test(changes.email)) return 'invalidGmailMsg';
  }
  if (changes.lrn !== undefined && !LRN_REGEX.test(changes.lrn)) return 'invalidLrnMsg';
  if (changes.teacherId !== undefined && !TEACHER_ID_REGEX.test(changes.teacherId)) return 'invalidTeacherIdMsg';
  return null;
}
