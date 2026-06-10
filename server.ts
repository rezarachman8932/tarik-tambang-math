import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { RoomState, MathQuestion, GameOperation, GameLevel, GameResult } from "./src/types";

// In-memory database of active sessions
const rooms: Map<string, RoomState> = new Map();

// SSE connections map: roomId -> Array of active response objects to push events
const sseConnections: Map<string, any[]> = new Map();

// Generate fallback server math question if needed
function generateServerQuestion(op: GameOperation, level: GameLevel): MathQuestion {
  const randomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  let operandA = 1, operandB = 1, correctAnswer = "2";

  switch (op) {
    case GameOperation.ADD:
      if (level === GameLevel.BEGINNER) { operandA = randomInt(1, 9); operandB = randomInt(1, 9); }
      else if (level === GameLevel.MEDIUM) { operandA = randomInt(1, 9); operandB = randomInt(10, 99); if (Math.random() > 0.5) { const t = operandA; operandA = operandB; operandB = t; } }
      else { operandA = randomInt(10, 99); operandB = randomInt(10, 99); }
      correctAnswer = (operandA + operandB).toString();
      break;
    case GameOperation.SUB:
      if (level === GameLevel.BEGINNER) { operandA = randomInt(1, 9); operandB = randomInt(0, operandA); }
      else if (level === GameLevel.MEDIUM) { operandA = randomInt(10, 99); operandB = randomInt(1, 9); }
      else { operandA = randomInt(10, 99); operandB = randomInt(10, operandA); }
      correctAnswer = (operandA - operandB).toString();
      break;
    case GameOperation.MUL:
      if (level === GameLevel.BEGINNER) { operandA = randomInt(1, 9); operandB = randomInt(1, 9); }
      else if (level === GameLevel.MEDIUM) { operandA = randomInt(1, 9); operandB = randomInt(10, 25); if (Math.random() > 0.5) { const t = operandA; operandA = operandB; operandB = t; } }
      else { operandA = randomInt(10, 30); operandB = randomInt(10, 20); }
      correctAnswer = (operandA * operandB).toString();
      break;
    case GameOperation.DIV:
      if (level === GameLevel.BEGINNER) {
        const result = randomInt(1, 4); operandB = randomInt(1, 5); operandA = result * operandB;
        correctAnswer = Math.floor(operandA / operandB).toString();
      } else if (level === GameLevel.MEDIUM) {
        const result = randomInt(2, 20); operandB = randomInt(1, 9); operandA = result * operandB;
        while (operandA < 10 || operandA > 99) {
          const r = randomInt(2, 25); const d = randomInt(2, 9);
          operandA = r * d; operandB = d;
        }
        correctAnswer = Math.floor(operandA / operandB).toString();
      } else {
        operandA = randomInt(10, 99); operandB = randomInt(2, 10);
        correctAnswer = (Math.round((operandA / operandB) * 10) / 10).toString();
      }
      break;
  }

  return { operandA, operandB, operator: op, correctAnswer };
}

