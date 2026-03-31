/** Derive completion from Mile's time-based model */
export const isCompleted = (task) =>
  task.target_minutes > 0 && task.spent_minutes >= task.target_minutes

/** 0–100 progress percentage */
export const getProgress = (task) =>
  task.target_minutes > 0
    ? Math.min(100, Math.round((task.spent_minutes / task.target_minutes) * 100))
    : 0

/** Adapt a Mile task to look like a Kaizen task for ported components */
export const adaptTask = (mileTask) => ({
  ...mileTask,
  completed: isCompleted(mileTask),
  duration: mileTask.target_minutes,
  xpReward: mileTask.target_minutes * 2,
  scheduledFor: new Date(),
  technique: 'kaizen',
  discipline: 'coding',
})
