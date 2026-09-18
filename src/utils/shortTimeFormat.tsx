export const shortTimeFormat = (timeStr: string): string => {
  if (!timeStr) return "";

  // "08:44:21" → ["08","44","21"]
  const parts = timeStr.split(":");

  // "08:44"
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : timeStr;
};
