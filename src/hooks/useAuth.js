import { useCallback, useEffect, useState } from "react";
import {
  getAuthRedirectUrl,
  supabase,
  supabaseConfigured,
} from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [authError, setAuthError] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn(error.message);
      return null;
    }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      if (data.session?.user?.id) {
        loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user?.id) {
        loadProfile(next.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    setAuthError(null);
    if (!supabase) {
      setAuthError("Supabase não configurado no .env");
      return { error: new Error("not configured") };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setAuthError(error.message);
    return { data, error };
  };

  const signUp = async (email, password, displayName) => {
    setAuthError(null);
    if (!supabase) {
      setAuthError("Supabase não configurado no .env");
      return { error: new Error("not configured") };
    }
    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo || undefined,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    if (error) setAuthError(error.message);
    else if (data.user && !data.session) {
      setAuthError(
        "Conta criada. Confirme o e-mail se a verificação estiver ativa."
      );
    }
    return { data, error };
  };

  const signOut = async () => {
    setAuthError(null);
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  };

  const saveProfilePrefs = async ({ displayName, sprite, abilityId }) => {
    if (!supabase || !session?.user?.id) return;
    const payload = {
      id: session.user.id,
      email: session.user.email,
      updated_at: new Date().toISOString(),
    };
    if (displayName) payload.display_name = displayName;
    if (sprite) payload.preferred_sprite = sprite;
    if (abilityId) payload.preferred_ability = abilityId;

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    if (!error && data) setProfile(data);
    return { data, error };
  };

  return {
    configured: supabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    accessToken: session?.access_token ?? null,
    profile,
    authError,
    signIn,
    signUp,
    signOut,
    saveProfilePrefs,
    refreshProfile: () =>
      session?.user?.id ? loadProfile(session.user.id) : Promise.resolve(null),
  };
}
