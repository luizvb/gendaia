"use client"

import { useState } from "react"
import { Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TimeInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
}

export function TimeInput({ id, value, onChange }: TimeInputProps) {
  const [open, setOpen] = useState(false)

  // Gerar horários de 30 em 30 minutos
  const timeSlots = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      timeSlots.push(`${formattedHour}:${formattedMinute}`)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className="w-full justify-start text-left font-normal">
          <Clock className="mr-2 h-4 w-4" />
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0">
        <div className="grid max-h-[300px] overflow-y-auto p-1">
          {timeSlots.map((time) => (
            <Button
              key={time}
              variant={value === time ? "default" : "ghost"}
              className="justify-start font-normal"
              onClick={() => {
                onChange(time)
                setOpen(false)
              }}
            >
              {time}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

