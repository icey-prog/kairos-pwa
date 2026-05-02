import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"

function Command({ className, ...props }) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "text-[var(--color-foreground)] flex h-full w-full flex-col overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

// iOS 26 Liquid Glass command sheet
// — mobile : sheet qui monte du bas avec handle bar
// — desktop : dialog centré avec liquid glass
function CommandDialog({
  title = "Palette de commandes",
  description = "Rechercher ou lancer une commande",
  children,
  className,
  ...props
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {/* Portal avec overlay + content personnalisés */}
      <DialogPrimitive.Portal>
        {/* Overlay — iOS : 40% opacity, léger blur */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[60]",
            "bg-black/40 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "duration-300"
          )}
        />

        {/* Content */}
        <DialogPrimitive.Content
          className={cn(
            // Base — liquid glass
            "fixed z-[70] flex flex-col outline-none overflow-hidden",
            "bg-white/75 dark:bg-black/65",
            "backdrop-blur-2xl backdrop-saturate-[1.8]",
            "border border-white/40 dark:border-white/10",
            "shadow-[0_20px_60px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.5)]",
            // Mobile — sheet du bas
            "bottom-0 left-0 right-0",
            "rounded-t-[28px]",
            "pb-[env(safe-area-inset-bottom,12px)]",
            // Desktop — dialog centré
            "sm:bottom-auto sm:left-1/2 sm:top-[18%]",
            "sm:-translate-x-1/2",
            "sm:w-full sm:max-w-lg",
            "sm:rounded-[28px]",
            // Animations mobile : slide from bottom
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            // Animations desktop : zoom (override mobile via sm:)
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0",
            "sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
            "sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0",
            "duration-300",
            className
          )}
        >
          {/* Handle bar — visible uniquement sur mobile */}
          <div className="sm:hidden w-9 h-1 rounded-full bg-black/15 dark:bg-white/25 mx-auto mt-3 mb-0 flex-shrink-0" />

          <Command className="[&_[cmdk-group-heading]]:text-[var(--color-muted-foreground)] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:min-h-[44px] [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  )
}

function CommandInput({ className, ...props }) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-14 items-center gap-3 px-4 border-b border-black/8 dark:border-white/8"
    >
      <SearchIcon className="size-5 shrink-0 text-[var(--color-muted-foreground)]" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-full w-full bg-transparent py-3 text-[15px] outline-none",
          "placeholder:text-[var(--color-muted-foreground)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[360px] scroll-py-1 overflow-x-hidden overflow-y-auto py-2",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({ ...props }) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-8 text-center text-sm text-[var(--color-muted-foreground)]"
      {...props}
    />
  )
}

function CommandGroup({ className, ...props }) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-[var(--color-foreground)] overflow-hidden px-1 pb-1",
        "[&_[cmdk-group-heading]]:text-[var(--color-muted-foreground)]",
        "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2",
        "[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold",
        "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({ className, ...props }) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-[var(--color-border)]/40 -mx-1 h-px my-1", className)}
      {...props}
    />
  )
}

function CommandItem({ className, ...props }) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] outline-none select-none",
        "min-h-[44px]",
        "data-[selected=true]:bg-black/6 dark:data-[selected=true]:bg-white/10",
        "data-[selected=true]:text-[var(--color-foreground)]",
        "[&_svg:not([class*='text-'])]:text-[var(--color-muted-foreground)]",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-5",
        "transition-colors duration-100",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({ className, ...props }) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-[var(--color-muted-foreground)] ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
