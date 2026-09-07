"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/supabase/session";

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  refreshNickname: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNickname = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", id)
        .maybeSingle();
      return data?.nickname ?? null;
    },
    [supabase],
  );

  const applyAuthUser = useCallback(
    async (authUser: { id: string; email?: string | null } | null) => {
      if (!authUser) {
        setUser(null);
        return;
      }
      const nickname = await loadNickname(authUser.id);
      setUser({ id: authUser.id, email: authUser.email ?? null, nickname });
    },
    [loadNickname],
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      applyAuthUser(session?.user ?? null).finally(() => {
        if (active) setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyAuthUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, applyAuthUser]);

  const refreshNickname = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    await applyAuthUser(authUser);
  }, [supabase, applyAuthUser]);

  const value = useMemo(
    () => ({ user, loading, refreshNickname }),
    [user, loading, refreshNickname],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return ctx;
}
