export const AuthProvider = {
  JWT: 'JWT',
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  TWITTER: 'TWITTER',
  GITHUB: 'GITHUB',
};
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];
