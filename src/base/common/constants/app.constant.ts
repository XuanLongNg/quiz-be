export const UserGender = {
  MALE: 1,
  FEMALE: -1,
  OTHER: 0,
} as const;
export type UserGender = (typeof UserGender)[keyof typeof UserGender];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RESTORE: 'RESTORE',
  HARD_DELETE: 'HARD_DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  BULK_UPDATE: 'BULK_UPDATE',
  BULK_DELETE: 'BULK_DELETE',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
