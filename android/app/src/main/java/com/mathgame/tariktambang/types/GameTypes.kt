package com.mathgame.tariktambang.types

enum class GameOperation {
    ADD, SUB, MUL, DIV
}

enum class GameLevel {
    BEGINNER, MEDIUM, HARD
}

enum class GameMode {
    SINGLE_PLAYER,      // VS CPU
    TWO_PLAYER_LOCAL,   // Same device split-screen
    TWO_PLAYER_ONLINE   // Online PvP
}

enum class GameResult {
    PLAYER1_WIN,
    PLAYER2_WIN,
    DRAW,
    ONGOING
}

data class Player(
    val id: String,
    val name: String,
    val score: Int
)

data class MathQuestion(
    val operandA: Int,
    val operandB: Int,
    val operator: GameOperation,
    val correctAnswer: String
)

data class LeaderboardEntry(
    val id: String,
    val name: String,
    val score: Int,
    val mode: String,
    val level: String,
    val operation: String,
    val date: String
)
