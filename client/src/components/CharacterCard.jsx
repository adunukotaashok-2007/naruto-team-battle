import React, { useState } from "react";
import "./CharacterCard.css";

function CharacterCard({ character, isSelected, onToggle, disabled }) {
  const [imgError, setImgError] = useState(false);
  const totalStats = Object.values(character.stats).reduce((a, b) => a + b, 0);

  const getRoleColor = (role) => {
    const colors = {
      Offense: "#ff4444", Defense: "#4488ff", Healer: "#44ff88",
      "All-Rounder": "#ff44ff", "Taijutsu Specialist": "#ffaa00",
      "Genjutsu Specialist": "#aa44ff", Tactician: "#44ffff", Support: "#88ff44",
    };
    return colors[role] || "#888";
  };

  return (
    <div
      className={`character-card ${isSelected ? "selected" : ""} ${disabled && !isSelected ? "disabled" : ""}`}
      onClick={() => (!disabled || isSelected) ? onToggle(character) : null}
    >
      {isSelected && <div className="selected-badge">✓</div>}

      {/* IMAGE HEADER WITH GUARANTEED FALLBACK */}
      <div className="card-image-box">
        {!imgError ? (
          <img
            src={character.image}
            alt={character.name}
            className="char-img"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="avatar-fallback">
            <span>{character.name.charAt(0)}</span>
          </div>
        )}
        <div className="card-image-overlay">
          <h3 className="char-name">{character.name}</h3>
          <div className="char-badges">
            <span className="role-badge" style={{ backgroundColor: getRoleColor(character.role) }}>{character.role}</span>
            <span className="village-badge">{character.village}</span>
          </div>
        </div>
      </div>

      <div className="card-content">
        <div className="char-power-total">
          <span>⚡ OVERALL POWER: {totalStats}</span>
        </div>

        {/* 8 CATEGORIES GRID */}
        <div className="stat-grid">
          {Object.entries(character.stats).map(([stat, value]) => (
            <div key={stat} className="stat-box">
              <span className="stat-label">{stat.toUpperCase()}</span>
              <div className="stat-bar-bg">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${value}%`,
                    backgroundColor: value >= 90 ? "#ff4444" : value >= 75 ? "#ff9500" : value >= 50 ? "#ffd000" : "#888",
                  }}
                ></div>
              </div>
              <span className="stat-value">{value}</span>
            </div>
          ))}
        </div>

        <div className="char-abilities">
          {character.abilities.map((ability, idx) => (
            <span key={idx} className="ability-tag">{ability}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CharacterCard;
