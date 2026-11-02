import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDeterministicStudentDob(
  identifier: string,
  gradYear?: string | number
): string {
  const parsedYear = Number(gradYear) || 2028;
  const birthYear = parsedYear - 22;

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash * 31 + identifier.charCodeAt(i)) >>> 0;
  }

  const month = (hash % 12) + 1;
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  const day = ((hash >>> 4) % 28) + 1;
  const dayStr = day < 10 ? `0${day}` : `${day}`;

  return `${birthYear}-${monthStr}-${dayStr}`;
}

export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const monthIndex = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    if (months[monthIndex] && !isNaN(day) && !isNaN(year)) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  return dateStr;
}
