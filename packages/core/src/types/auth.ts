// ─── Auth types ───────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
  phone?: string;
  isGuest?: boolean;
  createdAt?: number;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  expiresAt: number;
}

export const defaultAuthState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isSignedIn: false,
  expiresAt: 0,
};
