export const changeformatDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return 'N/A';
  const date = new Date(dateTimeStr);

  // Format date
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' }); // Oct
  const year = date.getFullYear();

  // Format time
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};
