export enum GameOperation {
  ADD = "ADD",
  SUB = "SUB",
  MUL = "MUL",
  DIV = "DIV"
}

export enum GameLevel {
  BEGINNER = "BEGINNER",
  MEDIUM = "MEDIUM",
  HARD = "HARD"
}

export enum GameMode {
  SINGLE_PLAYER = "SINGLE_PLAYER", // VS CPU
  TWO_PLAYER_LOCAL = "TWO_PLAYER_LOCAL", // Same device split-screen
  TWO_PLAYER_ONLINE = "TWO_PLAYER_ONLINE" // Nearby-like multi client
}

export enum GameResult {
  PLAYER1_WIN = "PLAYER1_WIN",
  PLAYER2_WIN = "PLAYER2_WIN",
  DRAW = "DRAW",
  ONGOING = "ONGOING"
}

export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface MathQuestion {
  operandA: number;
  operandB: number;
  operator: GameOperation;
  correctAnswer: string;
}

export interface GamePayload {
  type: string;
  [key: string]: any;
}

export interface RoomState {
  id: string;
  name: string;
  hostName: string;
  hostId: string;
  guestName?: string;
  guestId?: string;
  status: "waiting" | "playing" | "finished";
  config?: {
    operation: GameOperation;
    level: GameLevel;
  };
  ropePosition: number; // -7 to 7 (0 center)
  score1: number;
  score2: number;
  timer: number;
  currentQuestion?: MathQuestion;
  nextQuestionIndex: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  mode: string;
  level: string;
  operation: string;
  date: string;
}

