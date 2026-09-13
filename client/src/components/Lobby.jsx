import React, { useState } from "react";
import "./Lobby.css";

function Lobby({ onCreateRoom, onJoinRoom, error }) {
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [teamSize, setTeamSize] = useState(3);

  const handleCreate = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      onCreateRoom(playerName.trim(), teamSize);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (playerName.trim() && roomCode.trim()) {
      onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase());
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <div className="lobby-logo">🍥</div>
        <h1 className="lobby-title">Naruto Team Battle</h1>
        <p className="lobby-subtitle">
          Draft your ultimate shinobi team & let AI rank the best!
        </p>

        {error && <div className="error-message">❌ {error}</div>}

        {!mode && (
          <div className="lobby-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => setMode("create")}>
              🏠 Create Room
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => setMode("join")}>
              🚪 Join Room
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="lobby-form">
            <h3>Create a New Room</h3>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
              autoFocus
            />
            <div className="team-size-selector">
              <label>Team Size:</label>
              <div className="size-options">
                {[2, 3, 4, 5].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`size-btn ${teamSize === size ? "active" : ""}`}
                    onClick={() => setTeamSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={!playerName.trim()}>
                Create Room
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMode(null)}>
                Back
              </button>
            </div>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="lobby-form">
            <h3>Join a Room</h3>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
              autoFocus
            />
            <input
              className="input"
              type="text"
              placeholder="Room Code (e.g., ABC123)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ textTransform: "uppercase", letterSpacing: "3px", textAlign: "center" }}
            />
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!playerName.trim() || !roomCode.trim()}
              >
                Join Room
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMode(null)}>
                Back
              </button>
            </div>
          </form>
        )}

        <div className="lobby-features">
          <div className="feature">
            <span>👥</span>
            <p>2-4 Players</p>
          </div>
          <div className="feature">
            <span>🥷</span>
            <p>18+ Characters</p>
          </div>
          <div className="feature">
            <span>🤖</span>
            <p>AI Ranking</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
