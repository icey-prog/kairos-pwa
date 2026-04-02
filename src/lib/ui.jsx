import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './utils'

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({ className, children }) {
  return (
    <div className={cn('rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)]', className)}>
      {children}
    </div>
  )
}

export function CardContent({ className, children }) {
  return <div className={cn('p-4', className)}>{children}</div>
}

export function CardHeader({ className, children }) {
  return <div className={cn('p-4 pb-2', className)}>{children}</div>
}

export function CardTitle({ className, children }) {
  return <h3 className={cn('font-semibold text-base text-[var(--color-foreground)]', className)}>{children}</h3>
}

// ─── Button ──────────────────────────────────────────────────────────────────

const btnVariants = {
  default: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
  outline: 'border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]',
  ghost: 'bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
}

const btnSizes = {
  default: 'px-4 py-2 text-sm min-h-[44px]',
  sm: 'px-3 py-1.5 text-xs min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[48px]',
  icon: 'p-2 min-h-[44px] min-w-[44px]',
}

export function Button({ variant = 'default', size = 'default', className, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150',
        'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
        btnVariants[variant] ?? btnVariants.default,
        btnSizes[size] ?? btnSizes.default,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-secondary)]',
        'px-3 py-2 text-base text-[var(--color-foreground)] min-h-[44px]',
        'placeholder:text-[var(--color-muted-foreground)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30',
        className,
      )}
      {...props}
    />
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-secondary)]',
        'px-3 py-3 text-base text-[var(--color-foreground)] resize-none min-h-[44px]',
        'placeholder:text-[var(--color-muted-foreground)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30',
        className,
      )}
      {...props}
    />
  )
}

// ─── Badge (UI chip, not achievement) ────────────────────────────────────────

const badgeVariants = {
  default: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]',
  outline: 'border border-[var(--color-border)] text-[var(--color-foreground)]',
  destructive: 'bg-red-500/10 text-red-500',
}

export function Badge({ variant = 'default', className, children }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      badgeVariants[variant] ?? badgeVariants.default,
      className,
    )}>
      {children}
    </span>
  )
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

const DialogCtx = createContext(null)

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogCtx.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogCtx.Provider>
  )
}

export function DialogTrigger({ asChild, children }) {
  const { onOpenChange } = useContext(DialogCtx)
  const handleClick = () => onOpenChange(true)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: handleClick })
  }
  return <span onClick={handleClick}>{children}</span>
}

export function DialogContent({ children, className }) {
  const { open, onOpenChange } = useContext(DialogCtx)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className={cn(
        'relative z-10 w-full max-w-lg rounded-2xl shadow-2xl',
        'bg-[var(--color-card)] border border-[var(--color-border)]',
        'p-6 max-h-[90vh] overflow-y-auto',
        className,
      )}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({ className, children }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function DialogTitle({ className, children }) {
  return (
    <h2 className={cn('text-lg font-semibold text-[var(--color-foreground)]', className)}>
      {children}
    </h2>
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────

const SelectCtx = createContext(null)

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Collect options by traversing children
  const options = []
  const collectOptions = (node) => {
    if (!React.isValidElement(node)) return
    if (node.type === SelectItem) {
      options.push({ value: node.props.value, children: node.props.children })
      return
    }
    React.Children.forEach(node.props.children, collectOptions)
  }
  React.Children.forEach(children, collectOptions)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <SelectCtx.Provider value={{ value, onValueChange, open, setOpen, options, selected }}>
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </SelectCtx.Provider>
  )
}

export function SelectTrigger({ children, className }) {
  const { open, setOpen } = useContext(SelectCtx)
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={cn(
        'w-full flex items-center justify-between gap-2 rounded-xl',
        'border border-[var(--color-border)] bg-[var(--color-secondary)]',
        'px-3 py-2 text-base text-left focus:outline-none min-h-[44px]',
        className,
      )}
    >
      {children}
      <svg
        className={cn('w-4 h-4 opacity-50 flex-shrink-0 transition-transform', open && 'rotate-180')}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

export function SelectValue({ placeholder }) {
  const { value, selected } = useContext(SelectCtx)
  if (!value) return <span className="text-[var(--color-muted-foreground)]">{placeholder}</span>
  if (selected?.children) return <span>{selected.children}</span>
  return <span>{value}</span>
}

export function SelectContent({ children, className }) {
  const { open } = useContext(SelectCtx)
  if (!open) return null
  return (
    <div className={cn(
      'absolute top-full left-0 right-0 z-50 mt-1 rounded-xl shadow-2xl py-1 overflow-auto max-h-60',
      'border border-[var(--color-border)] bg-[var(--color-card)]',
      className,
    )}>
      {children}
    </div>
  )
}

export function SelectItem({ value: itemValue, children }) {
  const { value, onValueChange, setOpen } = useContext(SelectCtx)
  return (
    <div
      className={cn(
        'px-3 py-2 text-base cursor-pointer transition-colors flex items-center gap-2 min-h-[44px]',
        'hover:bg-[var(--color-secondary)] text-[var(--color-foreground)]',
        value === itemValue && 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium',
      )}
      onMouseDown={(e) => {
        e.preventDefault()
        onValueChange(itemValue)
        setOpen(false)
      }}
    >
      {children}
    </div>
  )
}
