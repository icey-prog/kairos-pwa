import { create } from 'zustand'

const useStore = create((set) => ({
  moodLogged: false,
  currentMood: null,
  xpBalance: 0,
  activeTask: null,
  mainTab: 'focus',
  activeTab: 'timer',

  // Formation (discipline detail) overlay — main views stay mounted underneath.
  activeView: 'main',            // 'main' | 'discipline'
  activeDisciplineSlug: null,
  pendingReviewSlug: null,       // signal: SpacedRepetition auto-starts a filtered review

  setMood: (score) => set({ currentMood: score, moodLogged: true }),
  setXpBalance: (balance) => set({ xpBalance: balance }),
  setActiveTask: (task) => set({ activeTask: task }),
  setMainTab: (tab) => set({ mainTab: tab }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  openDiscipline: (slug) => set({ activeView: 'discipline', activeDisciplineSlug: slug }),
  closeDiscipline: () => set({ activeView: 'main' }),
  setPendingReviewSlug: (slug) => set({ pendingReviewSlug: slug }),
}))

export default useStore
