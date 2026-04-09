// Eisenhower → priority_score.
//
// v1 uses a simple weighted sum: urgency * 1.5 + importance.
// The `priority_score` column on Task / Project is the future-model slot —
// when v2 introduces a smarter weighting function, replace this single
// function and everything downstream picks up the new values on the next
// write. Existing rows keep their v1 scores until recomputed.

const URGENCY_WEIGHT = 1.5;
const IMPORTANCE_WEIGHT = 1.0;

export function computePriorityScore(
  urgency: number,
  importance: number,
): number {
  return urgency * URGENCY_WEIGHT + importance * IMPORTANCE_WEIGHT;
}
