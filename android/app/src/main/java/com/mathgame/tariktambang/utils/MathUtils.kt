package com.mathgame.tariktambang.utils

import com.mathgame.tariktambang.types.GameLevel
import com.mathgame.tariktambang.types.GameOperation
import com.mathgame.tariktambang.types.MathQuestion
import kotlin.math.roundToInt
import kotlin.random.Random

object MathUtils {

    fun generateQuestion(operation: GameOperation, level: GameLevel): MathQuestion {
        var operandA = 0
        var operandB = 0
        var correctAnswer = ""

        fun randomInt(min: Int, max: Int): Int {
            return Random.nextInt(min, max + 1)
        }

        when (operation) {
            GameOperation.ADD -> {
                when (level) {
                    GameLevel.BEGINNER -> {
                        // 1-digit + 1-digit
                        operandA = randomInt(1, 9)
                        operandB = randomInt(1, 9)
                    }
                    GameLevel.MEDIUM -> {
                        // 1-digit + 2-digit or vice versa
                        if (Random.nextFloat() < 0.5f) {
                            operandA = randomInt(1, 9)
                            operandB = randomInt(10, 99)
                        } else {
                            operandA = randomInt(10, 99)
                            operandB = randomInt(1, 9)
                        }
                    }
                    GameLevel.HARD -> {
                        // 2-digit + 2-digit
                        operandA = randomInt(10, 99)
                        operandB = randomInt(10, 99)
                    }
                }
                correctAnswer = (operandA + operandB).toString()
            }

            GameOperation.SUB -> {
                when (level) {
                    GameLevel.BEGINNER -> {
                        // 1-digit - 1-digit (result >= 0)
                        operandA = randomInt(1, 9)
                        operandB = randomInt(0, operandA)
                    }
                    GameLevel.MEDIUM -> {
                        // 2-digit - 1-digit (result >= 0)
                        operandA = randomInt(10, 99)
                        operandB = randomInt(1, 9)
                    }
                    GameLevel.HARD -> {
                        // 2-digit - 2-digit (result >= 0)
                        operandA = randomInt(10, 99)
                        operandB = randomInt(10, operandA)
                    }
                }
                correctAnswer = (operandA - operandB).toString()
            }

            GameOperation.MUL -> {
                when (level) {
                    GameLevel.BEGINNER -> {
                        // 1-digit * 1-digit
                        operandA = randomInt(1, 9)
                        operandB = randomInt(1, 9)
                    }
                    GameLevel.MEDIUM -> {
                        // 1-digit * 2-digit
                        if (Random.nextFloat() < 0.5f) {
                            operandA = randomInt(1, 9)
                            operandB = randomInt(10, 25)
                        } else {
                            operandA = randomInt(10, 25)
                            operandB = randomInt(1, 9)
                        }
                    }
                    GameLevel.HARD -> {
                        // 2-digit * 2-digit (capped to keep mental math playable)
                        operandA = randomInt(10, 50)
                        operandB = randomInt(10, 30)
                    }
                }
                correctAnswer = (operandA * operandB).toString()
            }

            GameOperation.DIV -> {
                when (level) {
                    GameLevel.BEGINNER -> {
                        // Whole result, dividend 1-20, divisor 1-5
                        val result = randomInt(1, 4)
                        operandB = randomInt(1, 5)
                        operandA = result * operandB
                        if (operandA > 20) {
                            operandA = randomInt(1, 5) * operandB
                        }
                        correctAnswer = (operandA / operandB).toString()
                    }
                    GameLevel.MEDIUM -> {
                        // Whole result, dividend 10-99, divisor 2-9
                        var result = randomInt(2, 20)
                        var d = randomInt(1, 9)
                        var calculated = result * d
                        while (calculated < 10 || calculated > 99) {
                            result = randomInt(2, 25)
                            d = randomInt(2, 9)
                            calculated = result * d
                        }
                        operandA = calculated
                        operandB = d
                        correctAnswer = (operandA / operandB).toString()
                    }
                    GameLevel.HARD -> {
                        // Whole or 1 decimal, dividend 10-99, divisor 2-10 (HARD)
                        operandA = randomInt(10, 99)
                        operandB = randomInt(2, 10)
                        val rawResult = operandA.toFloat() / operandB.toFloat()
                        val rounded = (rawResult * 10f).roundToInt() / 10f
                        correctAnswer = if (rounded % 1 == 0f) {
                            rounded.toInt().toString()
                        } else {
                            rounded.toString()
                        }
                    }
                }
            }
        }

        return MathQuestion(operandA, operandB, operation, correctAnswer)
    }

    fun getOperatorSymbol(op: GameOperation): String {
        return when (op) {
            GameOperation.ADD -> "+"
            GameOperation.SUB -> "−"
            GameOperation.MUL -> "×"
            GameOperation.DIV -> "÷"
        }
    }
}
