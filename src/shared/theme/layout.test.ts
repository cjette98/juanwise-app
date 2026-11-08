import { describe, expect, it } from 'vitest';
import { CONTENT_MAX_WIDTH, readableColumn } from './layout';

/**
 * Adjustment 3 (revised list, item 5): the teacher screens in the app must
 * adapt to the screen size. Content keeps a readable width on a tablet and
 * still fills a phone.
 */
describe('readableColumn', () => {
  it('is wider than any phone, so phones keep the full width', () => {
    // The widest current phones are about 440 pt across in portrait.
    expect(CONTENT_MAX_WIDTH).toBeGreaterThan(440);
  });

  it('is narrower than a tablet in portrait, and centres the column there', () => {
    // The smallest iPad is 744 pt across in portrait.
    expect(CONTENT_MAX_WIDTH).toBeLessThan(744);
    expect(readableColumn).toMatchObject({ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' });
  });
});
