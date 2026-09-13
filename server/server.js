require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const characters = require("./data/characters.json");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Gemini AI setup (optional)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let model = null;
if (GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log("✅ Gemini AI connected");
  } catch (e) {
    console.log("⚠️ AI initialization failed, using stat engine");
  }
}

const gameRooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get("/api/characters", (req, res) => res.json(characters));

// WebSocket Events
io.on("connection", (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on("createRoom", ({ playerName, teamSize }, callback) => {
    const roomId = generateRoomId();
    gameRooms[roomId] = {
      host: socket.id,
      players: { [socket.id]: { name: playerName, id: socket.id } },
      teams: {},
      status: "waiting",
      teamSize: teamSize || 3,
      createdAt: Date.now(),
    };
    socket.join(roomId);
    socket.data = { roomId, playerName };
    callback({ success: true, roomId, players: [playerName] });
  });

  socket.on("joinRoom", ({ roomId, playerName }, callback) => {
    const room = gameRooms[roomId];
    if (!room) return callback({ success: false, error: "Room not found" });
    if (Object.keys(room.players).length >= 10) return callback({ success: false, error: "Room full" });
    if (room.status !== "waiting") return callback({ success: false, error: "Game already started" });

    room.players[socket.id] = { name: playerName, id: socket.id };
    socket.join(roomId);
    socket.data = { roomId, playerName };

    const playerNames = Object.values(room.players).map((p) => p.name);
    io.to(roomId).emit("playerJoined", { players: playerNames, newPlayer: playerName });
    callback({ success: true, roomId, players: playerNames, teamSize: room.teamSize });
  });

  socket.on("startGame", ({ roomId }) => {
    const room = gameRooms[roomId];
    if (!room || room.host !== socket.id) return;
    room.status = "drafting";
    io.to(roomId).emit("gameStarted", { teamSize: room.teamSize, characters });
  });

  socket.on("submitTeam", ({ roomId, team }) => {
    const room = gameRooms[roomId];
    if (!room) return;
    const playerName = socket.data.playerName;
    room.teams[playerName] = team;

    const total = Object.keys(room.players).length;
    const count = Object.keys(room.teams).length;

    io.to(roomId).emit("teamSubmitted", { player: playerName, teamsSubmitted: count, totalPlayers: total });
    if (count === total) evaluateTeams(roomId);
  });

  socket.on("rematch", ({ roomId }) => {
    const room = gameRooms[roomId];
    if (!room) return;
    room.teams = {};
    room.status = "drafting";
    io.to(roomId).emit("gameStarted", { teamSize: room.teamSize, characters });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data?.roomId;
    if (roomId && gameRooms[roomId]) {
      delete gameRooms[roomId].players[socket.id];
      const remaining = Object.values(gameRooms[roomId].players).map((p) => p.name);
      if (remaining.length === 0) delete gameRooms[roomId];
      else io.to(roomId).emit("playerLeft", { players: remaining });
    }
  });
});

async function evaluateTeams(roomId) {
  const room = gameRooms[roomId];
  room.status = "evaluating";
  io.to(roomId).emit("evaluating");

  let result = evaluateWithStats(room.teams);
  if (model) {
    try {
      const prompt = buildAIPrompt(room.teams);
      const res = await model.generateContent(prompt);
      const jsonMatch = res.response.text().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = { ...parsed, method: "gemini-ai" };
      }
    } catch (e) {
      console.log("⚠️ AI Error, using stat engine fallback");
    }
  }

  room.status = "complete";
  io.to(roomId).emit("rankingComplete", result);
}

function evaluateWithStats(teams) {
  const teamScores = [];
  
  // The exact keys matching the 8 categories from the frontend
  const categoryKeys = ["speed", "power", "iq", "ninjutsu", "durability", "taijutsu", "genjutsu", "chakra"];

  for (const [playerName, team] of Object.entries(teams)) {
    let categoryScore = 0;
    let strengths = [];
    let weaknesses = [];
    let bestPick = null;
    let highestStatMatch = 0;

    // Evaluate each character based on the SPECIFIC SLOT they were placed in
    team.forEach((char, index) => {
      const assignedCategory = categoryKeys[index];
      const statValue = char.stats[assignedCategory]; // How good are they at this specific thing?
      
      categoryScore += statValue;

      // Track MVP pick
      if (statValue > highestStatMatch) {
        highestStatMatch = statValue;
        bestPick = `${char.name} (${assignedCategory.toUpperCase()} - ${statValue})`;
      }

      if (statValue >= 90) strengths.push(`Brilliant pick: ${char.name} for ${assignedCategory}`);
      if (statValue < 70) weaknesses.push(`Poor pick: ${char.name} for ${assignedCategory} (Stat: ${statValue})`);
    });

    // Score out of 100 based on how perfectly they matched characters to categories
    const maxPossibleScore = team.length * 100;
    const finalScore = Math.round((categoryScore / maxPossibleScore) * 100);
    const grade = finalScore >= 90 ? "S" : finalScore >= 80 ? "A" : finalScore >= 70 ? "B" : "C";

    teamScores.push({
      player: playerName,
      score: finalScore,
      grade,
      strengths: strengths.slice(0, 3), // Top 3 strengths
      weaknesses: weaknesses.slice(0, 2), // Top 2 weaknesses
      synergyAnalysis: `Scored ${categoryScore} out of ${maxPossibleScore} possible category points.`,
      mvp: bestPick,
    });
  }

  teamScores.sort((a, b) => b.score - a.score);
  teamScores.forEach((t, i) => (t.rank = i + 1));

  return {
    rankings: teamScores,
    battleSimulation: "The winner was decided by who drafted the most statistically perfect characters for their specific categories!",
    overallAnalysis: "Rankings calculated dynamically via Category Match Engine.",
    method: "category-engine",
  };
}

function buildAIPrompt(teams) {
  return `Rank these Naruto teams from best to worst. Teams: ${JSON.stringify(teams)}. Return JSON: {"rankings":[{"rank":1,"player":"...","score":95,"grade":"S","strengths":["..."],"weaknesses":["..."],"synergyAnalysis":"...","mvp":"..."}],"battleSimulation":"...","overallAnalysis":"..."}`;
}

// Serve Frontend Static Files (For Render Deployment)
const distPath = path.join(__dirname, "../client/dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return;
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🍥 Naruto Team Battle Server running on port ${PORT}`);
});


