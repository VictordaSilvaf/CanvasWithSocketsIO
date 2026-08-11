const { createClient } = require("@supabase/supabase-js");

let admin = null;

function getAdminClient() {
  if (admin) return admin;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn(
      "[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes — persistência desativada."
    );
    return null;
  }

  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

async function verifyUserAccessToken(accessToken) {
  const client = getAdminClient();
  if (!client || !accessToken) return null;

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

async function upsertProfilePrefs(userId, { displayName, sprite, abilityId, email }) {
  const client = getAdminClient();
  if (!client || !userId) return;

  const payload = {
    id: userId,
    updated_at: new Date().toISOString(),
  };
  if (email) payload.email = email;
  if (displayName) payload.display_name = displayName;
  if (sprite) payload.preferred_sprite = sprite;
  if (abilityId) payload.preferred_ability = abilityId;

  const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) console.warn("[supabase] upsert profile:", error.message);
}

async function recordMatchResult({ roomCode, winnerId, players }) {
  const client = getAdminClient();
  if (!client) return;

  const participantIds = players
    .map((p) => p.userId)
    .filter(Boolean);

  const { error: matchError } = await client.from("match_results").insert({
    room_code: roomCode,
    winner_id: winnerId || null,
    players: players.map((p) => ({
      userId: p.userId || null,
      name: p.name,
      socketId: p.id,
      winsInRoom: p.wins || 0,
      abilityId: p.abilityId || null,
    })),
  });

  if (matchError) {
    console.warn("[supabase] match_results:", matchError.message);
  }

  for (const userId of participantIds) {
    const { data: profile } = await client
      .from("profiles")
      .select("total_wins, total_games")
      .eq("id", userId)
      .maybeSingle();

    const totalGames = (profile?.total_games || 0) + 1;
    const totalWins =
      (profile?.total_wins || 0) + (winnerId && winnerId === userId ? 1 : 0);

    const { error } = await client.from("profiles").upsert(
      {
        id: userId,
        total_games: totalGames,
        total_wins: totalWins,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) console.warn("[supabase] update stats:", error.message);
  }
}

async function getProfile(userId) {
  const client = getAdminClient();
  if (!client || !userId) return null;
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[supabase] get profile:", error.message);
    return null;
  }
  return data;
}

module.exports = {
  getAdminClient,
  verifyUserAccessToken,
  upsertProfilePrefs,
  recordMatchResult,
  getProfile,
};
