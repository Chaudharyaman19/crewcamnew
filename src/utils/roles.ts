export const normalizeRole = (role?: string | null) =>
  (role || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

export const isAdminRole = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'admin' || normalizedRole === 'super admin';
};

export const isSuperAdminRole = (role?: string | null) =>
  normalizeRole(role) === 'super admin';

export const isHodRole = (role?: string | null) =>
  normalizeRole(role) === 'hod';
