export const BUSINESS_HOURS = {
  start: { hour: 9, minute: 0 },
  end: { hour: 19, minute: 0 },
  interval: 30,
};

// Helper function to generate time slots
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots = [];
  let current = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);

  while (current < end) {
    slots.push(current.toTimeString().substring(0, 5));
    current = new Date(current.getTime() + intervalMinutes * 60000);
  }

  return slots;
}

// Helper function to calculate end time based on start time and duration
export function calculateEndTime(
  startTime: string,
  durationMinutes: number
): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return endDate.toTimeString().substring(0, 5);
}

export function getBusinessDayLimits(date: string) {
  const dayStart = new Date(`${date}T00:00:00`);
  dayStart.setHours(BUSINESS_HOURS.start.hour, BUSINESS_HOURS.start.minute, 0);

  const dayEnd = new Date(`${date}T00:00:00`);
  dayEnd.setHours(BUSINESS_HOURS.end.hour, BUSINESS_HOURS.end.minute, 0);

  return { dayStart, dayEnd };
}

export function isWithinBusinessHours(startTime: Date, endTime: Date) {
  const { dayStart, dayEnd } = getBusinessDayLimits(
    startTime.toISOString().split("T")[0]
  );
  return startTime >= dayStart && endTime <= dayEnd;
}

export function hasAppointmentConflict(
  startTime: Date,
  endTime: Date,
  existingAppointments: Array<{ start_time: string; end_time: string }>
) {
  return existingAppointments.some((appointment) => {
    const appointmentStart = new Date(appointment.start_time);
    const appointmentEnd = new Date(appointment.end_time);
    return startTime < appointmentEnd && endTime > appointmentStart;
  });
}
