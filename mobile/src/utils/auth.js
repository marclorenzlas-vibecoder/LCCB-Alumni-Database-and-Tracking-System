export const getUserRole = (user) => String(user?.role || '').toUpperCase();

export const isTeacher = (user) => getUserRole(user) === 'TEACHER' || getUserRole(user) === 'ADMIN';

export const isAlumni = (user) => getUserRole(user) === 'ALUMNI';

export const getAlumniId = (user) => {
  const candidate = user?.alumni?.id || user?.alumni_id || user?.alumniId || null;
  return candidate ? Number(candidate) : null;
};
