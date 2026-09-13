require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const characters = require("./data/characters.json");

// ========================
//  EXPRESS & SOCKET SETUP
// ========================
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ========================
//  GEMINI AI SETUP
// ========================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let model = null;

if (GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  console.log("✅ Gemini AI connected");
} else {
  console.warn("⚠️  No GEMINI_API_KEY found. Using fallback stat-based ranking.");
}

// ========================
//  GAME STATE
// ========================
const gameRooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ========================
//  REST API ROUTES
// ========================

// Get all characters
app.get("/api/characters", (req, res) => {
  res.json(characters);
});

// Get room info
app.get("/api/rooms/:roomId", (req, res) => {
  const room = gameRooms[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({
    roomId: req.params.roomId,
    players: Object.values(room.players).map((p) => p.name),
    status: room.status,
    teamSize: room.teamSize,
    teamsSubmitted: Object.keys(room.teams).length,
  });
});

// ========================
//  SOCKET.IO EVENTS
// ========================
io.on("connection", (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);

  // --- CREATE ROOM ---
  socket.on("createRoom", ({ playerName, teamSize }, callback) => {
    const roomId = generateRoomId();
    gameRooms[roomId] = {
      host: socket.id,
      players: {
        [socket.id]: { name: playerName, id: socket.id },
      },
      teams: {},
      status: "waiting", // waiting → drafting → evaluating → complete
      teamSize: teamSize || 3,
      createdAt: Date.now(),
    };

    socket.join(roomId);
    socket.data = { roomId, playerName };

    console.log(`🏠 Room ${roomId} created by ${playerName}`);

    callback({
      success: true,
      roomId,
      players: [playerName],
    });
  });

  // --- JOIN ROOM ---
  socket.on("joinRoom", ({ roomId, playerName }, callback) => {
    const room = gameRooms[roomId];

    if (!room) {
      callback({ success: false, error: "Room not found" });
      return;
    }
    if (Object.keys(room.players).length >= 4) {
      callback({ success: false, error: "Room is full (max 4 players)" });
      return;
    }
    if (room.status !== "waiting") {
      callback({ success: false, error: "Game already in progress" });
      return;
    }

    // Check duplicate name
    const existingNames = Object.values(room.players).map((p) => p.name);
    if (existingNames.includes(playerName)) {
      callback({ success: false, error: "Name already taken in this room" });
      return;
    }

    room.players[socket.id] = { name: playerName, id: socket.id };
    socket.join(roomId);
    socket.data = { roomId, playerName };

    const playerNames = Object.values(room.players).map((p) => p.name);
    console.log(`👤 ${playerName} joined room ${roomId}`);

    io.to(roomId).emit("playerJoined", {
      players: playerNames,
      newPlayer: playerName,
    });

    callback({
      success: true,
      roomId,
      players: playerNames,
      teamSize: room.teamSize,
    });
  });

  // --- START GAME ---
  socket.on("startGame", ({ roomId }) => {
    const room = gameRooms[roomId];
    if (!room) return;
    if (room.host !== socket.id) return;
    if (Object.keys(room.players).length < 2) return;

    room.status = "drafting";
    io.to(roomId).emit("gameStarted", {
      teamSize: room.teamSize,
      characters: characters,
    });
    console.log(`🎮 Game started in room ${roomId}`);
  });

  // --- SUBMIT TEAM ---
  socket.on("submitTeam", ({ roomId, team }) => {
    const room = gameRooms[roomId];
    if (!room) return;

    const playerName = socket.data.playerName;
    room.teams[playerName] = team;

    const totalPlayers = Object.keys(room.players).length;
    const teamsSubmitted = Object.keys(room.teams).length;

    console.log(`📋 ${playerName} submitted team (${teamsSubmitted}/${totalPlayers})`);

    io.to(roomId).emit("teamSubmitted", {
      player: playerName,
      teamsSubmitted,
      totalPlayers,
    });

    // All teams in → rank them
    if (teamsSubmitted === totalPlayers) {
      evaluateTeams(roomId);
    }
  });

  // --- REMATCH ---
  socket.on("rematch", ({ roomId }) => {
    const room = gameRooms[roomId];
    if (!room) return;

    room.teams = {};
    room.status = "drafting";

    io.to(roomId).emit("gameStarted", {
      teamSize: room.teamSize,
      characters: characters,
    });
    console.log(`🔄 Rematch started in room ${roomId}`);
  });

  // --- DISCONNECT ---
  socket.on("disconnect", () => {
    const roomId = socket.data?.roomId;
    const playerName = socket.data?.playerName;

    if (roomId && gameRooms[roomId]) {
      const room = gameRooms[roomId];
      delete room.players[socket.id];

      const remainingPlayers = Object.values(room.players).map((p) => p.name);
      console.log(`🔌 ${playerName} disconnected from room ${roomId}`);

      if (remainingPlayers.length === 0) {
        delete gameRooms[roomId];
        console.log(`🗑️  Room ${roomId} deleted (empty)`);
      } else {
        // Transfer host if host left
        if (room.host === socket.id) {
          const newHostId = Object.keys(room.players)[0];
          room.host = newHostId;
        }

        io.to(roomId).emit("playerLeft", {
          players: remainingPlayers,
          leftPlayer: playerName,
        });
      }
    }
  });
});

