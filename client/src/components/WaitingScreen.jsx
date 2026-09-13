import React from "react";
import "./WaitingScreen.css";

function WaitingScreen({ roomId, players, isHost, onStartGame, teamSize }) {
  const canStart = players.length >= 2;
  const MAX_PLAYERS = 10;

  return (
    <div className="waiting-room">
      <div className="waiting-room-card" style={{ maxWidth: "800px" }}>
        <h2>⚔️ Battle Room</h2>

        <div className="room-code-display">
          <p className="room-label">Share this code with friends:</p>
          <div className="room-code-big">{roomId}</div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigator.clipboard.writeText(roomId)}
          >
            📋 Copy Code
          </button>
        </div>

        <div className="players-section">
          <h3>Players ({players.length}/{MAX_PLAYERS})</h3>
          <div className="players-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {players.map((name, idx) => (
              <div key={idx} className="player-slot filled">
                <span className="player-icon">🥷</span>
                <span className="player-name">{name}</span>
                {idx === 0 && <span className="host-badge">HOST</span>}
              </div>
            ))}
            {Array.from({ length: MAX_PLAYERS - players.length }).map((_, idx) => (
              <div key={`empty-${idx}`} className="player-slot empty">
                <span className="player-icon">❓</span>
                <span className="player-name">Waiting...</span>
              </div>
            ))}
          </div>
        </div>

        <div className="game-settings">
          <p>🥷 Team Size: <strong>{teamSize} characters</strong></p>
          <p>🤖 Ranking: <strong>AI Powered</strong></p>
        </div>

        {isHost ? (
          <button className="btn btn-success btn-lg" onClick={onStartGame} disabled={!canStart}>
            {canStart ? "🚀 Start Battle!" : `Need at least 2 players (${players.length}/2)`}
          </button>
        ) : (
          <div className="waiting-for-host">
            <div className="spinner"></div>
            <p>Waiting for host to start the game...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WaitingScreen;
