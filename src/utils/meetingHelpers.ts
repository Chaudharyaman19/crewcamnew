export const formatMeetingDateForApi = (date?: Date | string | null) => {
  const value = date ? new Date(date) : new Date();
  if (Number.isNaN(value.getTime())) return '';
  return value.toISOString().split('T')[0];
};

export const formatMeetingTimeForApi = (date?: Date | string | null) => {
  const value = date ? new Date(date) : new Date();
  if (Number.isNaN(value.getTime())) return '';
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
};

export const formatMeetingDisplayDate = (date?: Date | string | null) => {
  const value = date ? new Date(date) : null;
  if (!value || Number.isNaN(value.getTime())) return 'N/A';
  return value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const sortMeetingsAsc = <T extends { meetingDate?: string | Date; meetingTime?: string }>(meetings: T[]) =>
  [...meetings].sort((a, b) => {
    const aTime = new Date(`${formatMeetingDateForApi(a.meetingDate)}T${a.meetingTime || '00:00'}`).getTime();
    const bTime = new Date(`${formatMeetingDateForApi(b.meetingDate)}T${b.meetingTime || '00:00'}`).getTime();
    return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
  });
