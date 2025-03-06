import { CalendarView } from "@/components/calendar-view";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <CalendarView />
      </div>
    </div>
  );
}
