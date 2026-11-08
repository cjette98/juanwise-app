import { describe, expect, it } from 'vitest';
import { averageTriesToPass } from './performance-score';

describe('averageTriesToPass', () => {
  it('averages attemptSeq over passing entries only', () => {
    expect(
      averageTriesToPass([
        { medal: 'gold', attemptSeq: 1 },
        { medal: 'bronze', attemptSeq: 3 },
        { medal: null, attemptSeq: 3 },
      ]),
    ).toBe(2);
  });

  it('rounds to one decimal', () => {
    expect(
      averageTriesToPass([
        { medal: 'gold', attemptSeq: 1 },
        { medal: 'gold', attemptSeq: 1 },
        { medal: 'gold', attemptSeq: 2 },
      ]),
    ).toBe(1.3);
  });

  it('returns null with no passes', () => {
    expect(averageTriesToPass([{ medal: null, attemptSeq: 3 }])).toBeNull();
    expect(averageTriesToPass([])).toBeNull();
  });
});
