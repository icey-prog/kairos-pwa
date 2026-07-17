import { getUsername } from './auth'

// Scoped by username so switching accounts on the same browser doesn't
// leak/carry over another user's daily mood-gate state.
export const moodDateKey = () => `mile_last_mood_date_${getUsername() || 'anon'}`
export const moodScoreKey = () => `mile_last_mood_score_${getUsername() || 'anon'}`
