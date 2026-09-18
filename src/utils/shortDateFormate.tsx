// ✅ MUST export something
export const shortDateFormate = (dateStr: string): string => {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
};
