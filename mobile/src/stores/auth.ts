import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setApiToken } from '@/lib/api';
import type { SessionDto } from '@learnova/shared';

const KEY = 'learnova-session';

interface AuthState {
  session: SessionDto | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (s: SessionDto) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Auth store backed by the device secure keychain/keystore (not plain storage). */
export const useAuth = create<AuthState>((set) => ({
  session: null,
  hydrated: false,
  async hydrate() {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) {
      const s = JSON.parse(raw) as SessionDto;
      setApiToken(s.accessToken);
      set({ session: s });
    }
    set({ hydrated: true });
  },
  async signIn(s) {
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    setApiToken(s.accessToken);
    set({ session: s });
  },
  async signOut() {
    await SecureStore.deleteItemAsync(KEY);
    setApiToken(null);
    set({ session: null });
  },
}));
