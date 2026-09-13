import React, { useState } from "react";
import CharacterCard from "./CharacterCard";
import "./TeamDraft.css";

function TeamDraft({ characters, teamSize, onSubmitTeam, playerName }) {
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");

  const toggleCharacter = (char) => {
    if (selectedTeam.find((c) => c.id === char.id)) {
      setSelectedTeam(selectedTeam.filter((c) => c.id !== char.id));
    } else if (selectedTeam.length < teamSize) {
      setSelectedTeam([...selectedTeam, char]);
    }
  };

  const handleSubmit = () => {
    if (selectedTeam.length === teamSize) {
      onSubmitTeam(selectedTeam);
    }
  };

  // Filtering
  const roles = ["All", ...new Set(characters.map((c) => c.role))];
  const filtered =
    filter === "All" ? characters : characters.filter((c) => c.role === filter);

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "power") {
      const totalA = Object.values(a.stats).reduce((x, y) => x + y, 0);
      const totalB = Object.values(b.stats).reduce((x, y) => x + y, 0);
      return totalB - totalA;
    }
    return 0;
  });

  const totalPower = selectedTeam.reduce(
    (sum, c) => sum + Object.values(c.stats).reduce((a, b) => a + b, 0),
    0
  );

  return (
    <div className="draft-container">
      {/* Draft Header */}
      <div className="draft-header">
        <div className="draft-info">
          <h2>Draft Your Team, {playerName}!</h2>
          <p>
            Select {teamSize} characters ({selectedTeam.length}/{teamSize})
          </p>
        </div>

        {/* Selected Team Preview */}
        <div className="team-preview">
          {Array.from({ length: teamSize }).map((_, idx) => {
            const char = selectedTeam[idx];
            return (
              <div
                key={idx}
                className={`preview-slot ${char ? "filled" : "empty"}`}
                onClick={() => char && toggleCharacter(char)}
              >
                {char ? (
                  <>
                    <span className="preview-name">{char.name}</span>
                    <span className="preview-remove">✕</span>
                  </>
                ) : (
                  <span className="preview-empty">Slot {idx + 1}</span>
                )}
              </div>
            );
          })}
          {selectedTeam.length > 0 && (
            <div className="team-power">⚡ {totalPower}</div>
          )}
        </div>

        <button
          className="btn btn-success btn-lg submit-btn"
          onClick={handleSubmit}
          disabled={selectedTeam.length !== teamSize}
        >
          {selectedTeam.length === teamSize
            ? "🔒 Lock In Team!"
            : `Select ${teamSize - selectedTeam.length} more`}
        </button>
      </div>

      {/* Filters */}
      <div className="draft-filters">
        <div className="filter-group">
          <span className="filter-label">Role:</span>
          <div className="filter-buttons">
            {roles.map((role) => (
              <button
                key={role}
                className={`filter-btn ${filter === role ? "active" : ""}`}
                onClick={() => setFilter(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Sort:</span>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="power">Power</option>
          </select>
        </div>
      </div>

      {/* Character Grid */}
      <div className="characters-grid">
        {sorted.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            isSelected={!!selectedTeam.find((c) => c.id === char.id)}
            onToggle={toggleCharacter}
            disabled={
              selectedTeam.length >= teamSize &&
              !selectedTeam.find((c) => c.id === char.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

export default TeamDraft;
