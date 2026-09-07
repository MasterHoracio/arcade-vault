export interface SessionUser {
  id: string;
  email: string | null;
  nickname: string | null; // null = falta completar /auth/nickname
}
