export const formatName = (fullName?: string | null): string => {
  if (!fullName) return 'User';
  
  const nameMatch = fullName.match(/^(?:(?:mr\.|mrs\.|ms\.|miss\.|dr\.|er\.|mr|mrs|ms|miss|dr|er)\s+)?\S+/i);
  const matchedName = nameMatch ? nameMatch[0] : fullName.split(' ')[0];
  
  return matchedName
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};
