// Thin re-export / alias so api code can import week math from a single
// conventional path. The actual implementation lives in @lifeos/shared so
// the frontend can share it (no duplicate TZ logic).

export { todayInTz, startOfSprint, endOfSprint } from '@lifeos/shared';
