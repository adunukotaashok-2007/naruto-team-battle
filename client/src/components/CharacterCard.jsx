import React from "react";
import "./CharacterCard.css";

function CharacterCard({ character, isSelected, onToggle, disabled }) {
  const totalStats = Object.values(character.stats).reduce((a, b) => a + b, 0);

  const getRoleColor = (role) => {
    const colors = {
      Offense: "#ff4444",
      Defense: "#4488ff",
      Healer: "#44ff88",
      "All-Rounder": "#ff44ff",
      "Taijutsu Specialist": "#ffaa00",
      "Genjutsu Specialist": "#aa44ff",
      Tactician: "#44ffff",
      Support: "#88ff44",
    };
    return colors[role] || "#888";
  };

  return (
    <div
      className={`character-card ${isSelected ? "selected" : ""} ${
        disabled && !isSelected ? "disabled" : ""
      }`}
      onClick={() => !disabled || isSelected ? onToggle(character) : null}
    >
      {isSelected && <div className="selected-badge">✓</div>}

      <div className="card-header">
        <h3 className="char-name">{character.name}</h3>
        <span className="char-role" style={{ color: getRoleColor(character.role) }}>
          {character.role}
        </span>
      </div>

      <div className="char-meta">
        <span className="village-badge">{character.village}</span>
        {character.clan !== "None" && (
          <span className="clan-badge">{character.clan}</span>
        )}
      </div>

      <div className="stat-bars">
        {Object.entries(character.stats).map(([stat, value]) => (
          <div key={stat} className="stat-row">
            <span className="stat-label">{stat.substring(0, 3).toUpperCase()}</span>
            <div className="stat-bar-bg">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${value}%`,
                  backgroundColor:
                    value >= 90
                      ? "#ff4444"
                      : value >= 70
                      ? "#ff9500"
                      : value >= 50
                      ? "#ffd000"
                      : "#888",
                }}
              ></div>
            </div>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>

      <div className="char-power">
        <span>⚡ Power: {totalStats}</span>
      </div>

      <div className="char-abilities">
        {character.abilities.slice(0, 3).map((ability, idx) => (
          <span key={idx} className="ability-tag">
            {ability}
          </span>
        ))}
        {character.abilities.length > 3 && (
          <span className="ability-tag more">+{character.abilities.length - 3}</span>
        )}
      </div>
    </div>
  );
}

export default CharacterCard;
