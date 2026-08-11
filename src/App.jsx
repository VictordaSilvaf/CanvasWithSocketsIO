import { useCallback, useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import CharacterSelect from "./components/CharacterSelect";
import Game from "./components/Game";
import Home from "./components/Home";
import Lobby from "./components/Lobby";
import RoomChat from "./components/RoomChat";
import { useAuth } from "./hooks/useAuth";
import { useGameSocket } from "./hooks/useGameSocket";

const GUEST_KEY = "bomberman:guest";

export default function App() {
  const auth = useAuth();
  const [guest, setGuest] = useState(() => {
    try {
      return sessionStorage.getItem(GUEST_KEY) === "1";
    } catch {
      return false;
    }
  });

  const {
    myId,
    connected,
    screen,
    pendingRoomCode,
    gameState,
    roomError,
    takenSprites,
    joining,
    chatMessages,
    createRoom,
    prepareJoin,
    joinRoom,
    backToHome,
    toggleReady,
    kickPlayer,
    selectAbility,
    sendChat,
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
      {screen === "home" ? (
        <Home
          connected={connected}
          roomError={roomError}
          user={auth.user}
          profile={auth.profile}
          isGuest={guest && !auth.user}
          onSignOut={auth.user ? auth.signOut : undefined}
          onLogin={guest && !auth.user ? exitGuest : undefined}
          onCreateRoom={createRoom}
          onPrepareJoin={prepareJoin}
        />
      ) : null}

      {screen === "character" ? (
        <CharacterSelect
          roomCode={pendingRoomCode}
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
        />
      ) : null}

      {inGame ? (
        <Game
          gameState={gameState}
          myId={myId}
          onSelectAbility={(abilityId) => {
            selectAbility(abilityId);
            try {
              const prefs = JSON.parse(
                localStorage.getItem("bomberman:playerPrefs") || "{}"
              );
              localStorage.setItem(
                "bomberman:playerPrefs",
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
