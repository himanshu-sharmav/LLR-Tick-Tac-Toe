# Multiplayer Tic-Tac-Toe with Nakama

A production-ready, server-authoritative multiplayer Tic-Tac-Toe game built with Nakama game server and React.

**Live Game**: http://13.233.94.222

**Nakama Server Endpoint**: http://13.233.94.222/v2 (WebSocket: ws://13.233.94.222/v2/ws)

**Nakama Console**: http://13.233.94.222/console (admin / password)

## Architecture

```
                          Port 80 (nginx reverse proxy)
  Browser  ──────────────────────────────────────────────►  AWS EC2
                                                            ├── nginx (reverse proxy)
            /           → Frontend (React SPA)              ├── frontend (nginx serving static)
            /v2/, /ws   → Nakama API + WebSocket            ├── nakama (game server)
                                                            └── postgres (database)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Server-authoritative** | All game logic runs on Nakama. Clients only send move requests; server validates, applies, and broadcasts. Zero trust in client. |
| **TypeScript runtime** | Shared mental model with React frontend. Compiles to single `index.js` loaded by Nakama. |
| **Zustand over Context** | Socket event handlers run outside the React tree. Zustand's `getState()` allows direct state mutation from callbacks. |
| **Device auth** | Frictionless player onboarding. No signup required. Device ID persisted in localStorage. |
| **PostgreSQL** | Simpler than CockroachDB for single-node. Handles leaderboard persistence and player accounts. |

### Match Lifecycle

```
1. Player enters nickname → authenticateDevice → WebSocket connect
2. Player selects mode (Classic/Timed) → RPC "find_match"
3. Server finds open match or creates new one
4. Player joins match via WebSocket
5. When 2 players in: server broadcasts START (mark assignments, turn order)
6. Game loop:
   a. Active player sends MOVE (position 0-8)
   b. Server validates (turn check, cell check, bounds check)
   c. If invalid → REJECTED to sender only
   d. If valid → apply to board, check win/draw
   e. If game continues → broadcast UPDATE (new board, next turn)
   f. If timed mode: check deadline tick → auto-forfeit on timeout
7. Game ends → broadcast DONE (winner, reason, win line)
8. Leaderboard updated server-side
9. Match closes after 5s grace period
```

### Message Protocol (OpCodes)

| OpCode | Name | Direction | Payload |
|--------|------|-----------|---------|
| 1 | START | Server→Client | `{ marks, usernames, currentTurn, deadline, mode }` |
| 2 | UPDATE | Server→Client | `{ board, currentTurn, deadline, moveIndex }` |
| 3 | DONE | Server→Client | `{ board, winner, winnerMark, reason, winLine }` |
| 4 | MOVE | Client→Server | `{ position }` (0-8) |
| 5 | REJECTED | Server→Client | `{ reason }` |
| 6 | OPPONENT_LEFT | Server→Client | `{}` |
| 7 | TIMER_TICK | Server→Client | `{ secondsLeft }` (resync every 5s) |

### Anti-Cheat

- Client never knows the full server state — only receives validated broadcasts
- Move validation checks: game not over, correct turn, position 0-8, cell empty
- Timer enforced server-side (tick-based, not client clock)
- Match labels track open/closed status to prevent unauthorized joins

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Zustand + Tailwind CSS
- **Backend**: Nakama 3.24.2 (TypeScript runtime)
- **Database**: PostgreSQL 12
- **Client SDK**: @heroiclabs/nakama-js
- **Deployment**: Docker Compose + AWS EC2 (all-in-one with nginx reverse proxy)

## Features

### Core
- Server-authoritative game logic with full move validation
- Real-time matchmaking via RPC + Nakama matchmaker
- WebSocket-based real-time game state synchronization
- Graceful disconnect/reconnection handling
- Mobile-responsive dark-themed UI

### Bonus
- **Leaderboard**: Wins, losses, draws, win streaks, global ranking
- **Timer Mode**: 30-second turn timer with server-enforced auto-forfeit
- **Concurrent Matches**: Multiple independent game sessions via Nakama's match isolation

## Project Structure

```
├── docker-compose.yml         # Local dev environment
├── docker-compose.prod.yml    # Production deployment
├── Dockerfile.nakama          # Multi-stage Nakama build
├── nakama/
│   ├── src/
│   │   ├── main.ts            # Module entry: register handlers, RPCs, hooks
│   │   ├── match_handler.ts   # Authoritative match lifecycle
│   │   ├── game_logic.ts      # Pure: validateMove, checkWinner, checkDraw
│   │   ├── messages.ts        # OpCodes, types, interfaces
│   │   ├── leaderboard.ts     # Leaderboard creation + score writing
│   │   └── rpc.ts             # RPCs: find_match, get_leaderboard
│   ├── build/                 # Compiled JS (loaded by Nakama)
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── nakama/            # Client + socket connection layer
│   │   ├── store/             # Zustand game state
│   │   ├── components/        # Board, Cell, Timer, PlayerInfo, etc.
│   │   ├── pages/             # Home, Lobby, Game, Result
│   │   └── styles/            # Tailwind + animations
│   ├── vite.config.ts
│   └── package.json
├── deployment/
│   ├── nginx.conf             # Reverse proxy (routes / → frontend, /v2 → nakama)
│   ├── frontend-nginx.conf    # SPA static file server
│   └── deploy.sh              # EC2 setup script
├── Dockerfile.frontend        # Multi-stage frontend build
├── .env.example               # Environment variable template
└── README.md
```

## Local Development Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- npm

### 1. Build Nakama Server Module

```bash
cd nakama
npm install
npm run build
```

This compiles TypeScript to `nakama/build/index.js`.

### 2. Start Nakama + PostgreSQL

```bash
# From project root
docker-compose up -d
```

Services:
- **Nakama API**: http://localhost:7350
- **Nakama Console**: http://localhost:7351 (admin/password)
- **PostgreSQL**: localhost:5432

Verify the module loaded by checking the Nakama console → Runtime Modules.

### 3. Start Frontend Dev Server

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 4. Test Multiplayer

1. Open http://localhost:5173 in two separate browser windows (or incognito)
2. Enter different nicknames in each
3. Both click "Find Match" → they should join the same match
4. Play the game! Moves appear in real-time on both windows

## Production Deployment (AWS EC2)

The entire stack (frontend + backend + database) runs on a single EC2 instance behind an nginx reverse proxy.

### Quick Deploy

1. Launch an Ubuntu 22.04 EC2 instance (`t3.small` minimum)
2. Security group: allow inbound TCP ports **22** (SSH) and **80** (HTTP)
3. Upload and deploy:

```bash
# Upload project files
scp -r . ubuntu@<EC2_IP>:/opt/ttt-server/

