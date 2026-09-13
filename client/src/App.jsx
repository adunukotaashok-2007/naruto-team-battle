import React, { useState, useEffect } from "react";
import socket from "./socket";
import Lobby from "./components/Lobby";
import TeamDraft from "./components/TeamDraft";
import Rankings from "./components/Rankings";
import WaitingScreen from "./components/WaitingScreen";

function App() {
  const [gameState, setGameState] = useState("lobby");
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
    socket.on("playerJoined", (data) => setPlayers(data.players));
    socket.on("playerLeft", (data) => setPlayers(data.players));
    socket.on("gameStarted", (data) => {
      setTeamSize(data.teamSize);
      setCharacters(data.characters);
      setMyTeam([]);
      setRankings(null);
      setGameState("drafting");
    });
    socket.on("teamSubmitted", (data) => {
      setSubmittedCount({ submitted: data.teamsSubmitted, total: data.totalPlayers });
    });
    socket.on("evaluating", () => setGameState("evaluating"));
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

  const handleCreateRoom = (name, size) => {
    if (!socket.connected) {
      setError("Server connecting... Please wait 3 seconds and try again!");
      socket.connect();
      return;
    }
    socket.emit("createRoom", { playerName: name, teamSize: size }, (res) => {
      if (res.success) {
        setRoomId(res.roomId);
        setPlayerName(name);
        setPlayers(res.players);
        setTeamSize(size);
        setIsHost(true);
        setGameState("waiting");
        setError("");
      } else setError(res.error);
    });
  };

  const handleJoinRoom = (name, room) => {
    if (!socket.connected) {
      setError("Server connecting... Please wait 3 seconds and try again!");
      socket.connect();
      return;
    }
    socket.emit("joinRoom", { playerName: name, roomId: room }, (res) => {
      if (res.success) {
        setRoomId(res.roomId);
        setPlayerName(name);
        setPlayers(res.players);
        setTeamSize(res.teamSize);
        setIsHost(false);
        setGameState("waiting");
        setError("");
      } else setError(res.error);
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🍥 Naruto Team Battle</h1>
        {roomId && <div className="room-badge">Room: <span className="room-code">{roomId}</span></div>}
      </header>

      <main className="app-main">
        {gameState === "lobby" && (
          <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} error={error} />
        )}
        {gameState === "waiting" && (
          <WaitingScreen roomId={roomId} players={players} isHost={isHost} onStartGame={() => socket.emit("startGame", { roomId })} teamSize={teamSize} />
        )}
        {gameState === "drafting" && (
          <TeamDraft characters={characters} teamSize={teamSize} onSubmitTeam={(team) => { setMyTeam(team); socket.emit("submitTeam", { roomId, team }); setGameState("waiting-for-others"); }} playerName={playerName} />
        )}
        {gameState === "waiting-for-others" && (
          <div className="waiting-card">
            <div className="spinner"></div>
            <h2>Team Submitted!</h2>
            <p>Waiting for players ({submittedCount.submitted}/{submittedCount.total})</p>
          </div>
        )}
        {gameState === "evaluating" && (
          <div className="waiting-card">
            <div className="ai-spinner"></div>
            <h2>Evaluating Teams...</h2>
            <p>Analyzing synergy, stats & combat roles</p>
          </div>
        )}
        {gameState === "results" && rankings && (
          <Rankings rankings={rankings} playerName={playerName} onRematch={() => socket.emit("rematch", { roomId })} onBackToLobby={() => setGameState("lobby")} isHost={isHost} />
        )}
      </main>
    </div>
  );
}

export default App;
