export type TimeOfDay = "morning" | "afternoon" | "evening";

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function formatGreeting(name: string, date = new Date()): string {
  const timeOfDay = getTimeOfDay(date);
  const phrase =
    timeOfDay === "morning"
      ? "Good morning"
      : timeOfDay === "afternoon"
        ? "Good afternoon"
        : "Good evening";
  return `${phrase}, ${name}`;
}