# SSH in and run deploy script
ssh ubuntu@<EC2_IP> 'cd /opt/ttt-server && bash deployment/deploy.sh'
```

The deploy script automatically:
- Installs Docker if not present
- Generates `.env` with random secrets and auto-detects the public IP
- Builds all 4 containers (postgres, nakama, frontend, nginx)
- Starts the production stack

### Manual Deploy

```bash
# 1. Copy .env.example and edit
cp .env.example .env
# Set PUBLIC_HOST to your EC2 public IP

# 2. Build and start
docker compose -f docker-compose.prod.yml up -d --build
```

### Production Architecture

| Container | Role | Internal Port |
|-----------|------|--------------|
| `ttt-nginx` | Reverse proxy, exposed on port 80 | 80 |
| `ttt-frontend` | Serves React SPA (nginx) | 80 |
| `ttt-nakama` | Game server (API + WebSocket) | 7350, 7351 |
| `ttt-postgres` | Database | 5432 |

Nginx routes: `/` → frontend, `/v2/` and `/ws` → Nakama API/WebSocket, `/console` → Nakama admin console.

## Environment Variables

### Frontend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_NAKAMA_HOST` | `127.0.0.1` | Nakama server hostname |
| `VITE_NAKAMA_PORT` | `7350` | Nakama HTTP/WebSocket port |
| `VITE_NAKAMA_KEY` | `defaultkey` | Server connection key |
| `VITE_NAKAMA_SSL` | `false` | Enable HTTPS/WSS |

### Backend (.env for docker-compose.prod.yml)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `changeme_in_production` | PostgreSQL password |
| `NAKAMA_SERVER_KEY` | `defaultkey` | Socket connection key |
| `NAKAMA_ENCRYPTION_KEY` | `defaultencryptionkey` | JWT encryption key |
| `NAKAMA_HTTP_KEY` | `defaulthttpkey` | HTTP runtime key |

## API / Server Configuration

### RPCs

| RPC ID | Input | Output | Description |
|--------|-------|--------|-------------|
| `find_match` | `{ mode: "classic"\|"timed" }` | `{ matchId: string }` | Find or create a match |
| `get_leaderboard` | `{ limit?: number }` | `{ entries: LeaderboardEntry[] }` | Get top players |

### Nakama Console

Access at `http://localhost:7351` (development) or `https://your-domain.com/console` (production).

Default credentials: `admin` / `password`

Use the console to:
- Monitor active matches
- View player accounts
- Check runtime module status
- Browse leaderboard data

## Testing Multiplayer

### Manual Testing

1. Open two browser tabs at the game URL
2. Enter different nicknames
3. Both select same mode and click "Find Match"
4. Verify:
   - Both players see the board
   - Moves appear in real-time on both screens
   - Only the current player can make moves
   - Win/draw detection works correctly
   - Leaderboard updates after game ends

### Edge Cases to Test

- **Invalid move**: Click an occupied cell → should show rejection message
- **Wrong turn**: Click during opponent's turn → should be blocked client-side
- **Disconnect**: Close one tab mid-game → other player should win by abandonment
- **Timer forfeit** (timed mode): Wait 30s without moving → auto-forfeit
- **Concurrent matches**: Open 4 tabs, create 2 separate matches simultaneously

## License

MIT
