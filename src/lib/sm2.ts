/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality ratings:
 *   0 = Again  (complete blackout, wrong answer)
 *   1 = Hard   (correct with serious difficulty)
 *   2 = Good   (correct with some hesitation)
 *   3 = Easy   (perfect response)
 */

export interface ReviewResult {
  easeFactor: number;
  intervalDays: number;
  dueDate: string;
  repetitions: number;
}

/**
 * Calculates the next review schedule based on SM-2 algorithm.
 *
 * @param easeFactor  - Current ease factor (EF), minimum 1.3
 * @param intervalDays - Current interval in days
 * @param repetitions  - Number of successful reviews so far
 * @param quality      - User rating 0-3
 * @returns Updated ReviewResult with new schedule
 */
export function calculateNextReview(
  easeFactor: number,
  intervalDays: number,
  repetitions: number,
  quality: number
): ReviewResult {
  // Clamp quality to valid range
  const q = Math.max(0, Math.min(3, Math.round(quality)));

  let newEaseFactor = easeFactor;
  let newInterval = intervalDays;
  let newRepetitions = repetitions;

  if (q === 0) {
    // Again: reset to beginning
    newRepetitions = 0;
    newInterval = 1;
    // Decrease ease factor significantly
    newEaseFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    // Correct response (Hard, Good, or Easy)
    // Update ease factor based on quality
    // EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
    const efDelta = 0.1 - (3 - q) * (0.08 + (3 - q) * 0.02);
    newEaseFactor = Math.max(1.3, easeFactor + efDelta);

    // Calculate interval
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * newEaseFactor);
    }

    // Apply quality modifier for Hard/Easy
    if (q === 1) {
      // Hard: shorter interval
      newInterval = Math.max(1, Math.round(newInterval * 0.6));
    } else if (q === 3) {
      // Easy: longer interval
      newInterval = Math.round(newInterval * 1.3);
    }

    newRepetitions = repetitions + 1;
  }

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  return {
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    intervalDays: Math.max(1, newInterval),
    dueDate: dueDateStr,
    repetitions: newRepetitions,
  };
}

/**
 * Returns a human-readable description of the interval.
 */
export function formatInterval(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  const months = Math.round(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}
