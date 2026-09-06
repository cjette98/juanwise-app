/**
 * How an identification answer is compared to the answers a teacher accepted.
 *
 * The same three steps run in juanwise-be's schema, where they reject
 * alternatives that duplicate one another. Keeping the rule identical on both
 * sides is what makes the admin's uniqueness warning mean the same thing as the
 * game's grading.
 */

/** Trim, collapse repeated internal whitespace, lowercase. Nothing else. */
export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Deliberately not accent-, punctuation- or typo-insensitive: `Andrés` and
 * `Andres` are different answers, and a teacher who wants both lists both. That
 * keeps grading something an administrator can predict by reading the question,
 * rather than something that depends on a similarity threshold.
 */
export function matchesIdentificationAnswer(
  given: string,
  correctAnswer: string,
  acceptedAnswers: string[] | null = [],
): boolean {
  const normalizedGiven = normalizeAnswer(given);
  // An empty submission never matches, even against a blank stored answer.
  if (!normalizedGiven) return false;

  return [correctAnswer, ...(acceptedAnswers ?? [])].some(
    (answer) => normalizeAnswer(answer) === normalizedGiven,
  );
}
