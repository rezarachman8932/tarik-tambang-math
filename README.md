# Tarik Tambang Math Game

A beautifully polished, production-ready, full-stack **Math Tug-of-War** game. Challenge a computer opponent that adjusts its response speeds dynamically to your chosen level, or play head-to-head with split virtual numpads on the same screen (perfect for tablets and touch displays), or host a real-time lobby over a Server-Sent Events (SSE) sync protocol!

## Key Features

- **Dynamic CPU Difficulty Engine**:
  - **Beginner**: CPU takes 3–5 seconds, simple 1-digit questions.
  - **Medium**: CPU takes 2–3.5s, mixed digit queries.
  - **Hard**: CPU solves complex math or 1-decimal divisions in just 1–2 seconds!
- **Same-Device Multiplayer**: Play face-to-face with independent, color-themed virtual keyboards.
- **SSE Real-time Lobby**: Create/Host or Join existing lobbies. Completely synchronized state via Node/Express backend.
- **Custom Braided Rope View**: Interactive animated central flag responding to correct/incorrect answers with spring-loaded physical movements.
- **Synthesized Audio Node Pool**: Chimes, buzzers, and victory fanfare synthesized in real-time from the Web Audio API (completely immune to browser file-loading latency or blocking permissions).
- **Interactive Confetti System**: Smooth canvas-rendered vector color drops on the match complete winner screen.

## Project Structure

```
├── server.ts                 # Full Express Node backend hosting APIs and real-time SSE triggers
├── src/
│   ├── App.tsx               # Main visual state router, screens, and input loops
│   ├── types.ts              # Shared game structures, operations, and state boundaries
│   ├── components/
│   │   ├── RopeView.tsx      # Custom braided rope rendering with spring-loaded flags
│   │   └── NumpadView.tsx    # Responsive modular numpad with feedback behaviors
│   └── utils/
│       ├── mathUtils.ts      # Deterministic math problem generator (ranges match specification)
│       └── soundManager.ts   # Web Audio API synthesizers for real-time chime responses
```

## Running the Application Locally

1. Install modern project dependencies:
   ```bash
   npm install
   ```
2. Initiate the full-stack development instance:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser. Feel free to open multiple separate windows to play in Online mode!
