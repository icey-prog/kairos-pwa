import { create } from 'zustand'

const useStore = create((set) => ({
  moodLogged: false,
  currentMood: null,
  xpBalance: 0,
  activeTask: null,
  mainTab: 'focus',
  activeTab: 'timer',

  setMood: (score) => set({ currentMood: score, moodLogged: true }),
  setXpBalance: (balance) => set({ xpBalance: balance }),
  setActiveTask: (task) => set({ activeTask: task }),
  setMainTab: (tab) => set({ mainTab: tab }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))

export default useStore
