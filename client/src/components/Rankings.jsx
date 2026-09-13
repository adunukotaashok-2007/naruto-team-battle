import React from "react";
import "./Rankings.css";

function Rankings({ rankings, playerName, onRematch, onBackToLobby, isHost }) {
  const { rankings: teamRankings, battleSimulation, overallAnalysis, method } =
    rankings;

  const getRankEmoji = (rank) => {
    const emojis = { 1: "🥇", 2: "🥈", 3: "🥉", 4: "4️⃣" };
    return emojis[rank] || `${rank}`;
  };

  const getGradeColor = (grade) => {
    const colors = {
      S: "#ff4444",
      A: "#ff9500",
      B: "#ffd000",
      C: "#44ff88",
      D: "#888",
    };
    return colors[grade] || "#888";
  };

  return (
    <div className="rankings-container">
      <div className="rankings-header">
        <h1>🏆 Battle Rankings</h1>
        <span className="method-badge">
          {method === "gemini-ai" ? "🤖 Gemini AI" : "📊 Stat Analysis"}
        </span>
      </div>

      {/* Ranking Cards */}
      <div className="rankings-list">
        {teamRankings &&
          teamRankings.map((team) => (
            <div
              key={team.rank}
              className={`rank-card ${
                team.player === playerName ? "is-me" : ""
              } rank-${team.rank}`}
            >
              <div className="rank-header">
                <div className="rank-position">
                  <span className="rank-emoji">{getRankEmoji(team.rank)}</span>
                  <span className="rank-number">#{team.rank}</span>
                </div>
                <div className="rank-player-info">
                  <h3 className="rank-player-name">
                    {team.player}
                    {team.player === playerName && (
                      <span className="you-badge">YOU</span>
                    )}
                  </h3>
                  <div className="rank-scores">
                    <span
                      className="grade-badge"
                      style={{
                        backgroundColor: getGradeColor(team.grade),
                      }}
                    >
                      {team.grade}
                    </span>
                    <span className="score-badge">Score: {team.score}/100</span>
                  </div>
                </div>
              </div>

              <div className="rank-details">
                {/* MVP */}
                {team.mvp && (
                  <div className="mvp-section">
                    <span className="detail-label">⭐ MVP:</span>
                    <span className="mvp-name">{team.mvp}</span>
                  </div>
                )}

                {/* Synergy */}
                {team.synergyAnalysis && (
                  <div className="synergy-section">
                    <span className="detail-label">🤝 Synergy:</span>
                    <p>{team.synergyAnalysis}</p>
                  </div>
                )}

                {/* Strengths */}
                {team.strengths && team.strengths.length > 0 && (
                  <div className="strengths-section">
                    <span className="detail-label">💪 Strengths:</span>
                    <ul>
                      {team.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {team.weaknesses && team.weaknesses.length > 0 && (
                  <div className="weaknesses-section">
                    <span className="detail-label">⚠️ Weaknesses:</span>
                    <ul>
                      {team.weaknesses.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Score Bar */}
              <div className="score-bar-container">
                <div
                  className="score-bar"
                  style={{
                    width: `${team.score}%`,
                    backgroundColor: getGradeColor(team.grade),
                  }}
                ></div>
              </div>
            </div>
          ))}
      </div>

      {/* Battle Simulation */}
      {battleSimulation && (
        <div className="battle-simulation">
          <h3>⚔️ Battle Simulation</h3>
          <p>{battleSimulation}</p>
        </div>
      )}

      {/* Overall Analysis */}
      {overallAnalysis && (
        <div className="overall-analysis">
          <h3>📊 Overall Analysis</h3>
          <p>{overallAnalysis}</p>
        </div>
      )}

      {/* Actions */}
      <div className="ranking-actions">
        {isHost && (
          <button className="btn btn-primary btn-lg" onClick={onRematch}>
            🔄 Rematch
          </button>
        )}
        <button className="btn btn-secondary btn-lg" onClick={onBackToLobby}>
          🏠 Back to Lobby
        </button>
      </div>
    </div>
  );
}

export default Rankings;
