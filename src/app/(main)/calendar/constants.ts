export type DayType = "main_event" | "rehearsal_setup" | "standard";

interface DayTypeColor {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export const DAY_TYPE_COLORS: Record<DayType, DayTypeColor> = {
  main_event: { backgroundColor: "#3D9EFF", borderColor: "#2B7FDB", textColor: "#ffffff" },
  rehearsal_setup: { backgroundColor: "#F0E23D", borderColor: "#D4C82E", textColor: "#000000" },
  standard: { backgroundColor: "#4DC98E", borderColor: "#3AAF76", textColor: "#000000" },
};

export const PENDING_COLORS: DayTypeColor = {
  backgroundColor: "#9CA3AF",
  borderColor: "#6B7280",
  textColor: "#ffffff",
};

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  main_event: "Main Event",
  rehearsal_setup: "Rehearsal / Setup",
  standard: "Booking",
};