// ========================
//  AI TEAM EVALUATION
// ========================
async function evaluateTeams(roomId) {
  const room = gameRooms[roomId];
  room.status = "evaluating";

  io.to(roomId).emit("evaluating", {
    message: "🤖 AI is analyzing all teams...",
  });

  let result;

  if (model) {
    result = await evaluateWithGemini(room.teams);
  } else {
    result = evaluateWithStats(room.teams);
  }

  room.status = "complete";
  io.to(roomId).emit("rankingComplete", result);
  console.log(`🏆 Rankings complete for room ${roomId}`);
}

// --- GEMINI AI EVALUATION ---
async function evaluateWithGemini(teams) {
  const prompt = buildAIPrompt(teams);

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseAIResponse(responseText, teams);
    return parsed;
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    // Fallback to stat-based
    return evaluateWithStats(teams);
  }
}

function buildAIPrompt(teams) {
  let prompt = `You are an expert Naruto battle analyst. Multiple players have each drafted a team of shinobi. 
Your job is to rank ALL teams from BEST to WORST based on competitive battle strength.

EVALUATION CRITERIA (weight each equally):
1. **Raw Power**: Combined stats of all team members
2. **Team Synergy**: How well abilities complement each other (e.g., Uchiha + Hyuga = visual prowess)
3. **Role Balance**: Teams need offense, defense, and support
4. **Counter Potential**: Ability to handle diverse threats (genjutsu, taijutsu, ninjutsu)
5. **Weakness Analysis**: Critical vulnerabilities that opponents could exploit
6. **Battle IQ**: Combined intelligence for strategic coordination

TEAMS TO EVALUATE:
`;

  for (const [playerName, team] of Object.entries(teams)) {
    prompt += `\n=== ${playerName}'s Team ===\n`;
    team.forEach((char, idx) => {
      prompt += `${idx + 1}. ${char.name} [${char.role}] | `;
      prompt += `NIN:${char.stats.ninjutsu} TAI:${char.stats.taijutsu} `;
      prompt += `GEN:${char.stats.genjutsu} INT:${char.stats.intelligence} `;
      prompt += `STA:${char.stats.stamina} SPD:${char.stats.speed} | `;
      prompt += `Abilities: ${char.abilities.join(", ")}\n`;
    });
  }

  prompt += `

RESPOND WITH ONLY VALID JSON (no markdown, no code blocks, no extra text):
{
  "rankings": [
    {
      "rank": 1,
      "player": "PlayerName",
      "score": 92,
      "grade": "S",
      "strengths": ["strength 1", "strength 2", "strength 3"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "synergyAnalysis": "Detailed explanation of team synergy",
      "mvp": "Name of the most valuable player on this team"
    }
  ],
  "battleSimulation": "A detailed 3-4 sentence narrative of how a battle between all these teams would unfold. Be dramatic and reference specific jutsu and character interactions.",
  "overallAnalysis": "A 2-3 sentence summary comparing all teams and why the winner edges out the competition."
}

IMPORTANT: 
- Rank ALL ${Object.keys(teams).length} teams
- Scores should be between 50-100
- Grades: S (90-100), A (80-89), B (70-79), C (60-69), D (50-59)
- Be specific to Naruto lore in your analysis`;

  return prompt;
}

