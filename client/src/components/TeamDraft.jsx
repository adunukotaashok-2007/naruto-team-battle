import React, { useState } from "react";
import CharacterCard from "./CharacterCard";
import "./TeamDraft.css";

// The 8 Ultimate Categories
export const DRAFT_CATEGORIES = [
  { key: "speed", name: "⚡ Speedster (Fastest)" },
  { key: "power", name: "💪 Heavy Hitter (Power)" },
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

  // Number of categories based on lobby selection
  const activeCategories = DRAFT_CATEGORIES.slice(0, teamSize);

  const handleCharacterClick = (char) => {
    // If already picked, remove them
    const existingSlot = Object.keys(draftPicks).find(key => draftPicks[key]?.id === char.id);
    if (existingSlot) {
      const newDraft = { ...draftPicks };
      delete newDraft[existingSlot];
      setDraftPicks(newDraft);
      setActiveSlot(Number(existingSlot));
      return;
    }

    // Assign to active category
    setDraftPicks(prev => ({ ...prev, [activeSlot]: char }));
    
    // Auto-advance to next empty slot
    const nextEmpty = activeCategories.findIndex((_, idx) => idx !== activeSlot && !draftPicks[idx]);
    if (nextEmpty !== -1) setActiveSlot(nextEmpty);
  };

  const handleSubmit = () => {
    const teamArray = activeCategories.map((_, idx) => draftPicks[idx]);
    if (teamArray.every(char => char)) onSubmitTeam(teamArray);
  };

  return (
    <div className="draft-container">
      <div className="draft-header">
        <div className="draft-info">
          <h2>Category Draft, {playerName}!</h2>
          <p>Pick the best character for each specific category.</p>
        </div>

        {/* Category Slots UI */}
        <div className="category-slots">
          {activeCategories.map((cat, idx) => {
            const char = draftPicks[idx];
            return (
              <div 
                key={idx} 
                className={`cat-slot ${activeSlot === idx ? "active" : ""} ${char ? "filled" : ""}`}
                onClick={() => setActiveSlot(idx)}
              >
                <span className="cat-name">{cat.name}</span>
                {char ? (
                  <div className="cat-char">
                    <img src={char.image.startsWith("http") ? `https://wsrv.nl/?url=${encodeURIComponent(char.image)}` : char.image} alt={char.name} />
                    <span>{char.name}</span>
                  </div>
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
          {Object.keys(draftPicks).length === activeCategories.length ? "🔒 Lock In Picks!" : "Select All Categories"}
        </button>
      </div>

      {/* Character Roster */}
      <div className="characters-grid">
        {characters.map((char) => {
          const isPicked = Object.values(draftPicks).some(c => c?.id === char.id);
          return (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={isPicked}
              onToggle={handleCharacterClick}
              disabled={Object.keys(draftPicks).length >= activeCategories.length && !isPicked}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TeamDraft;
