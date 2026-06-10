import { GameOperation, GameLevel, MathQuestion } from "../types";

export function generateQuestion(
  operation: GameOperation,
  level: GameLevel
): MathQuestion {
  let operandA = 0;
  let operandB = 0;
  let correctAnswer = "";

  const randomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  switch (operation) {
    case GameOperation.ADD:
      if (level === GameLevel.BEGINNER) {
        // 1-digit + 1-digit
        operandA = randomInt(1, 9);
        operandB = randomInt(1, 9);
      } else if (level === GameLevel.MEDIUM) {
        // 1-digit + 2-digit
        if (Math.random() < 0.5) {
          operandA = randomInt(1, 9);
          operandB = randomInt(10, 99);
        } else {
          operandA = randomInt(10, 99);
          operandB = randomInt(1, 9);
        }
      } else {
        // 2-digit + 2-digit (HARD)
        operandA = randomInt(10, 99);
        operandB = randomInt(10, 99);
      }
      correctAnswer = (operandA + operandB).toString();
      break;

    case GameOperation.SUB:
      if (level === GameLevel.BEGINNER) {
        // 1-digit - 1-digit (result >= 0)
        operandA = randomInt(1, 9);
        operandB = randomInt(0, operandA);
      } else if (level === GameLevel.MEDIUM) {
        // 2-digit - 1-digit (result >= 0)
        operandA = randomInt(10, 99);
        operandB = randomInt(1, 9);
      } else {
        // 2-digit - 2-digit (result >= 0) (HARD)
        operandA = randomInt(10, 99);
        operandB = randomInt(10, operandA);
      }
      correctAnswer = (operandA - operandB).toString();
      break;

    case GameOperation.MUL:
      if (level === GameLevel.BEGINNER) {
        // 1-digit * 1-digit
        operandA = randomInt(1, 9);
        operandB = randomInt(1, 9);
      } else if (level === GameLevel.MEDIUM) {
        // 1-digit * 2-digit
        if (Math.random() < 0.5) {
          operandA = randomInt(1, 9);
          operandB = randomInt(10, 25); // cap 2-digit to make it playable
        } else {
          operandA = randomInt(10, 25);
          operandB = randomInt(1, 9);
        }
      } else {
        // 2-digit * 2-digit (HARD)
        operandA = randomInt(10, 50); // cap to keep it fun and highly mental math soluble
        operandB = randomInt(10, 30);
      }
      correctAnswer = (operandA * operandB).toString();
      break;

    case GameOperation.DIV:
      if (level === GameLevel.BEGINNER) {
        // Whole result, dividend 1-20, divisor 1-5
        // Generate reverse: compute standard random result and divisor first to avoid residues
        const result = randomInt(1, 4); // so max dividend is 20
        operandB = randomInt(1, 5);
        operandA = result * operandB;
        if (operandA > 20) {
          operandA = randomInt(1, 5) * operandB;
        }
        correctAnswer = Math.floor(operandA / operandB).toString();
      } else if (level === GameLevel.MEDIUM) {
        // Whole result, dividend 10-99, divisor 1-9
        const result = randomInt(2, 20);
        operandB = randomInt(1, 9);
        operandA = result * operandB;
        while (operandA < 10 || operandA > 99) {
          const r = randomInt(2, 25);
          const d = randomInt(2, 9);
          operandA = r * d;
          operandB = d;
        }
        correctAnswer = Math.floor(operandA / operandB).toString();
      } else {
        // Whole or 1 decimal, dividend 10-99, divisor 2-10 (HARD)
        // Let's generate random numbers directly, then compute to 1 decimal
        operandA = randomInt(10, 99);
        operandB = randomInt(2, 10);
        const rawResult = operandA / operandB;
        // round to 1 decimal place: e.g. 5.14 -> 5.1, 5.25 -> 5.3
        const val = Math.round(rawResult * 10) / 10;
        correctAnswer = val.toString();
      }
      break;
  }

  return {
    operandA,
    operandB,
    operator: operation,
    correctAnswer
  };
}

export function getOperatorSymbol(op: GameOperation): string {
  switch (op) {
    case GameOperation.ADD:
      return "+";
    case GameOperation.SUB:
      return "−";
    case GameOperation.MUL:
      return "×";
    case GameOperation.DIV:
      return "÷";
  }
}
