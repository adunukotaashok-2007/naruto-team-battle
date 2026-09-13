import React, { useState, useEffect } from "react";
import socket from "./socket";
import Lobby from "./components/Lobby";
import TeamDraft from "./components/TeamDraft";
import Rankings from "./components/Rankings";
import WaitingScreen from "./components/WaitingScreen";

function App() {
  const [gameState, setGameState] = useState("lobby");
  // lobby → drafting → waiting → evaluating → results

  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [teamSize, setTeamSize] = useState(3);
  const [myTeam, setMyTeam] = useState([]);
  const [rankings, setRankings] = useState(null);
  const [submittedCount, setSubmittedCount] = useState({ submitted: 0, total: 0 });
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // Player joined
    socket.on("playerJoined", (data) => {
      setPlayers(data.players);
    });

    // Player left
    socket.on("playerLeft", (data) => {
      setPlayers(data.players);
    });

    // Game started by host
    socket.on("gameStarted", (data) => {
      setTeamSize(data.teamSize);
      setCharacters(data.characters);
      setMyTeam([]);
      setRankings(null);
      setGameState("drafting");
    });

    // Someone submitted their team
    socket.on("teamSubmitted", (data) => {
      setSubmittedCount({
        submitted: data.teamsSubmitted,
        total: data.totalPlayers,
      });
    });

    // AI is evaluating
    socket.on("evaluating", () => {
      setGameState("evaluating");
    });

    // Rankings are ready
    socket.on("rankingComplete", (data) => {
      setRankings(data);
      setGameState("results");
    });

    return () => {
      socket.off("playerJoined");
      socket.off("playerLeft");
      socket.off("gameStarted");
      socket.off("teamSubmitted");
      socket.off("evaluating");
      socket.off("rankingComplete");
    };
  }, []);

  // --- HANDLERS ---
  const handleCreateRoom = (name, size) => {
    socket.emit("createRoom", { playerName: name, teamSize: size }, (res) => {
      if (res.success) {
        setRoomId(res.roomId);
        setPlayerName(name);
        setPlayers(res.players);
        setTeamSize(size);
        setIsHost(true);
        setGameState("waiting");
        setError("");
      } else {
        setError(res.error);
      }
    });
  };

  const handleJoinRoom = (name, room) => {
    socket.emit("joinRoom", { playerName: name, roomId: room }, (res) => {
      if (res.success) {
        setRoomId(res.roomId);
        setPlayerName(name);
        setPlayers(res.players);
        setTeamSize(res.teamSize);
        setIsHost(false);
        setGameState("waiting");
        setError("");
      } else {
        setError(res.error);
      }
    });
  };

  const handleStartGame = () => {
    socket.emit("startGame", { roomId });
  };

  const handleSubmitTeam = (team) => {
    setMyTeam(team);
    socket.emit("submitTeam", { roomId, team });
    setGameState("waiting-for-others");
  };

  const handleRematch = () => {
    socket.emit("rematch", { roomId });
  };

  const handleBackToLobby = () => {
    setGameState("lobby");
    setRoomId("");
    setPlayers([]);
    setMyTeam([]);
    setRankings(null);
    setError("");
    setIsHost(false);
  };

  // --- RENDER ---
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🍥 Naruto Team Battle</h1>
        {roomId && (
          <div className="room-badge">
            Room: <span className="room-code">{roomId}</span>
          </div>
        )}
      </header>

      <main className="app-main">
        {gameState === "lobby" && (
          <Lobby
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            error={error}
          />
        )}

        {gameState === "waiting" && (
          <WaitingScreen
            roomId={roomId}
            players={players}
            isHost={isHost}
            onStartGame={handleStartGame}
            teamSize={teamSize}
          />
        )}

        {gameState === "drafting" && (
          <TeamDraft
            characters={characters}
            teamSize={teamSize}
            onSubmitTeam={handleSubmitTeam}
            playerName={playerName}
          />
        )}

        {gameState === "waiting-for-others" && (
          <div className="waiting-container">
            <div className="waiting-card">
              <div className="spinner"></div>
              <h2>Team Locked In! ✅</h2>
              <p>
                Waiting for other players... ({submittedCount.submitted}/
                {submittedCount.total})
              </p>
              <div className="my-team-preview">
                <h3>Your Team:</h3>
                <div className="mini-team">
                  {myTeam.map((c) => (
                    <span key={c.id} className="mini-char">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === "evaluating" && (
          <div className="waiting-container">
            <div className="waiting-card evaluating">
              <div className="ai-spinner"></div>
              <h2>🤖 AI is Analyzing Teams...</h2>
              <p>Evaluating synergy, power levels, and battle potential</p>
              <div className="loading-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
          </div>
        )}

        {gameState === "results" && rankings && (
          <Rankings
            rankings={rankings}
            playerName={playerName}
            onRematch={handleRematch}
            onBackToLobby={handleBackToLobby}
            isHost={isHost}
          />
        )}
      </main>
    </div>
  );
}

export default App;
