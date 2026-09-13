# 🍥 Naruto Team Battle

A multiplayer Naruto character drafting game where AI ranks your teams!

## 🎮 How It Works

1. **Create a Room** — One player creates a room and shares the code
2. **Join** — Other players join with the room code (2-4 players)
3. **Draft** — Each player picks their dream team of shinobi
4. **AI Ranks** — Google Gemini AI evaluates all teams and crowns a winner!

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google Gemini API key (free: https://aistudio.google.com/apikey)

### Server Setup
```bash
cd server
npm install
echo "GEMINI_API_KEY=your-key-here" > .env
npm start
