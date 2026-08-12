import { useCallback, useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import CharacterSelect from "./components/CharacterSelect";
import Game from "./components/Game";
import Home from "./components/Home";
import Leaderboard from "./components/Leaderboard";
import Lobby from "./components/Lobby";
import RoomChat from "./components/RoomChat";
import { useAuth } from "./hooks/useAuth";
import { useGameSocket } from "./hooks/useGameSocket";

const GUEST_KEY = "suprabom:guest";

export default function App() {
  const auth = useAuth();
  const [guest, setGuest] = useState(() => {
    try {
      return sessionStorage.getItem(GUEST_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const {
    myId,
    connected,
    screen,
    pendingRoomCode,
    pendingRoomMeta,
    gameState,
    roomError,
    takenSprites,
    joining,
    chatMessages,
    publicRooms,
    createRoom,
    refreshPublicRooms,
    prepareJoin,
    joinRoom,
    backToHome,
    leaveRoom,
    toggleReady,
    kickPlayer,
    selectAbility,
    sendChat,
    movePlayer,
    placeBomb,
    useAbility,
  } = useGameSocket();

  const inLobby = screen === "inRoom" && gameState.phase === "lobby";
  const inGame = screen === "inRoom" && gameState.phase !== "lobby";
  const inRoom = inLobby || inGame;

  const continueAsGuest = useCallback(() => {
    try {
      sessionStorage.setItem(GUEST_KEY, "1");
    } catch {
      // ignore
    }
    setGuest(true);
  }, []);

  const exitGuest = useCallback(() => {
    try {
      sessionStorage.removeItem(GUEST_KEY);
    } catch {
      // ignore
    }
    setGuest(false);
  }, []);

  useEffect(() => {
    if (auth.user) {
      try {
        sessionStorage.removeItem(GUEST_KEY);
      } catch {
        // ignore
      }
      setGuest(false);
    }
  }, [auth.user]);

  if (auth.loading) {
    return (
      <div className="grid min-h-screen place-items-center text-forest-200">
        Carregando…
      </div>
    );
  }

  if (auth.configured && !auth.user && !guest) {
    return (
      <div className="min-h-screen">
        <AuthScreen
          configured={auth.configured}
          authError={auth.authError}
          onSignIn={auth.signIn}
          onSignUp={auth.signUp}
          onContinueAsGuest={continueAsGuest}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {screen === "home" && showLeaderboard ? (
        <Leaderboard onBack={() => setShowLeaderboard(false)} />
      ) : null}

      {screen === "home" && !showLeaderboard ? (
        <Home
          connected={connected}
          roomError={roomError}
          user={auth.user}
          profile={auth.profile}
          isGuest={guest && !auth.user}
          publicRooms={publicRooms}
          onSignOut={auth.user ? auth.signOut : undefined}
          onLogin={guest && !auth.user ? exitGuest : undefined}
          onCreateRoom={createRoom}
          onPrepareJoin={prepareJoin}
          onRefreshPublicRooms={refreshPublicRooms}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />
      ) : null}

      {screen === "character" ? (
        <CharacterSelect
          roomCode={pendingRoomCode}
          roomName={pendingRoomMeta?.name}
          visibility={pendingRoomMeta?.visibility}
          takenSprites={takenSprites}
          roomError={roomError}
          joining={joining}
          profile={auth.profile}
          onJoin={async (payload) => {
            await auth.saveProfilePrefs({
              displayName: payload.name,
              sprite: payload.sprite,
            });
            joinRoom({
              ...payload,
              accessToken: auth.accessToken,
            });
          }}
          onBack={backToHome}
        />
      ) : null}

      {inLobby ? (
        <Lobby
          gameState={gameState}
          myId={myId}
          roomError={roomError}
          onToggleReady={toggleReady}
          onKick={kickPlayer}
          onLeave={leaveRoom}
        />
      ) : null}

      {inGame ? (
        <Game
          gameState={gameState}
          myId={myId}
          onLeave={leaveRoom}
          onMove={movePlayer}
          onBomb={placeBomb}
          onAbility={useAbility}
          onSelectAbility={(abilityId) => {
            selectAbility(abilityId);
            try {
              const prefs = JSON.parse(
                localStorage.getItem("suprabom:playerPrefs") || "{}"
              );
              localStorage.setItem(
                "suprabom:playerPrefs",
                JSON.stringify({ ...prefs, abilityId })
              );
            } catch {
              // ignore
            }
            auth.saveProfilePrefs({ abilityId });
          }}
        />
      ) : null}

      {inRoom ? (
        <RoomChat messages={chatMessages} myId={myId} onSend={sendChat} />
      ) : null}
    </div>
  );
}
