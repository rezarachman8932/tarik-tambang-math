import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  GameOperation, 
  GameLevel, 
  GameMode, 
  MathQuestion, 
  RoomState,
  LeaderboardEntry
} from "./types";
import { generateQuestion, getOperatorSymbol } from "./utils/mathUtils";
import { soundManager } from "./utils/soundManager";
import RopeView from "./components/RopeView";
import NumpadView from "./components/NumpadView";
import { 
  Volume2, 
  VolumeX, 
  Plus, 
  Minus, 
  X, 
  Percent, 
  Tv, 
  Users, 
  Globe, 
  ArrowLeft, 
  Zap, 
  RefreshCcw, 
  Home, 
  Trophy, 
  ChevronRight, 
  Radio 
} from "lucide-react";

export default function App() {
  const [screen, setScreen] = useState<
    "splash" | "home" | "operation" | "level" | "mode" | "rooms_lobby" | "waiting_lobby" | "game" | "result"
  >("splash");

  // Selection state
  const [selectedOp, setSelectedOp] = useState<GameOperation>(GameOperation.ADD);
  const [selectedLevel, setSelectedLevel] = useState<GameLevel>(GameLevel.BEGINNER);
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.SINGLE_PLAYER);

  // Sound control
  const [muted, setMuted] = useState(soundManager.isMuted());

  // Input states
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem("tarik_tambang_name") || `Pemain ${Math.floor(Math.random() * 900) + 100}`;
  });
  const [roomName, setRoomName] = useState(`Arena ${playerName}`);

  // Game board states (for Single Player and Local 2-Player)
  const [ropePosition, setRopePosition] = useState<number>(0); // -7 to 7
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [timer, setTimer] = useState(60);
  const [p1Input, setP1Input] = useState("");
  const [p2Input, setP2Input] = useState("");
  const [currentQuestionP1, setCurrentQuestionP1] = useState<MathQuestion | null>(null);
  const [currentQuestionP2, setCurrentQuestionP2] = useState<MathQuestion | null>(null);

  // Online Multiplayer States
  const [activeRooms, setActiveRooms] = useState<RoomState[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [onlinePlayerId] = useState(() => `usr_${Math.random().toString(36).substring(2, 9)}`);
  
  // Flash indicators (feedback)
  const [p1Flash, setP1Flash] = useState<"correct" | "wrong" | null>(null);
  const [p2Flash, setP2Flash] = useState<"correct" | "wrong" | null>(null);
  const [ropeShake, setRopeShake] = useState(false);

  // Confetti Particle Ref for the Winner Screen
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sseSourceRef = useRef<EventSource | null>(null);
  const gameLoopIntervalRef = useRef<any>(null);
  const cpuActionTimeoutRef = useRef<any>(null);

  // Save Player Name preference
  const handleNameChange = (val: string) => {
    const cleaned = val.substring(0, 12);
    setPlayerName(cleaned);
    localStorage.setItem("tarik_tambang_name", cleaned);
  };

  // Toggle audio sound settings
  const toggleMute = () => {
    const nextState = !muted;
    setMuted(nextState);
    soundManager.setMuted(nextState);
  };

  // Local Leaderboard state and effects
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const clearLeaderboard = () => {
    const confirmation = window.confirm("Apakah kamu yakin ingin menghapus semua data Papan Peringkat?");
    if (confirmation) {
      try {
        localStorage.removeItem("tarik_tambang_leaderboard");
        setLeaderboard([]);
        soundManager.playCorrect();
      } catch (err) {
        console.error("Failed to clear local leaderboard", err);
      }
    }
  };

  // Load leaderboard when returning to home screen
  useEffect(() => {
    if (screen === "home") {
      try {
        const stored = localStorage.getItem("tarik_tambang_leaderboard") || "[]";
        setLeaderboard(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to load local leaderboard", err);
      }
    }
  }, [screen]);

  // Save score to local leaderboard when game finishes (transition to result screen)
  useEffect(() => {
    if (screen === "result") {
      try {
        const leaderboardStr = localStorage.getItem("tarik_tambang_leaderboard") || "[]";
        let localLeaderboard: LeaderboardEntry[] = JSON.parse(leaderboardStr);
        
        const newEntries: Omit<LeaderboardEntry, "id" | "date">[] = [];
        const dateStr = new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        });

        const levelLabel = selectedLevel === GameLevel.BEGINNER ? "Pemula" : selectedLevel === GameLevel.MEDIUM ? "Jagoan" : "Pintar";
        const opLabel = selectedOp === GameOperation.ADD ? "Tambah" : selectedOp === GameOperation.SUB ? "Kurang" : selectedOp === GameOperation.MUL ? "Kali" : "Bagi";

        if (selectedMode === GameMode.SINGLE_PLAYER) {
          newEntries.push({
            name: playerName || "Pemain",
            score: score1,
            mode: "Solo vs CPU",
            level: levelLabel,
            operation: opLabel
          });
        } else if (selectedMode === GameMode.TWO_PLAYER_LOCAL) {
          if (ropePosition <= -7 || score1 > score2) {
            newEntries.push({
              name: (playerName || "Pemain 1"),
              score: score1,
              mode: "Lokal 2P",
              level: levelLabel,
              operation: opLabel
            });
          } else if (ropePosition >= 7 || score2 > score1) {
            newEntries.push({
              name: "Pemain 2",
              score: score2,
              mode: "Lokal 2P",
              level: levelLabel,
              operation: opLabel
            });
          } else {
            // Draw
            newEntries.push({
              name: (playerName || "Pemain 1"),
              score: score1,
              mode: "Lokal 2P",
              level: levelLabel,
              operation: opLabel
            }, {
              name: "Pemain 2",
              score: score2,
              mode: "Lokal 2P",
              level: levelLabel,
              operation: opLabel
            });
          }
        } else if (selectedMode === GameMode.TWO_PLAYER_ONLINE && currentRoom) {
          const isPlayerHost = onlinePlayerId === currentRoom.hostId;
          const myName = isPlayerHost ? currentRoom.hostName : (currentRoom.guestName || playerName || "Penantang");
          const myScore = isPlayerHost ? score1 : score2;
          newEntries.push({
            name: myName,
            score: myScore,
            mode: "Online 🌐",
            level: levelLabel,
            operation: opLabel
          });
        }

        const entriesWithMeta = newEntries.map(entry => ({
          ...entry,
          id: Math.random().toString(36).substring(2, 9),
          date: dateStr
        }));

        const validEntries = entriesWithMeta.filter(e => e.score > 0);

        if (validEntries.length > 0) {
          const updated = [...localLeaderboard, ...validEntries];
          updated.sort((a, b) => b.score - a.score);
          const topFive = updated.slice(0, 5);
          localStorage.setItem("tarik_tambang_leaderboard", JSON.stringify(topFive));
        }
      } catch (err) {
        console.error("Gagal menyimpan skor papan peringkat", err);
      }
    }
  }, [screen, selectedMode, playerName, score1, score2, ropePosition, selectedOp, selectedLevel, currentRoom, onlinePlayerId]);

  // Splash Screen automatic navigation
  useEffect(() => {
    if (screen === "splash") {
      const timer = setTimeout(() => {
        setScreen("home");
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Clean all ongoing timers/SSE pools on screen transition
  const cleanupAllGameTimers = () => {
    if (gameLoopIntervalRef.current) {
      clearInterval(gameLoopIntervalRef.current);
      gameLoopIntervalRef.current = null;
    }
    if (cpuActionTimeoutRef.current) {
      clearTimeout(cpuActionTimeoutRef.current);
      cpuActionTimeoutRef.current = null;
    }
    if (sseSourceRef.current) {
      sseSourceRef.current.close();
      sseSourceRef.current = null;
    }
  };

  const goBackOneStep = () => {
    cleanupAllGameTimers();
    if (screen === "game") {
      const confirmQuit = window.confirm("Apakah kamu yakin ingin menyerah dan keluar dari pertandingan?");
      if (!confirmQuit) return;
      setScreen("mode");
    } else if (screen === "result") {
      setScreen("mode");
    } else if (screen === "mode") {
      setScreen("home");
    } else if (screen === "operation") {
      setScreen("mode");
    } else if (screen === "level") {
      setScreen("operation");
    } else if (screen === "rooms_lobby") {
      setScreen("mode");
    } else if (screen === "waiting_lobby") {
      setScreen("rooms_lobby");
    } else {
      setScreen("home");
    }
  };

  // SSE/HTTP API interaction for online multiplayer
  const fetchWaitingRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const rooms = await res.json();
        setActiveRooms(rooms);
      }
    } catch (exp) {
      console.error("Failed to query waiting rooms:", exp);
    }
  };

  const createOnlineRoom = async () => {
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName || `${playerName}'s Match`,
          hostName: playerName,
          hostId: onlinePlayerId,
          operation: selectedOp,
          level: selectedLevel
        })
      });
      if (res.ok) {
        const room: RoomState = await res.json();
        setCurrentRoom(room);
        setIsHost(true);
        setScreen("waiting_lobby");
        subscribeToRoomEvents(room.id);
      }
    } catch (e) {
      console.error("Room creation error", e);
    }
  };

  const joinOnlineRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: playerName,
          guestId: onlinePlayerId
        })
      });
      if (res.ok) {
        const room: RoomState = await res.json();
        setCurrentRoom(room);
        setIsHost(false);
        setScreen("waiting_lobby");
        subscribeToRoomEvents(room.id);
      }
    } catch (e) {
      console.error("Failed to join target room", e);
    }
  };

  const sendRoomAction = async (roomId: string, action: any) => {
    try {
      await fetch(`/api/rooms/${roomId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
    } catch (e) {
      console.error("Action synchronization failure:", e);
    }
  };

  const subscribeToRoomEvents = (roomId: string) => {
    if (sseSourceRef.current) {
      sseSourceRef.current.close();
    }
    
    const source = new EventSource(`/api/rooms/${roomId}/events`);
    sseSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case "SYNC_CONNECTION":
            break;
            
          case "OPPONENT_JOINED":
            setCurrentRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                guestName: msg.guestName,
                guestId: msg.guestId
              };
            });
            break;

          case "START_GAME":
          case "REPLAY":
            cleanupAllGameTimers();
            setCurrentRoom(msg.room);
            setRopePosition(msg.room.ropePosition);
            setScore1(msg.room.score1);
            setScore2(msg.room.score2);
            setTimer(msg.room.timer);
            
            // Set sync questions
            if (msg.room.currentQuestion) {
              setCurrentQuestionP1(msg.room.currentQuestion);
              setCurrentQuestionP2(msg.room.currentQuestion);
            }
            setP1Input("");
            setP2Input("");
            setScreen("game");
            
            // Start local ticking sync monitor for Host only to emit clock
            if (onlinePlayerId === msg.room.hostId) {
              startHostTimer(msg.room.id);
            }
            break;

          case "ROPE_STATE":
            setRopePosition(msg.ropePosition);
            setScore1(msg.score1);
            setScore2(msg.score2);
            setRopeShake(true);
            setTimeout(() => setRopeShake(false), 250);

            if (msg.pulledBy === "HOST") {
              setP1Flash("correct");
              setTimeout(() => setP1Flash(null), 300);
              soundManager.playCorrect();
            } else {
              setP2Flash("correct");
              setTimeout(() => setP2Flash(null), 300);
              soundManager.playCorrect();
            }

            if (msg.currentQuestion) {
              setCurrentQuestionP1(msg.currentQuestion);
              setCurrentQuestionP2(msg.currentQuestion);
            }
            setP1Input("");
            setP2Input("");
            break;

          case "WRONG_ANSWER":
            if (msg.playerId === onlinePlayerId) {
              soundManager.playWrong();
            }
            if (msg.playerId !== onlinePlayerId) {
              // Opponent failed flash overlay
              if (isHost) {
                setP2Flash("wrong");
                setTimeout(() => setP2Flash(null), 350);
              } else {
                setP1Flash("wrong");
                setTimeout(() => setP1Flash(null), 350);
              }
            } else {
              if (isHost) {
                setP1Flash("wrong");
                setTimeout(() => setP1Flash(null), 350);
              } else {
                setP2Flash("wrong");
                setTimeout(() => setP2Flash(null), 350);
              }
            }
            break;

          case "GAME_OVER":
            cleanupAllGameTimers();
            if (msg.room) {
              setCurrentRoom(msg.room);
              setRopePosition(msg.room.ropePosition);
              setScore1(msg.room.score1);
              setScore2(msg.room.score2);
            }
            setScreen("result");
            soundManager.playWin();
            break;
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    source.onerror = () => {
      console.warn("SSE connection lost. Reconnecting...");
    };
  };

  const startHostTimer = (roomId: string) => {
    let currentSeconds = 60;
    gameLoopIntervalRef.current = setInterval(() => {
      currentSeconds -= 1;
      setTimer(currentSeconds);
      
      sendRoomAction(roomId, {
        type: "TIME_UPDATE",
        timer: currentSeconds
      });

      if (currentSeconds <= 0) {
        clearInterval(gameLoopIntervalRef.current);
      }
    }, 1000);
  };

  // Start Offline Modes
  const handleStartOfflineGame = () => {
    cleanupAllGameTimers();
    setRopePosition(0);
    setScore1(0);
    setScore2(0);
    setTimer(60);
    setP1Input("");
    setP2Input("");

    // Generate specific starting questions
    const q1 = generateQuestion(selectedOp, selectedLevel);
    setCurrentQuestionP1(q1);

    if (selectedMode === GameMode.TWO_PLAYER_LOCAL) {
      // Local multiplayer gets distinct questions to answer in parallel
      const q2 = generateQuestion(selectedOp, selectedLevel);
      setCurrentQuestionP2(q2);
    } else {
      // VS CPU gets the identical starting question as player
      setCurrentQuestionP2(q1);
    }

    setScreen("game");

    // Standard local game ticker
    gameLoopIntervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(gameLoopIntervalRef.current);
          handleGameOverTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // If versus CPU, queue up their first answer trigger loop
    if (selectedMode === GameMode.SINGLE_PLAYER) {
      queueCpuAnswerResponse(q1.correctAnswer);
    }
  };

  // CPU Thinking Action logic based on the difficulty interval rules
  const queueCpuAnswerResponse = (currentAnswer: string) => {
    if (cpuActionTimeoutRef.current) {
      clearTimeout(cpuActionTimeoutRef.current);
    }

    // Beginner 3-5 s, Medium 2-3.5 s, Hard 1-2 s
    let delayMin = 3000;
    let delayMax = 5000;
    switch (selectedLevel) {
      case GameLevel.BEGINNER:
        delayMin = 3000;
        delayMax = 5000;
        break;
      case GameLevel.MEDIUM:
        delayMin = 2000;
        delayMax = 3500;
        break;
      case GameLevel.HARD:
        delayMin = 1000;
        delayMax = 2000;
        break;
    }

    const calculatedDelay = Math.random() * (delayMax - delayMin) + delayMin;

    cpuActionTimeoutRef.current = setTimeout(() => {
      // CPU solves correct answer!
      setRopePosition((pos) => {
        const newPos = pos + 1; // Pulls to the right (CPU side)
        setRopeShake(true);
        setTimeout(() => setRopeShake(false), 200);
        soundManager.playCorrect();

        setP2Flash("correct");
        setTimeout(() => setP2Flash(null), 300);

        // Check if CPU reached full 7 points right limit
        if (newPos >= 7) {
          cleanupAllGameTimers();
          setScreen("result");
          soundManager.playWin();
        } else {
          // Serve next matching questions
          const nextQ = generateQuestion(selectedOp, selectedLevel);
          setCurrentQuestionP1(nextQ);
          setCurrentQuestionP2(nextQ);
          setP1Input("");
          queueCpuAnswerResponse(nextQ.correctAnswer);
        }

        return newPos;
      });
      setScore2((s) => s + 1);
    }, calculatedDelay);
  };

  // Offline time-up handling
  const handleGameOverTimeout = () => {
    cleanupAllGameTimers();
    setScreen("result");
    soundManager.playWin();
  };

  // Submission controls
  const handleAnswerSubmitP1 = () => {
    if (!currentQuestionP1) return;

    const cleanInput = p1Input.trim();
    if (cleanInput === currentQuestionP1.correctAnswer) {
      soundManager.playCorrect();
      setP1Flash("correct");
      setRopeShake(true);
      setTimeout(() => {
        setP1Flash(null);
        setRopeShake(false);
      }, 300);

      const nextPos = ropePosition - 1; // P1 pulls left
      setRopePosition(nextPos);
      setScore1((s) => s + 1);
      setP1Input("");

      if (nextPos <= -7) {
        cleanupAllGameTimers();
        setScreen("result");
        soundManager.playWin();
      } else {
        const nextQ = generateQuestion(selectedOp, selectedLevel);
        setCurrentQuestionP1(nextQ);

        // If VS CPU, the CPU also receives the same sync question
        if (selectedMode === GameMode.SINGLE_PLAYER) {
          setCurrentQuestionP2(nextQ);
          queueCpuAnswerResponse(nextQ.correctAnswer);
        }
      }
    } else {
      // Wrong input
      soundManager.playWrong();
      setP1Flash("wrong");
      setTimeout(() => setP1Flash(null), 350);
      setP1Input("");
    }
  };

  // Screen input control for Player 2 (Local Multi-player mode)
  const handleAnswerSubmitP2 = () => {
    if (!currentQuestionP2) return;

    const cleanInput = p2Input.trim();
    if (cleanInput === currentQuestionP2.correctAnswer) {
      soundManager.playCorrect();
      setP2Flash("correct");
      setRopeShake(true);
      setTimeout(() => {
        setP2Flash(null);
        setRopeShake(false);
      }, 300);

      const nextPos = ropePosition + 1; // P2 pulls right
      setRopePosition(nextPos);
      setScore2((s) => s + 1);
      setP2Input("");

      if (nextPos >= 7) {
        cleanupAllGameTimers();
        setScreen("result");
        soundManager.playWin();
      } else {
        const nextQ = generateQuestion(selectedOp, selectedLevel);
        setCurrentQuestionP2(nextQ);
      }
    } else {
      soundManager.playWrong();
      setP2Flash("wrong");
      setTimeout(() => setP2Flash(null), 350);
      setP2Input("");
    }
  };

  // Online Multiplayer Submit action handler
  const handleOnlineSubmit = () => {
    const activeQuestion = isHost ? currentQuestionP1 : currentQuestionP2;
    if (!activeQuestion || !currentRoom) return;

    const textAnswer = isHost ? p1Input : p2Input;
    const isCorrect = textAnswer.trim() === activeQuestion.correctAnswer;

    if (isHost) setP1Input("");
    else setP2Input("");

    sendRoomAction(currentRoom.id, {
      type: "PLAYER_ANSWER",
      playerId: onlinePlayerId,
      answer: textAnswer.trim(),
      isCorrect
    });
  };

  // Winner logic computation
  const getWinnerInfo = () => {
    if (selectedMode === GameMode.TWO_PLAYER_ONLINE && currentRoom) {
      if (ropePosition <= -7) {
        return { name: currentRoom.hostName, side: "P1", text: `${currentRoom.hostName} Menang karena menarik tali sampai habis! 🎉` };
      }
      if (ropePosition >= 7) {
        return { name: currentRoom.guestName || "Penantang", side: "P2", text: `${currentRoom.guestName || "Penantang"} Menang karena menarik tali sampai habis! 🎉` };
      }
      // Resolved by score on tie-break / time-up
      if (score1 > score2) {
        return { name: currentRoom.hostName, side: "P1", text: `${currentRoom.hostName} Menang berdasarkan jumlah tarikan terbanyak! 🏆` };
      }
      if (score2 > score1) {
        return { name: currentRoom.guestName || "Penantang", side: "P2", text: `${currentRoom.guestName || "Penantang"} Menang berdasarkan jumlah tarikan terbanyak! 🏆` };
      }
      return { name: "Kedua pemain", side: "DRAW", text: "Pertandingan Seri! Sama-sama kuat! 🤝" };
    }

    // Local / Single-Player logic
    if (ropePosition <= -7) {
      return { name: selectedMode === GameMode.SINGLE_PLAYER ? playerName : "Pemain 1", side: "P1", text: `${selectedMode === GameMode.SINGLE_PLAYER ? playerName : "Pemain 1"} Menang! Hebat sekali! 🎉` };
    }
    if (ropePosition >= 7) {
      return { name: selectedMode === GameMode.SINGLE_PLAYER ? "Komputer" : "Pemain 2", side: "P2", text: `${selectedMode === GameMode.SINGLE_PLAYER ? "Komputer" : "Pemain 2"} Menang! Jangan menyerah, coba lagi ya! 💪` };
    }
    if (score1 > score2) {
      return { name: selectedMode === GameMode.SINGLE_PLAYER ? playerName : "Pemain 1", side: "P1", text: `${selectedMode === GameMode.SINGLE_PLAYER ? playerName : "Pemain 1"} Menang berdasarkan skor tarikan terbanyak! 🏆` };
    }
    if (score2 > score1) {
      return { name: selectedMode === GameMode.SINGLE_PLAYER ? "Komputer" : "Pemain 2", side: "P2", text: `${selectedMode === GameMode.SINGLE_PLAYER ? "Komputer" : "Pemain 2"} Menang berdasarkan skor tarikan terbanyak! 🤖` };
    }
    return { name: "Tidak ada", side: "DRAW", text: "Pertandingan Seri! Sama-sama jago matematika! 🤝" };
  };

  // Custom vector confetti simulation loop
  useEffect(() => {
    if (screen === "result" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles: Array<{
        x: number;
        y: number;
        color: string;
        r: number;
        d: number;
        tilt: number;
        tiltAngle: number;
      }> = [];

      const colors = ["#FFC107", "#FF5722", "#E91E63", "#4CAF50", "#00BCD4", "#2196F3"];
      for (let i = 0; i < 110; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          color: colors[Math.floor(Math.random() * colors.length)],
          r: Math.random() * 6 + 4,
          d: Math.random() * canvas.height,
          tilt: Math.random() * 10 - 5,
          tiltAngle: 0
        });
      }

      let animationFrameId: number;
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, idx) => {
          p.tiltAngle += 0.03;
          p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
          p.x += Math.sin(p.tiltAngle);
          p.tilt = Math.sin(p.tiltAngle - idx / 3) * 12;

          if (p.y > canvas.height) {
            particles[idx] = {
              x: Math.random() * canvas.width,
              y: -20,
              color: p.color,
              r: p.r,
              d: p.d,
              tilt: Math.random() * 10 - 5,
              tiltAngle: 0
            };
          }

          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
          ctx.stroke();
        });

        animationFrameId = requestAnimationFrame(draw);
      };

      draw();
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [screen]);

  // Clean-up on unmount
  useEffect(() => {
    return () => cleanupAllGameTimers();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFBEB] font-sans text-amber-950 flex flex-col relative overflow-x-hidden selection:bg-amber-100 pb-8">
      
      {/* Dynamic Sound Action & Back Bar */}
      <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          {screen !== "splash" && screen !== "home" && (
            <button
              onClick={goBackOneStep}
              className="p-2.5 rounded-2xl bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="font-sans font-black text-lg tracking-normal text-amber-900 flex items-center gap-1.5">
            🪢 Tarik Tambang Math
          </span>
        </div>

        {/* Mute controller toggle */}
        <button
          onClick={toggleMute}
          className="p-2.5 rounded-2xl bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 active:scale-95 transition-all shadow-sm cursor-pointer"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-amber-800" />}
        </button>
      </header>

      {/* Primary Layout Engine container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 flex flex-col justify-center py-2 relative">

        {/* 1. SPLASH VIEW */}
        {screen === "splash" && (
          <div className="flex flex-col items-center text-center py-16 animate-fade-in">
            <div className="relative w-40 h-40 bg-gradient-to-tr from-amber-200 to-amber-100 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-300">
              <span className="text-[72px] transform rotate-12 transition-transform duration-700 select-none">🪢</span>
              <span className="absolute -bottom-2 -right-2 text-4xl animate-bounce">🚩</span>
              <div className="absolute inset-0 rounded-full border border-dashed border-amber-400 opacity-60 animate-spin-slow" />
            </div>
            
            <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-amber-950 sm:text-5xl">
              Tarik Tambang
            </h1>
            <p className="mt-3 text-lg font-medium text-amber-800 tracking-wide font-mono">
              MATEMATIKA
            </p>
            <div className="mt-8 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse delay-100" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse delay-200" />
            </div>
          </div>
        )}

        {/* 2. HOME VIEW */}
        {screen === "home" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="max-w-md mx-auto w-full bg-gradient-to-br from-amber-50 via-white to-orange-100 rounded-[36.2px] p-8 border-4 border-amber-300 shadow-2xl flex flex-col relative overflow-hidden"
          >
            {/* Playful top icons decoration */}
            <div className="absolute right-3 top-3 text-2xl animate-spin-slow">⭐</div>
            <div className="absolute left-3 top-20 text-xl animate-bounce">🎈</div>

            <div className="text-center mb-6 z-10">
              <div className="inline-flex p-4 rounded-3xl bg-amber-100/80 border-2 border-amber-300 text-5xl mb-4 animate-bounce">
                🪢
              </div>
              <h2 className="text-3xl font-black text-amber-950 tracking-wide font-sans">
                Tarik Tambang Math!
              </h2>
              <p className="text-sm font-bold text-amber-800 mt-2 leading-relaxed">
                Ayo hitung soal matematika secepat mungkin untuk menarik tali tambang ke arenamu! 🏆
              </p>
            </div>

            {/* Profile Input card section with bounce/pop motion */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.15 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="bg-amber-100/50 rounded-2xl p-5 border-2 border-amber-200/60 mb-6 z-10 shadow-sm"
            >
              <label className="block text-xs font-black text-amber-900 uppercase tracking-wider mb-2">
                ✍️ Tulis Nama Kerenmu di Sini:
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ketik nama panggilanmu..."
                maxLength={12}
                className="w-full px-4 py-3 rounded-2xl border-2 border-amber-300 bg-white text-base text-amber-950 placeholder-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-400 font-sans font-black text-center"
              />
            </motion.div>

            {/* Main call-to-action button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                soundManager.playCorrect(); // playful click sound trigger
                setScreen("mode");
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 px-6 rounded-2xl text-lg font-black border-b-6 border-orange-700 hover:from-orange-600 hover:to-amber-600 active:translate-y-1 active:border-b-2 shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>MULAI BERMAIN! 🚀</span>
              <ChevronRight className="w-6 h-6 stroke-[3]" />
            </motion.button>

            {/* Papan Peringkat (Leaderboard) */}
            <div className="mt-6 bg-amber-50/75 border-2 border-amber-200 rounded-[24px] p-4.5 z-10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span>🏆 Papan Peringkat (Top 5)</span>
                </h4>
                {leaderboard.length > 0 && (
                  <button
                    onClick={clearLeaderboard}
                    className="text-[10px] text-amber-900/40 hover:text-red-600 font-bold hover:underline transition-colors flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-full border border-amber-200/55"
                  >
                    <span>Reset 🗑️</span>
                  </button>
                )}
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-xs font-bold text-amber-800/85 leading-relaxed text-center py-5 bg-white/60 rounded-2xl border-2 border-dashed border-amber-200 px-3">
                  Belum ada rekor tercatat. Ayo jadilah yang pertama mencetak skor tertinggi! 🚀🎯
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[170px] overflow-y-auto pr-1">
                  {leaderboard.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between bg-white border border-amber-100 rounded-2xl p-2.5 shadow-sm hover:border-amber-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 text-left">
                        <span className="text-base select-none">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🏅"}
                        </span>
                        <div>
                          <span className="block font-black text-xs text-amber-950 font-sans truncate max-w-[120px]">
                            {item.name}
                          </span>
                          <span className="block text-[9px] text-amber-900/60 font-sans font-extrabold leading-none mt-1">
                            {item.mode} • {item.level} ({item.operation})
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-mono font-black text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full">
                          {item.score} Skor
                        </span>
                        <span className="text-[8px] font-bold text-amber-800/40 mt-1 font-sans">
                          {item.date}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Direct Quick Rule instructions preview footer */}
            <div className="mt-6 border-t-2 border-dashed border-amber-200 pt-5 text-center">
              <div className="text-xs font-bold text-amber-900 flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Aturan: Tarik tali sampai 7 kali, atau pimpin skor saat waktu habis! ⭐</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. OPERATION SELECTION */}
        {screen === "operation" && (
          <div className="max-w-lg mx-auto w-full bg-gradient-to-br from-amber-50 via-white to-amber-100 rounded-[36.2px] p-8 border-4 border-amber-300 shadow-2xl relative overflow-hidden">
            {/* Cute decorations */}
            <div className="absolute left-2 top-2 text-xl animate-bounce">🎈</div>
            <div className="absolute right-4 top-16 text-xl">💡</div>

            <h3 className="text-3xl font-black text-center text-amber-950 mb-2">Pilih Jenis Tantangan! ⚡</h3>
            <p className="text-sm font-bold text-amber-700 text-center mb-8">Pilih operasi matematika yang ingin kamu taklukkan! 😉</p>
 
            <div className="grid grid-cols-2 gap-5 mb-6">
              <button
                onClick={() => { setSelectedOp(GameOperation.ADD); setScreen("level"); }}
                className="p-5 rounded-3xl border-3 border-blue-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center cursor-pointer group shadow-sm active:scale-95"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner">
                  <Plus className="w-8 h-8 stroke-[4]" />
                </div>
                <span className="font-extrabold text-amber-950 text-lg">Penjumlahan</span>
                <span className="text-[11px] font-bold text-blue-500 mt-1 bg-blue-50 px-2 py-0.5 rounded-full">contoh: 5 + 7</span>
              </button>
 
              <button
                onClick={() => { setSelectedOp(GameOperation.SUB); setScreen("level"); }}
                className="p-5 rounded-3xl border-3 border-orange-200 bg-white hover:border-orange-500 hover:bg-orange-50/50 transition-all flex flex-col items-center cursor-pointer group shadow-sm active:scale-95"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-850 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner">
                  <Minus className="w-8 h-8 stroke-[4]" />
                </div>
                <span className="font-extrabold text-amber-950 text-lg">Pengurangan</span>
                <span className="text-[11px] font-bold text-orange-600 mt-1 bg-orange-50 px-2 py-0.5 rounded-full">contoh: 15 − 8</span>
              </button>
 
              <button
                onClick={() => { setSelectedOp(GameOperation.MUL); setScreen("level"); }}
                className="p-5 rounded-3xl border-3 border-rose-200 bg-white hover:border-rose-500 hover:bg-rose-50/50 transition-all flex flex-col items-center cursor-pointer group shadow-sm active:scale-95"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner">
                  <X className="w-8 h-8 stroke-[4]" />
                </div>
                <span className="font-extrabold text-amber-950 text-lg">Perkalian</span>
                <span className="text-[11px] font-bold text-rose-500 mt-1 bg-rose-50 px-2 py-0.5 rounded-full">contoh: 4 × 9</span>
              </button>
 
              <button
                onClick={() => { setSelectedOp(GameOperation.DIV); setScreen("level"); }}
                className="p-5 rounded-3xl border-3 border-emerald-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex flex-col items-center cursor-pointer group shadow-sm active:scale-95"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner">
                  <Percent className="w-8 h-8 stroke-[4]" />
                </div>
                <span className="font-extrabold text-amber-950 text-lg">Pembagian</span>
                <span className="text-[11px] font-bold text-emerald-600 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full">contoh: 24 ÷ 6</span>
              </button>
            </div>
 
            <button
              onClick={() => setScreen("mode")}
              className="w-full py-4 text-sm font-black text-amber-900 bg-amber-100/80 hover:bg-amber-200 active:scale-95 transition-all rounded-2xl select-none cursor-pointer border-2 border-amber-300 shadow-sm"
            >
              ⬅️ Kembali ke Pilihan Mode
            </button>
          </div>
        )}

        {/* 4. LEVEL SELECT */}
        {screen === "level" && (
          <div className="max-w-md mx-auto w-full bg-gradient-to-br from-amber-50 via-white to-amber-100 rounded-[36.2px] p-8 border-4 border-amber-300 shadow-2xl relative overflow-hidden">
            <div className="absolute right-3 top-3 text-3xl animate-pulse">⭐</div>
            
            <h3 className="text-3xl font-black text-center text-amber-950 mb-2">Pilih Tingkat Kesulitan! ⭐</h3>
            <p className="text-sm font-bold text-amber-700 text-center mb-8">Sesuaikan tingkat soal matematikamu biar mainnya makin seru! 🚀</p>

            <div className="flex flex-col gap-4 mb-6">
              {/* Beginner */}
              <button
                onClick={() => { setSelectedLevel(GameLevel.BEGINNER); handleStartOfflineGame(); }}
                className="w-full p-4 rounded-3xl border-3 border-green-200 hover:border-green-500 bg-white text-left flex items-center justify-between cursor-pointer group shadow-sm active:scale-95 transition-all"
              >
                <div>
                  <span className="block font-sans font-black text-lg text-amber-950 group-hover:text-green-800">👶 Pemula</span>
                  <span className="block text-xs font-bold text-gray-500 mt-1">Soal angka 1 digit yang santai. Cocok buat latihan awal!</span>
                </div>
                <span className="px-3 py-1.5 rounded-2xl bg-green-100 text-green-700 font-sans text-xs font-black">MUDAH ⭐</span>
              </button>

              {/* Medium */}
              <button
                onClick={() => { setSelectedLevel(GameLevel.MEDIUM); handleStartOfflineGame(); }}
                className="w-full p-4 rounded-3xl border-3 border-orange-200 hover:border-orange-500 bg-white text-left flex items-center justify-between cursor-pointer group shadow-sm active:scale-95 transition-all"
              >
                <div>
                  <span className="block font-sans font-black text-lg text-amber-950 group-hover:text-orange-850">🧑 Jagoan</span>
                  <span className="block text-xs font-bold text-gray-500 mt-1">Kombinasi angka 1 & 2 digit. Kecepatan standard!</span>
                </div>
                <span className="px-3 py-1.5 rounded-2xl bg-orange-100 text-orange-700 font-sans text-xs font-black">SEDANG ⭐⭐</span>
              </button>

              {/* Hard */}
              <button
                onClick={() => { setSelectedLevel(GameLevel.HARD); handleStartOfflineGame(); }}
                className="w-full p-4 rounded-3xl border-3 border-red-200 hover:border-red-500 bg-white text-left flex items-center justify-between cursor-pointer group shadow-sm active:scale-95 transition-all"
              >
                <div>
                  <span className="block font-sans font-black text-lg text-amber-950 group-hover:text-red-850">🧠 Pintar</span>
                  <span className="block text-xs font-bold text-gray-500 mt-1">Angka 2 digit yang cepat & menantang. Kamu pasti bisa!</span>
                </div>
                <span className="px-3 py-1.5 rounded-2xl bg-red-100 text-red-700 font-sans text-xs font-black">SULIT ⭐⭐⭐</span>
              </button>
            </div>

            <button
              onClick={() => setScreen("operation")}
              className="w-full py-4 text-sm font-black text-amber-900 bg-amber-100/80 hover:bg-amber-200 active:scale-95 transition-all rounded-2xl cursor-pointer border-2 border-amber-300 shadow-sm"
            >
              ⬅�        {/* 5. PLAYER MODE SELECT */}
        {screen === "mode" && (
          <div className="max-w-md mx-auto w-full bg-gradient-to-br from-amber-50 via-white to-amber-100 rounded-[36.2px] p-8 border-4 border-amber-300 shadow-2xl relative overflow-hidden">
            <div className="absolute left-3 top-3 text-2xl animate-pulse">🎈</div>
            
            <h3 className="text-3xl font-black text-center text-amber-950 mb-2">Pilih Mode Bermain! 🎮</h3>
            <p className="text-sm font-bold text-amber-700 text-center mb-8">Pilih cara kamu ingin bertanding sore ini! ⭐️</p>

            <div className="flex flex-col gap-4 mb-6">
              {/* Single Player (Vs CPU) */}
              <button
                onClick={() => {
                  setSelectedMode(GameMode.SINGLE_PLAYER);
                  setScreen("operation");
                }}
                className="w-full p-4 rounded-3xl border-3 border-blue-200 hover:border-blue-500 bg-white text-left flex items-center gap-4 cursor-pointer shadow-sm active:scale-95 transition-all group"
              >
                <div className="p-3 bg-blue-100 text-blue-750 rounded-2xl group-hover:scale-110 transition-transform shadow-inner">
                  <Tv className="w-6 h-6 text-blue-700" />
                </div>
                <div className="flex-1">
                  <span className="block font-sans font-black text-lg text-amber-950 group-hover:text-blue-800">1 Pemain (Lawan Kompetitor CPU) 🤖</span>
                  <span className="block text-xs font-bold text-gray-500 mt-1">Main seru melawan komputer robot pintar pilihanmu!</span>
                </div>
              </button>

              {/* Online Match (REST/SSE Lobby system) */}
              <button
                onClick={() => {
                  setSelectedMode(GameMode.TWO_PLAYER_ONLINE);
                  fetchWaitingRooms();
                  setScreen("rooms_lobby");
                }}
                className="w-full p-4 rounded-3xl border-3 border-emerald-200 hover:border-emerald-500 bg-white text-left flex items-center gap-4 cursor-pointer shadow-sm active:scale-95 transition-all group"
              >
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl group-hover:scale-110 transition-transform shadow-inner">
                  <Globe className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <span className="block font-sans font-black text-lg text-amber-950 group-hover:text-emerald-850">2 Pemain Online (Arena Bersama) 🌐</span>
                  <span className="block text-xs font-bold text-gray-500 mt-1 pb-1">Tantang dan main langsung bersama temanmu lewat internet!</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setScreen("home")}
              className="w-full py-4 text-sm font-black text-amber-900 bg-amber-100/80 hover:bg-amber-200 active:scale-95 transition-all rounded-2xl cursor-pointer border-2 border-amber-300 shadow-sm"
            >
              ⬅️ Kembali ke Menu Nama
            </button>
          </div>
        )}            Back to Name Entry
            </button>
          </div>
        )}

        {/* 6. ROOMS LOBBY (JOIN LIST with Host Parameter Setup) */}
        {screen === "rooms_lobby" && (
          <div className="max-w-4xl mx-auto w-full bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-[36px] p-6 md:p-8 border-4 border-amber-300 shadow-2xl relative overflow-hidden">
            {/* Playful background flags */}
            <div className="absolute top-2 right-4 text-3xl opacity-40 animate-bounce">✨</div>
            <div className="absolute left-4 top-20 text-2xl opacity-30">🎈</div>

            <h3 className="text-3xl font-black text-center text-amber-950 mb-2 flex items-center justify-center gap-2">
              <span>🌐 Lobi Arena Online</span>
            </h3>
            <p className="text-sm font-bold text-amber-700 text-center mb-8 leading-relaxed">
              Buat arena tandingmu sendiri atau bergabunglah ke tantangan seru teman-temanmu! 🤖🎮
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 z-10 relative">
              
              {/* Column 1: HOST ARENA (SET EVERYTHING) */}
              <div className="flex flex-col bg-amber-100/40 rounded-3xl p-6 border-3 border-amber-200/80 justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-8 h-8 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-sm font-black shadow-md">1</span>
                    <h4 className="font-black text-amber-950 text-lg">Buat Arena Baru 🚩</h4>
                  </div>
                  
                  {/* Room Name Input */}
                  <div className="mb-4">
                    <label className="block text-xs font-black text-amber-900 uppercase tracking-wider mb-1.5">
                      ✍️ Tulis Nama Arenamu:
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value.substring(0, 20))}
                      placeholder="Contoh: Arena Cerdas Ria..."
                      className="w-full px-4 py-3 rounded-2xl border-2 border-amber-300 bg-white font-sans text-sm font-black text-amber-950 placeholder-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-400"
                    />
                  </div>

                  {/* Math Operator Selector in Host Mode */}
                  <div className="mb-4">
                    <label className="block text-xs font-black text-amber-900 uppercase tracking-wider mb-2">
                      ⚡ Jenis Soal Matematika:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { op: GameOperation.ADD, sym: "+", label: "Tambah" },
                        { op: GameOperation.SUB, sym: "−", label: "Kurang" },
                        { op: GameOperation.MUL, sym: "×", label: "Kali" },
                        { op: GameOperation.DIV, sym: "÷", label: "Bagi" },
                      ].map((item) => (
                        <button
                          key={item.op}
                          type="button"
                          onClick={() => {
                            soundManager.playCorrect();
                            setSelectedOp(item.op);
                          }}
                          className={`py-2 px-1.5 rounded-2xl text-center border-3 transition-all flex flex-col items-center justify-center cursor-pointer ${
                            selectedOp === item.op
                              ? "border-orange-500 bg-orange-100/50 text-orange-950 font-black shadow-md scale-105"
                              : "border-amber-200 bg-white hover:bg-amber-50/50 text-amber-700/60"
                          }`}
                        >
                          <span className="text-xl font-black leading-tight block">{item.sym}</span>
                          <span className="text-[10px] font-sans font-black uppercase block">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Match Difficulty Level Selector */}
                  <div className="mb-6">
                    <label className="block text-xs font-black text-amber-900 uppercase tracking-wider mb-2">
                      ⭐ Tingkat Kesulitan Arena:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { lvl: GameLevel.BEGINNER, name: "👶 Pemula" },
                        { lvl: GameLevel.MEDIUM, name: "🧑 Jagoan" },
                        { lvl: GameLevel.HARD, name: "🧠 Pintar" },
                      ].map((item) => (
                        <button
                          key={item.lvl}
                          type="button"
                          onClick={() => {
                            soundManager.playCorrect();
                            setSelectedLevel(item.lvl);
                          }}
                          className={`py-2.5 rounded-2xl font-black text-xs text-center border-3 transition-all cursor-pointer ${
                            selectedLevel === item.lvl
                              ? "border-green-500 bg-green-50 text-green-950 font-black shadow-md scale-105"
                              : "border-amber-200 bg-white hover:bg-amber-50/50 text-amber-800/60"
                          }`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={createOnlineRoom}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm py-4 px-6 rounded-2xl border-b-6 border-orange-700 hover:from-orange-600 hover:to-amber-600 active:translate-y-1 active:border-b-2 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Radio className="w-5 h-5 animate-pulse text-amber-100" />
                  <span>SIARKAN ARENA & MULAI! 🚀</span>
                </button>
              </div>

              {/* Column 2: AVAILABLE ARENAS (GUEST CAN JOIN) */}
              <div className="flex flex-col bg-blue-100/30 rounded-3xl p-6 border-3 border-blue-200/50 justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-8 h-8 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-sm font-black shadow-md">2</span>
                    <h4 className="font-black text-amber-950 text-lg">Gabung Arena Seru 🤝</h4>
                  </div>

                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-sans font-black text-amber-800 uppercase tracking-wider font-bold">
                      Arena yang Aktif ({activeRooms.length})
                    </span>
                    <button
                      onClick={() => {
                        soundManager.playCorrect();
                        fetchWaitingRooms();
                      }}
                      className="text-xs font-black text-orange-600 flex items-center gap-1.5 hover:underline cursor-pointer bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full shadow-sm"
                    >
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin-slow" />
                      <span>Segarkan 🔄</span>
                    </button>
                  </div>

                  <div className="border-3 border-dashed border-amber-200 rounded-2xl min-h-[220px] max-h-[260px] overflow-y-auto bg-white/70 p-3 flex flex-col gap-2 shadow-inner">
                    {activeRooms.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                        <span className="text-4xl mb-2 animate-bounce">🍃</span>
                        <span className="text-xs text-amber-800 font-bold leading-relaxed">
                          Belum ada arena bermain aktif saat ini.<br />
                          Ayo buat arenamu sendiri di sebelah kiri!
                        </span>
                      </div>
                    ) : (
                      activeRooms.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between bg-white border-2 border-amber-100 rounded-2xl p-3 shadow-sm hover:border-amber-400 transition-colors"
                        >
                          <div className="pr-3">
                            <span className="block font-black text-sm text-amber-950 font-sans">{r.name}</span>
                            <span className="block text-[10px] text-gray-500 font-sans mt-0.5">
                              Pemain: <b className="text-[#3a2c0f] font-sans font-bold">{r.hostName}</b>
                            </span>
                            <div className="flex gap-1.5 mt-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[8px] font-mono font-black uppercase font-bold">
                                {r.config?.operation === GameOperation.ADD ? "TAMBAH" : r.config?.operation === GameOperation.SUB ? "KURANG" : r.config?.operation === GameOperation.MUL ? "KALI" : "BAGI"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[8px] font-mono font-black uppercase font-bold">
                                {r.config?.level === GameLevel.BEGINNER ? "PEMULA" : r.config?.level === GameLevel.MEDIUM ? "JAGOAN" : "PINTAR"}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              soundManager.playCorrect();
                              joinOnlineRoom(r.id);
                            }}
                            className="bg-blue-600 font-black text-white text-xs px-4 py-2.5 rounded-xl border-b-4 border-blue-800 hover:bg-blue-700 active:translate-y-0.5 transition cursor-pointer shadow-sm"
                          >
                            Masuk Arena 🏁
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundManager.playCorrect();
                    setScreen("mode");
                  }}
                  className="w-full mt-6 py-4 text-sm font-black text-amber-900 bg-amber-100 hover:bg-amber-200 active:scale-95 transition-all rounded-2xl cursor-pointer text-center border-2 border-amber-300 shadow-sm"
                >
                  ⬅️ Kembali ke Pilihan Mode
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 7. WAITING LOBBY */}
        {screen === "waiting_lobby" && currentRoom && (
          <div className="max-w-md mx-auto w-full bg-gradient-to-br from-amber-50 via-white to-amber-100 rounded-[36.2px] p-8 border-4 border-amber-300 shadow-2xl flex flex-col items-center relative overflow-hidden">
            <div className="absolute right-3 top-3 text-3xl animate-bounce">🎈</div>
            
            <div className="w-20 h-20 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center text-4xl mb-4 animate-spin-slow shadow-inner">
              📡
            </div>

            <h3 className="text-2xl font-black text-amber-950 text-center">
              {isHost ? "Menunggu Penantang..." : "Menghubungkan ke Arena..."}
            </h3>
            <p className="text-xs font-bold text-amber-700 text-center mt-2 bg-amber-100/60 px-3 py-1 rounded-full border border-amber-200">
              Aturan: {currentRoom.config?.operation === GameOperation.ADD ? "Penjumlahan" : currentRoom.config?.operation === GameOperation.SUB ? "Pengurangan" : currentRoom.config?.operation === GameOperation.MUL ? "Perkalian" : "Pembagian"} ({currentRoom.config?.level === GameLevel.BEGINNER ? "Pemula" : currentRoom.config?.level === GameLevel.MEDIUM ? "Jagoan" : "Pintar"})
            </p>

            <div className="w-full bg-white/80 rounded-3xl p-5 border-2 border-amber-200 my-6 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b-2 border-dashed border-amber-100">
                <span className="text-xs font-black text-amber-900 uppercase">Pembuat Arena 👑</span>
                <span className="font-extrabold text-blue-600 font-sans text-sm">{currentRoom.hostName}</span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span className="text-xs font-black text-amber-900 uppercase">Musuh Penantang ⚔️</span>
                <span className={`${currentRoom.guestName ? "font-extrabold text-red-650" : "font-bold text-gray-400 animate-pulse"} text-sm`}>
                  {currentRoom.guestName || "Melacak penantang... 👀"}
                </span>
              </div>
            </div>

            {isHost && (
              <button
                disabled={!currentRoom.guestId}
                onClick={() => {
                  soundManager.playCorrect();
                  sendRoomAction(currentRoom.id, { type: "START_GAME" });
                }}
                className={`w-full py-4 text-base font-black rounded-2xl shadow-lg border-b-6 transition-all flex items-center justify-center gap-2 ${
                  currentRoom.guestId
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-700 hover:from-green-600 hover:to-emerald-600 active:translate-y-1 active:border-b-2 cursor-pointer"
                    : "bg-gray-100 text-gray-400 border-gray-200 border-b-2 cursor-not-allowed"
                }`}
              >
                <span>MULAI PERTANDINGAN! 🏁</span>
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            )}

            {!isHost && (
              <div className="text-sm font-black text-orange-600 text-center bg-orange-50 border-2 border-orange-200 px-4 py-3 rounded-2xl animate-pulse shadow-sm flex items-center gap-2">
                <span>🍦 Tunggu sebentar ya, pembuat arena sedang mempersiapkan tanding matematika!</span>
              </div>
            )}
          </div>
        )}

        {/* 8. ACTIVE GAME VIEW */}
        {screen === "game" && (
          <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
            
            {/* Upper Stats bar */}
            <div className="flex flex-wrap items-center justify-between bg-white border border-amber-100 rounded-3xl p-5 gap-4">
              {/* Player 1 summary info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg select-none">
                  👤
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-mono">Pemain 1</span>
                  <span className="block font-black text-blue-900 text-sm">
                    {selectedMode === GameMode.SINGLE_PLAYER ? playerName : "Pemain 1"}
                  </span>
                </div>
              </div>

              {/* Central Clock Counter */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-black">SISA WAKTU</span>
                <motion.span 
                  key={timer}
                  animate={timer <= 10 ? {
                    scale: [1, 1.25, 1],
                    color: ["#ef4444", "#dc2626", "#ef4444"],
                    textShadow: [
                      "0 0 4px rgba(239, 68, 68, 0.1)",
                      "0 0 16px rgba(220, 38, 38, 0.7)",
                      "0 0 4px rgba(239, 68, 68, 0.1)"
                    ]
                  } : {
                    scale: 1,
                    color: "#451a03"
                  }}
                  transition={{
                    duration: timer <= 10 ? 0.5 : 0.2,
                    ease: "easeInOut"
                  }}
                  className="text-4xl font-mono font-black tracking-tighter inline-block"
                >
                  00:{timer < 10 ? `0${timer}` : timer}
                </motion.span>
              </div>

              {/* Player 2 summary info */}
              <div className="flex items-center gap-3 md:flex-row-reverse md:text-right">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold text-lg select-none">
                  {selectedMode === GameMode.SINGLE_PLAYER ? "🤖" : "👥"}
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-mono">Pemain 2</span>
                  <span className="block font-black text-red-900 text-sm">
                    {selectedMode === GameMode.SINGLE_PLAYER ? "Komputer (CPU)" : (selectedMode === GameMode.TWO_PLAYER_ONLINE && currentRoom) ? (currentRoom.guestName || "Penantang") : "Pemain 2"}
                  </span>
                </div>
              </div>
            </div>

            {/* Braided Rope container */}
            <RopeView ropePosition={ropePosition} shake={ropeShake} />

            {/* Dynamic layout split depending on PlayerMode */}
            
            {/* CASE A: Single-Player VS CPU */}
            {selectedMode === GameMode.SINGLE_PLAYER && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Active Player Deck (Left) */}
                <div className={`bg-white rounded-3xl p-6 border-2 transition-all duration-300 relative flex flex-col justify-between ${
                  p1Flash === "correct" ? "border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)] bg-green-50/20" :
                  p1Flash === "wrong" ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)] bg-red-50/20 animate-shake" : "border-transparent shadow-md"
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-blue-105 bg-blue-100 text-blue-800 text-xs font-black rounded-lg uppercase">PAPAN BERMAINMU 🚩</span>
                    <span className="text-xs font-bold font-sans text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Tarikanmu:{" "}
                      <motion.span
                        key={score1}
                        className="inline-block font-mono font-black text-orange-600"
                        initial={{ scale: 0.6, y: -4, opacity: 0.5 }}
                        animate={{ scale: [1.5, 1], y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                      >
                        {score1}
                      </motion.span>
                    </span>
                  </div>

                  {currentQuestionP1 ? (
                    <div className="text-center py-6">
                      <span className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">HITUNG SOAL BERIKUT:</span>
                      <div className="text-4xl font-extrabold font-mono tracking-tight select-none">
                        {currentQuestionP1.operandA} {getOperatorSymbol(currentQuestionP1.operator)} {currentQuestionP1.operandB} = ?
                      </div>
                      
                      {/* Active Typed Input buffer */}
                      <div className="mt-6 flex justify-center mb-5">
                        <div className="w-60 min-h-[58px] bg-amber-50 rounded-2xl border-2 border-amber-200 outline-none flex items-center justify-center font-mono text-2xl font-black text-amber-950 px-4">
                          {p1Input || <span className="text-amber-200 select-none">___</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400">Awaiting next puzzle...</div>
                  )}

                  <NumpadView 
                    onDigit={(d) => setP1Input((p) => (p + d).substring(0, 5))}
                    onBackspace={() => setP1Input((p) => p.substring(0, p.length - 1))}
                    onConfirm={handleAnswerSubmitP1}
                    enableDecimal={selectedLevel === GameLevel.HARD}
                    theme="blue"
                    className="mx-auto"
                  />
                </div>

                {/* Passive CPU Deck (Right) */}
                <div className={`bg-white rounded-3xl p-6 border border-amber-100 shadow-md flex flex-col items-center justify-center text-center relative ${
                  p2Flash === "correct" ? "border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)] bg-green-50/20" :
                  p2Flash === "wrong" ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)] bg-red-50/20" : ""
                }`}>
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg uppercase mb-4">Lawanmu (Komputer CPU)</span>
                  <div className="w-20 h-20 bg-amber-50 rounded-full border border-amber-200 flex items-center justify-center text-5xl mb-3 animate-pulse">
                    🤖
                  </div>
                  <h4 className="font-extrabold text-amber-950 text-lg">Robot Pintar</h4>
                  <p className="text-xs text-amber-800 bg-amber-50/50 px-4 py-3 border border-amber-200 rounded-2xl mt-1 max-w-xs leading-relaxed">
                    Kecepatan berpikir Robot disesuaikan dengan tingkat kesulitan: <b className="text-orange-600">{selectedLevel === GameLevel.BEGINNER ? "Pemula" : selectedLevel === GameLevel.MEDIUM ? "Jagoan" : "Pintar"}</b>. Jawab secepat mungkin sebelum Robot menarik talinya!
                  </p>
                  
                  <div className="mt-6 flex flex-col gap-1 items-center bg-amber-50/40 border border-amber-100/50 p-4 rounded-2xl w-full max-w-xs">
                    <span className="text-gray-400 font-sans text-[10px] font-black uppercase tracking-wider">Tarikan Robot 🤖</span>
                    <motion.span
                      key={score2}
                      className="inline-block text-2xl font-mono font-black text-red-900"
                      initial={{ scale: 0.6, y: -4, opacity: 0.5 }}
                      animate={{ scale: [1.5, 1], y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                      {score2}
                    </motion.span>
                  </div>
                </div>
              </div>
            )}

            {/* CASE B: Local Split-Screen on Same Device */}
            {selectedMode === GameMode.TWO_PLAYER_LOCAL && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Active Player 1 (Left Deck) */}
                <div className={`bg-white rounded-3xl p-6 border-2 transition-all duration-300 relative flex flex-col justify-between ${
                  p1Flash === "correct" ? "border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)] bg-green-50/20" :
                  p1Flash === "wrong" ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)] bg-red-50/20 animate-shake" : "border-transparent shadow-md"
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-black rounded-lg uppercase">PEMAIN 1 🚩</span>
                    <span className="text-xs font-bold font-sans text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Tarikan:{" "}
                      <motion.span
                        key={score1}
                        className="inline-block font-mono font-black text-blue-600"
                        initial={{ scale: 0.6, y: -4, opacity: 0.5 }}
                        animate={{ scale: [1.5, 1], y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                      >
                        {score1}
                      </motion.span>
                    </span>
                  </div>

                  {currentQuestionP1 ? (
                    <div className="text-center py-4">
                      <div className="text-3xl font-extrabold font-mono tracking-tight select-none">
                        {currentQuestionP1.operandA} {getOperatorSymbol(currentQuestionP1.operator)} {currentQuestionP1.operandB} = ?
                      </div>
                      
                      <div className="mt-4 flex justify-center mb-4">
                        <div className="w-full bg-amber-50 rounded-2xl border-2 border-amber-200 h-14 flex items-center justify-center font-mono text-xl font-black text-amber-950">
                          {p1Input || <span className="text-amber-200 select-none">___</span>}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <NumpadView 
                    onDigit={(d) => setP1Input((p) => (p + d).substring(0, 5))}
                    onBackspace={() => setP1Input((p) => p.substring(0, p.length - 1))}
                    onConfirm={handleAnswerSubmitP1}
                    enableDecimal={selectedLevel === GameLevel.HARD}
                    theme="blue"
                    className="mx-auto"
                  />
                </div>

                {/* Active Player 2 (Right Deck) */}
                <div className={`bg-white rounded-3xl p-6 border-2 transition-all duration-300 relative flex flex-col justify-between ${
                  p2Flash === "correct" ? "border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)] bg-green-50/20" :
                  p2Flash === "wrong" ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)] bg-red-50/20 animate-shake" : "border-transparent shadow-md"
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-black rounded-lg uppercase">PEMAIN 2 ⚔️</span>
                    <span className="text-xs font-bold font-sans text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Tarikan:{" "}
                      <motion.span
                        key={score2}
                        className="inline-block font-mono font-black text-red-600"
                        initial={{ scale: 0.6, y: -4, opacity: 0.5 }}
                        animate={{ scale: [1.5, 1], y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                      >
                        {score2}
                      </motion.span>
                    </span>
                  </div>

                  {currentQuestionP2 ? (
                    <div className="text-center py-4">
                      <div className="text-3xl font-extrabold font-mono tracking-tight select-none">
                        {currentQuestionP2.operandA} {getOperatorSymbol(currentQuestionP2.operator)} {currentQuestionP2.operandB} = ?
                      </div>
                      
                      <div className="mt-4 flex justify-center mb-4">
                        <div className="w-full bg-amber-50 rounded-2xl border-2 border-amber-200 h-14 flex items-center justify-center font-mono text-xl font-black text-amber-950 font-black">
                          {p2Input || <span className="text-amber-200 select-none">___</span>}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <NumpadView 
                    onDigit={(d) => setP2Input((p) => (p + d).substring(0, 5))}
                    onBackspace={() => setP2Input((p) => p.substring(0, p.length - 1))}
                    onConfirm={handleAnswerSubmitP2}
                    enableDecimal={selectedLevel === GameLevel.HARD}
                    theme="red"
                    className="mx-auto"
                  />
                </div>
              </div>
            )}

            {/* CASE C: Online Realtime Synchronized */}
            {selectedMode === GameMode.TWO_PLAYER_ONLINE && currentRoom && (
              <div className="bg-white rounded-3xl p-8 border-2 shadow-md transition-all relative max-w-xl mx-auto w-full">
                
                <div className="flex justify-between items-center mb-5">
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-lg uppercase">
                    {isHost ? "PEMBUAT ARENA 👑" : "PENANTANG ⚔️"}
                  </span>
                  <div className="text-xs font-bold text-amber-950 font-sans flex items-center gap-1.5">
                    Skor Tarikanku:{" "}
                    <motion.span
                      key={isHost ? score1 : score2}
                      className="inline-block font-mono font-extrabold text-blue-600 text-sm"
                      initial={{ scale: 0.6, y: -4, opacity: 0.5 }}
                      animate={{ scale: [1.5, 1], y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                      {isHost ? score1 : score2}
                    </motion.span>{" "}
                    • Musuh:{" "}
                    <motion.span
                      key={isHost ? score2 : score1}
                      className="inline-block font-mono font-extrabold text-red-500 text-sm"
                      initial={{ scale: 0.6, y: -4, opacity: 0.5 }}
                      animate={{ scale: [1.5, 1], y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                      {isHost ? score2 : score1}
                    </motion.span>
                  </div>
                </div>

                {/* Question Area (Host or Guest has identical math question) */}
                {isHost && currentQuestionP1 && (
                  <div className="text-center py-6">
                    <span className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">SOAL MATEMATIKA ONLINE:</span>
                    <div className="text-4xl font-extrabold font-mono tracking-tight select-none">
                      {currentQuestionP1.operandA} {getOperatorSymbol(currentQuestionP1.operator)} {currentQuestionP1.operandB} = ?
                    </div>
                    
                    <div className="mt-6 flex justify-center mb-5">
                      <div className="w-60 h-14 bg-amber-50 rounded-2xl border-2 border-amber-200 flex items-center justify-center font-mono text-xl font-black text-amber-950">
                        {p1Input || <span className="text-amber-200 select-none">___</span>}
                      </div>
                    </div>
                  </div>
                )}

                {!isHost && currentQuestionP2 && (
                  <div className="text-center py-6">
                    <span className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest">SOAL MATEMATIKA ONLINE:</span>
                    <div className="text-4xl font-extrabold font-mono tracking-tight select-none">
                      {currentQuestionP2.operandA} {getOperatorSymbol(currentQuestionP2.operator)} {currentQuestionP2.operandB} = ?
                    </div>
                    
                    <div className="mt-6 flex justify-center mb-5">
                      <div className="w-60 h-14 bg-amber-50 rounded-2xl border-2 border-amber-200 flex items-center justify-center font-mono text-xl font-black text-amber-950">
                        {p2Input || <span className="text-amber-200 select-none">___</span>}
                      </div>
                    </div>
                  </div>
                )}

                <NumpadView 
                  onDigit={(d) => {
                    if (isHost) setP1Input((p) => (p + d).substring(0, 5));
                    else setP2Input((p) => (p + d).substring(0, 5));
                  }}
                  onBackspace={() => {
                    if (isHost) setP1Input((p) => p.substring(0, p.length - 1));
                    else setP2Input((p) => p.substring(0, p.length - 1));
                  }}
                  onConfirm={handleOnlineSubmit}
                  enableDecimal={selectedLevel === GameLevel.HARD}
                  theme={isHost ? "blue" : "red"}
                  className="mx-auto"
                />
              </div>
            )}
          </div>
        )}

        {/* 9. WINNER / RESULTS OVERLAY SCREEN */}
        {screen === "result" && (
          <div className="relative z-10 max-w-md mx-auto w-full bg-gradient-to-br from-amber-50 via-white to-amber-100 rounded-[36.2px] p-8 border-4 border-amber-300 shadow-2xl flex flex-col items-center">
            
            {/* Embedded confetti canvas purely drawing to self space */}
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none rounded-3xl z-0" />
 
            <div className="relative z-10 flex flex-col items-center w-full">
              <div className="w-20 h-20 bg-gradient-to-tr from-yellow-100 to-amber-50 rounded-full flex items-center justify-center border-2 border-yellow-300 shadow-md text-5xl mb-4 select-none animate-bounce">
                🏆
              </div>
 
              <h3 className="text-3xl font-black text-amber-950 font-sans tracking-tight text-center">
                Pertandingan Selesai! 🎉
              </h3>
              <p className="text-xs text-amber-700 font-medium font-sans mt-1">
                Juara tanding hari ini telah terpilih!
              </p>
 
              {/* Resolution details badge */}
              <div className="w-full bg-white/80 rounded-3xl p-5 border-2 border-amber-200 my-6 text-center shadow-inner">
                <span className="block text-xl font-black font-sans text-amber-900 leading-relaxed">
                  {getWinnerInfo().text}
                </span>
 
                <div className="flex items-center justify-around mt-4 pt-4 border-t-2 border-dashed border-amber-100">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-sans font-black uppercase tracking-wider">Tarikan Pemain 1</span>
                    <span className="block text-2xl font-mono font-extrabold text-blue-700">{score1}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-sans font-black uppercase tracking-wider">Tarikan Pemain 2</span>
                    <span className="block text-2xl font-mono font-extrabold text-red-650">{score2}</span>
                  </div>
                </div>
              </div>
 
              {/* Controller choices */}
              <div className="flex flex-col gap-3 w-full">
                {selectedMode !== GameMode.TWO_PLAYER_ONLINE ? (
                  <button
                    onClick={() => {
                      soundManager.playCorrect();
                      handleStartOfflineGame();
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-4 px-5 rounded-2xl border-b-6 border-orange-700 hover:from-orange-600 hover:to-amber-600 active:translate-y-1 active:border-b-2 shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCcw className="w-5 h-5" />
                    <span>Main Lagi! 🔁</span>
                  </button>
                ) : currentRoom && isHost ? (
                  <button
                    onClick={() => {
                      soundManager.playCorrect();
                      sendRoomAction(currentRoom.id, { type: "REPLAY" });
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-4 px-5 rounded-2xl border-b-6 border-orange-700 hover:from-orange-600 hover:to-amber-600 active:translate-y-1 active:border-b-2 shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCcw className="w-5 h-5" />
                    <span>Mulai Ulang Pertandingan! 🔁</span>
                  </button>
                ) : (
                  <div className="text-sm font-black text-amber-900 text-center bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl animate-pulse mb-2">
                    Menunggu pembuat arena memulai ulang permainan... 🍿
                  </div>
                )}
 
                <button
                  onClick={() => {
                    soundManager.playCorrect();
                    cleanupAllGameTimers();
                    setScreen("home");
                  }}
                  className="w-full bg-amber-100 hover:bg-amber-200 text-amber-950 font-black py-4 px-5 rounded-2xl transition border-2 border-amber-300 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-5 h-5 text-amber-950" />
                  <span>Kembali ke Menu Utama 🏠</span>
                </button>
              </div>
            </div>
          </div>
        )}
 
      </main>
 
      {/* Humble literal page footer */}
      <footer className="mt-auto py-4 text-center text-xs font-sans font-semibold text-amber-900/40 select-none">
        Game Tarik Tambang Matematika ✨
      </footer>
    </div>
  );
}
