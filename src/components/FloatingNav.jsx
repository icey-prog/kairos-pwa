import { useState, useEffect } from 'react'
import { Sparkles, Brain, Zap, Plus, Timer, TrendingUp, CalendarDays, Trophy } from 'lucide-react'
import useStore from '../store/useStore'
import { cn } from '../lib/utils'
import { API } from '../lib/api'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './ui/command'

export default function FloatingNav() {
  const mainTab = useStore((s) => s.mainTab)
  const setMainTab = useStore((s) => s.setMainTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const [open, setOpen] = useState(false)

  // Shortcuts: CMD+K to open command palette
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navItems = [
    { id: 'focus',     label: 'Focus',     icon: Timer },
    { id: 'search',    label: 'Search',    icon: Sparkles, center: true },
    { id: 'learn',     label: 'Learn',     icon: Brain },
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  ]

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none w-full px-6">
        <nav className={cn(
          "pointer-events-auto h-16 px-2 flex items-center gap-1 rounded-full",
          "transition-all duration-300 ease-in-out",
          // iOS 26 Liquid Glass Spec (WWDC25)
          "bg-white/40 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(255,255,255,0.4)]",
          // Dark/Glass Mode
          "glass-mode:bg-black/40 glass-mode:border-white/10 glass-mode:shadow-[0_8px_32px_0_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(255,255,255,0.1)] glass-mode:text-white"
        )}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = mainTab === item.id || (item.center && open)
            
            if (item.center) {
              return (
                <button
                  key={item.id}
                  onClick={() => setOpen(true)}
                  className={cn(
                    "relative w-14 h-12 flex items-center justify-center rounded-full transition-all duration-200",
                    "hover:scale-110 active:scale-95 group",
                    isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  <div className="absolute inset-0 bg-[var(--color-primary)] opacity-0 group-hover:opacity-10 rounded-full transition-opacity" />
                  <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
                </button>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => setMainTab(item.id)}
                className={cn(
                  "relative w-14 h-12 flex items-center justify-center rounded-full transition-all duration-200",
                  "hover:scale-105 active:scale-95",
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"
                )}
              >
                <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { setMainTab('focus'); setActiveTab('timer'); setOpen(false); }}>
              <Timer className="mr-2 h-4 w-4" />
              <span>Go to Focus Timer</span>
            </CommandItem>
            <CommandItem onSelect={() => { setMainTab('focus'); setActiveTab('planner'); setOpen(false); }}>
              <CalendarDays className="mr-2 h-4 w-4" />
              <span>Open Daily Planner</span>
            </CommandItem>
            <CommandItem onSelect={() => { setMainTab('learn'); setActiveTab('sr'); setOpen(false); }}>
              <Brain className="mr-2 h-4 w-4" />
              <span>Start Learning Session</span>
            </CommandItem>
            <CommandItem onSelect={() => { setMainTab('dashboard'); setActiveTab('badges'); setOpen(false); }}>
              <Trophy className="mr-2 h-4 w-4" />
              <span>View My Badges</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => {
              fetch(`${API}/xp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 10, reason: 'Quick XP via command palette' }),
              }).catch(() => {})
              setOpen(false)
            }}>
              <Zap className="mr-2 h-4 w-4 text-amber-400" />
              <span>Log Quick XP (+10)</span>
            </CommandItem>
            <CommandItem onSelect={() => { setMainTab('focus'); setActiveTab('planner'); setOpen(false); }}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create New Task</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
