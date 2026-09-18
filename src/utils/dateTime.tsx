// utils/dateTime.ts
export const formattedDateTime = (checkIn: string | null = null) => {
  const d = checkIn ? new Date(checkIn) : new Date();

  // Format date: 29-Sep-2025
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);

  // Format time: 12:45 PM
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  return `${date}, ${time}`;
};
