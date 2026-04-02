import {
  CheckCircle2 as CircleCheckIcon,
  Info as InfoIcon,
  Loader2 as Loader2Icon,
  AlertOctagon as OctagonXIcon,
  AlertTriangle as TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import * as React from "react"
import { useEffect, useState } from "react"

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState("light")

  useEffect(() => {
    const isGlass = document.documentElement.classList.contains('glass-mode')
    setTheme(isGlass ? "dark" : "light")

    const observer = new MutationObserver(() => {
      const isGlassNow = document.documentElement.classList.contains('glass-mode')
      setTheme(isGlassNow ? "dark" : "light")
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-card)",
          "--normal-text": "var(--color-foreground)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
