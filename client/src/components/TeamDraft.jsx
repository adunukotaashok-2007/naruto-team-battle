import React, { useState } from "react";
import CharacterCard from "./CharacterCard";
import "./TeamDraft.css";

export const CATEGORIES = [
  { key: "speed", name: "⚡ Speedster" },
  { key: "power", name: "💪 Heavy Hitter" },
  { key: "iq", name: "🧠 Tactician (IQ)" },
  { key: "ninjutsu", name: "🔥 Ninjutsu Master" },
  { key: "durability", name: "🛡️ Ultimate Tank" },
  { key: "taijutsu", name: "👊 Taijutsu Master" },
  { key: "genjutsu", name: "👁️ Genjutsu Master" },
  { key: "chakra", name: "🌊 Chakra Monster" }
];

function TeamDraft({ characters, teamSize, onSubmitTeam, playerName }) {
  const [draftPicks, setDraftPicks] = useState({});
  const [activeSlot, setActiveSlot] = useState(0);

  const activeCategories = CATEGORIES.slice(0, teamSize);

  const handleToggle = (char) => {
    const existingSlot = Object.keys(draftPicks).find(k => draftPicks[k]?.id === char.id);
    if (existingSlot !== undefined) {
      const newPicks = { ...draftPicks };
      delete newPicks[existingSlot];
      setDraftPicks(newPicks);
      setActiveSlot(Number(existingSlot));
      return;
    }

    setDraftPicks({ ...draftPicks, [activeSlot]: char });

    const nextSlot = activeCategories.findIndex((_, idx) => idx !== activeSlot && !draftPicks[idx]);
    if (nextSlot !== -1) setActiveSlot(nextSlot);
  };

  const handleSubmit = () => {
    const teamArray = activeCategories.map((_, idx) => draftPicks[idx]);
    if (teamArray.every(c => c)) onSubmitTeam(teamArray);
  };

  return (
    <div className="draft-container">
      <div className="draft-header">
        <h2>Category Draft — {playerName}</h2>
        <p>Pick a character for each specific category:</p>

        <div className="category-slots">
          {activeCategories.map((cat, idx) => {
            const char = draftPicks[idx];
            return (
              <div
                key={idx}
                className={`cat-slot ${activeSlot === idx ? "active" : ""} ${char ? "filled" : ""}`}
                onClick={() => setActiveSlot(idx)}
              >
                <span className="cat-title">{cat.name}</span>
                {char ? (
                  <span className="cat-char-name">{char.name}</span>
                ) : (
                  <span className="cat-empty">Tap to select...</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          className="btn btn-success btn-lg submit-btn"
          onClick={handleSubmit}
          disabled={Object.keys(draftPicks).length !== activeCategories.length}
        >
          {Object.keys(draftPicks).length === activeCategories.length ? "🔒 Lock In Team!" : "Select All Categories"}
        </button>
      </div>

      <div className="characters-grid">
        {characters.map((char) => {
          const isPicked = Object.values(draftPicks).some(c => c?.id === char.id);
          return (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={isPicked}
              onToggle={handleToggle}
              disabled={Object.keys(draftPicks).length >= activeCategories.length && !isPicked}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TeamDraft;