// Broadcast JSON updates to all subscribers of a roomId
function broadcastToRoom(roomId: string, message: any) {
  const connections = sseConnections.get(roomId);
  if (connections && connections.length > 0) {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    connections.forEach((res) => {
      try {
        res.write(data);
      } catch (err) {
        console.error("SSE push error:", err);
      }
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // REST API Endpoints

  // Clean room list filtered by waiting
  app.get("/api/rooms", (req, res) => {
    const list = Array.from(rooms.values()).filter(r => r.status === "waiting");
    res.json(list);
  });

  // Create a room (Host)
  app.post("/api/rooms/create", (req, res) => {
    const { name, hostName, hostId, operation, level } = req.body;
    if (!name || !hostName || !hostId) {
      return res.status(400).json({ error: "Missing hosting parameters" });
    }

    const roomId = `room_${Math.random().toString(36).substring(2, 9)}`;
    const newRoom: RoomState = {
      id: roomId,
      name,
      hostName,
      hostId,
      status: "waiting",
      config: {
        operation: operation || GameOperation.ADD,
        level: level || GameLevel.BEGINNER
      },
      ropePosition: 0,
      score1: 0,
      score2: 0,
      timer: 60,
      nextQuestionIndex: 1
    };

    // Pre-generate the first question
    newRoom.currentQuestion = generateServerQuestion(newRoom.config!.operation, newRoom.config!.level);

    rooms.set(roomId, newRoom);
    res.json(newRoom);
  });

  // Join a room (Guest)
  app.post("/api/rooms/:roomId/join", (req, res) => {
    const { roomId } = req.params;
    const { guestName, guestId } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.status !== "waiting") {
      return res.status(400).json({ error: "Room is already full or running" });
    }

    room.guestName = guestName;
    room.guestId = guestId;
    
    rooms.set(roomId, room);

    // Notify host that guest connected
    broadcastToRoom(roomId, {
      type: "OPPONENT_JOINED",
      guestName,
      guestId,
      room
    });

    res.json(room);
  });

  // Submit action (Host & Guest sync pipeline)
  app.post("/api/rooms/:roomId/action", (req, res) => {
    const { roomId } = req.params;
    const { action } = req.body; // GamePayload: { type, ... }

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (action.type === "START_GAME") {
      room.status = "playing";
      room.timer = 60;
      room.ropePosition = 0;
      room.score1 = 0;
      room.score2 = 0;
      room.currentQuestion = generateServerQuestion(room.config!.operation, room.config!.level);
      
      rooms.set(roomId, room);
      broadcastToRoom(roomId, { type: "START_GAME", room });
    } 
    
    else if (action.type === "PLAYER_ANSWER") {
      const { playerId, answer, isCorrect } = action;
      if (isCorrect) {
        // Correct answer moves flag
        const isHost = (playerId === room.hostId);
        
        // Host pulls negative (left), Guest pulls positive (right)
        if (isHost) {
          room.ropePosition -= 1;
          room.score1 += 1;
        } else {
          room.ropePosition += 1;
          room.score2 += 1;
        }

        // Check pull win condition (limit reaching -7 or 7)
        if (room.ropePosition <= -7) {
          room.status = "finished";
          broadcastToRoom(roomId, {
            type: "GAME_OVER",
            winner: "HOST",
            room
          });
        } else if (room.ropePosition >= 7) {
          room.status = "finished";
          broadcastToRoom(roomId, {
            type: "GAME_OVER",
            winner: "GUEST",
            room
          });
        } else {
          // Serve a brand new question immediately
          room.currentQuestion = generateServerQuestion(room.config!.operation, room.config!.level);
          room.nextQuestionIndex += 1;
          
          broadcastToRoom(roomId, {
            type: "ROPE_STATE",
            ropePosition: room.ropePosition,
            score1: room.score1,
            score2: room.score2,
            currentQuestion: room.currentQuestion,
            pulledBy: isHost ? "HOST" : "GUEST"
          });
        }
        rooms.set(roomId, room);
      } else {
        // Wrong answer: Broadcast flash effect or event to sync wrong inputs
        broadcastToRoom(roomId, {
          type: "WRONG_ANSWER",
          playerId
        });
      }
    } 
    
    else if (action.type === "TIME_UPDATE") {
      const { timer } = action;
      room.timer = timer;
      if (timer <= 0 && room.status === "playing") {
        room.status = "finished";
        let winner = "DRAW";
        if (room.score1 > room.score2) winner = "HOST";
        else if (room.score2 > room.score1) winner = "GUEST";

        broadcastToRoom(roomId, {
          type: "GAME_OVER",
          winner,
          room
        });
      }
      rooms.set(roomId, room);
    } 
    
    else if (action.type === "REPLAY") {
      room.status = "playing";
      room.ropePosition = 0;
      room.score1 = 0;
      room.score2 = 0;
      room.timer = 60;
      room.currentQuestion = generateServerQuestion(room.config!.operation, room.config!.level);
      
      rooms.set(roomId, room);
      broadcastToRoom(roomId, { type: "REPLAY", room });
    }

    res.json({ success: true });
  });

  // Client registration endpoint for Server-Sent Events (SSE)
  app.get("/api/rooms/:roomId/events", (req, res) => {
    const { roomId } = req.params;
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (!sseConnections.has(roomId)) {
      sseConnections.set(roomId, []);
    }
    sseConnections.get(roomId)!.push(res);

    // Send initial ping or match configuration
    res.write(`data: ${JSON.stringify({ type: "SYNC_CONNECTION", status: "ok" })}\n\n`);

    req.on("close", () => {
      const cons = sseConnections.get(roomId) || [];
      const updated = cons.filter((conn) => conn !== res);
      if (updated.length === 0) {
        sseConnections.delete(roomId);
        // Self-destruct empty rooms after 1 minute of complete inactivity to save system resources
        setTimeout(() => {
          if (!sseConnections.has(roomId)) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} swept due to user timeout/disconnections.`);
          }
        }, 60000);
      } else {
        sseConnections.set(roomId, updated);
      }
    });
  });

  // Serve Frontend bundle files / routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tarik Tambang server initiated online at http://localhost:${PORT}`);
  });
}

startServer();
