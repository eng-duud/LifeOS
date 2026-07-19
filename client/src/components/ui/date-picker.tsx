import * as React from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

interface DatePickerProps {
  value?: Date | string | null
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "اختر تاريخ",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    const d = new Date(value)
    return isNaN(d.getTime()) ? undefined : d
  }, [value])

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-start text-right font-normal h-10",
          !dateValue && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="ml-2 h-4 w-4 shrink-0" />
        {dateValue
          ? format(dateValue, "PPP", { locale: ar })
          : placeholder}
      </Button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-md border bg-popover p-0 shadow-md">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(day) => {
              onChange?.(day)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