function parseAIResponse(text, teams) {
  try {
    // Try to extract JSON from response
    let jsonStr = text;

    // Remove markdown code blocks if present
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    // Try to find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        rankings: parsed.rankings || [],
        battleSimulation: parsed.battleSimulation || "",
        overallAnalysis: parsed.overallAnalysis || "",
        method: "gemini-ai",
      };
    }
  } catch (e) {
    console.error("❌ JSON Parse Error:", e.message);
  }

  // If parsing fails, use stat-based
  console.warn("⚠️  Falling back to stat-based ranking");
  return evaluateWithStats(teams);
}

// --- FALLBACK: STAT-BASED EVALUATION ---
function evaluateWithStats(teams) {
  const teamScores = [];

  for (const [playerName, team] of Object.entries(teams)) {
    let totalStats = 0;
    let synergyBonus = 0;
    let balanceBonus = 0;

    const roles = new Set();
    const clans = new Set();
    const villages = new Set();

    team.forEach((char) => {
      const stats = char.stats;
      totalStats +=
        stats.ninjutsu +
        stats.taijutsu +
        stats.genjutsu +
        stats.intelligence +
        stats.stamina +
        stats.speed;

      roles.add(char.role);
      clans.add(char.clan);
      villages.add(char.village);
    });

    // Synergy: Same clan bonus
    if (clans.size < team.length) synergyBonus += 15;

    // Balance: Different roles bonus
    balanceBonus = roles.size * 10;

    // Check for key roles
    const hasHealer = team.some((c) => c.role === "Healer");
    const hasDefense = team.some((c) => c.role === "Defense");
    const hasTactician = team.some((c) => c.role === "Tactician");
    if (hasHealer) balanceBonus += 10;
    if (hasDefense) balanceBonus += 8;
    if (hasTactician) balanceBonus += 12;

    const avgStat = totalStats / team.length;
    const rawScore = (avgStat / 600) * 60; // Max 60 points from raw stats
    const finalScore = Math.min(
      100,
      Math.round(rawScore + synergyBonus + balanceBonus)
    );

    let grade;
    if (finalScore >= 90) grade = "S";
    else if (finalScore >= 80) grade = "A";
    else if (finalScore >= 70) grade = "B";
    else if (finalScore >= 60) grade = "C";
    else grade = "D";

    // Find MVP (highest total stats)
    const mvp = team.reduce((best, char) => {
      const charTotal = Object.values(char.stats).reduce((a, b) => a + b, 0);
      const bestTotal = Object.values(best.stats).reduce((a, b) => a + b, 0);
      return charTotal > bestTotal ? char : best;
    });

    teamScores.push({
      player: playerName,
      score: finalScore,
      grade,
      strengths: [
        `Total combined power: ${totalStats}`,
        `${roles.size} different roles covered`,
        hasHealer ? "Has healing support" : "Strong offensive lineup",
      ],
      weaknesses: [
        !hasHealer ? "No dedicated healer" : "Healer may be targeted first",
        !hasDefense
          ? "Lacks dedicated defense"
          : "Defense may slow team tempo",
      ],
      synergyAnalysis: `Team covers ${roles.size} roles with members from ${clans.size} clan(s). ${
        synergyBonus > 0
          ? "Same-clan synergy detected!"
          : "Diverse clan composition."
      }`,
      mvp: mvp.name,
    });
  }

  // Sort by score descending
  teamScores.sort((a, b) => b.score - a.score);
  teamScores.forEach((t, idx) => (t.rank = idx + 1));

  return {
    rankings: teamScores,
    battleSimulation:
      "Based on statistical analysis, the top-ranked team has superior combined power and role balance. The battle would likely come down to team coordination and which side can exploit the other's weaknesses first.",
    overallAnalysis:
      "Rankings determined by combined stats, role diversity, clan synergy, and team composition balance.",
    method: "stat-based-fallback",
  };
}

// ========================
//  CLEANUP OLD ROOMS
// ========================
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  for (const [roomId, room] of Object.entries(gameRooms)) {
    if (now - room.createdAt > ONE_HOUR) {
      delete gameRooms[roomId];
      console.log(`🗑️  Cleaned up old room: ${roomId}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// ========================
//  START SERVER
// ========================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🍥 Naruto Team Battle Server`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`🤖 AI: ${model ? "Gemini Connected" : "Stat-Based Fallback"}\n`);
});
