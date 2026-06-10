package com.mathgame.tariktambang

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mathgame.tariktambang.components.NumpadView
import com.mathgame.tariktambang.components.RopeView
import com.mathgame.tariktambang.types.*
import com.mathgame.tariktambang.utils.MathUtils
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFFF9FAFB)
                ) {
                    MathTugOfWarApp()
                }
            }
        }
    }
}

@Composable
fun MathTugOfWarApp() {
    var screen by remember { mutableStateOf("MENUPAGE") } // MENUPAGE, GAMEPAGE
    var selectedMode by remember { mutableStateOf(GameMode.SINGLE_PLAYER) }
    var selectedLevel by remember { mutableStateOf(GameLevel.BEGINNER) }
    var selectedOp by remember { mutableStateOf(GameOperation.ADD) }
    
    // Core Game States
    var score1 by remember { mutableStateOf(0) }
    var score2 by remember { mutableStateOf(0) }
    var ropePosition by remember { mutableStateOf(0f) } // -7 to 7
    var timer by remember { mutableStateOf(60) }
    
    var questionP1 by remember { mutableStateOf<MathQuestion?>(null) }
    var questionP2 by remember { mutableStateOf<MathQuestion?>(null) }
    
    var currentInputP1 by remember { mutableStateOf("") }
    var currentInputP2 by remember { mutableStateOf("") }

    var p1FlashState by remember { mutableStateOf("") } // "correct", "wrong", ""
    var p2FlashState by remember { mutableStateOf("") } // "correct", "wrong", ""

    val scope = rememberCoroutineScope()

    // Game Controller Loop
    LaunchedEffect(screen, timer) {
        if (screen == "GAMEPAGE" && timer > 0) {
            delay(1000L)
            timer -= 1
            
            // Single Player - Simulation of Bot answering math questions
            if (selectedMode == GameMode.SINGLE_PLAYER) {
                // Random bot pull interval depending on level
                if (timer % (when (selectedLevel) {
                    GameLevel.BEGINNER -> 7
                    GameLevel.MEDIUM -> 5
                    GameLevel.HARD -> 3
                }) == 0) {
                    score2 += 1
                    ropePosition += 0.8f
                    
                    // Generate new question for Player 1 whenever bot answers
                    if (abs(ropePosition) < 7f) {
                        p2FlashState = "correct"
                        delay(500)
                        p2FlashState = ""
                    }
                }
            }
        }
    }

    // Checking Game Ending Conditions
    val isGameOver = timer <= 0 || abs(ropePosition) >= 7f
    val winnerResult = when {
        ropePosition <= -7f -> GameResult.PLAYER1_WIN
        ropePosition >= 7f -> GameResult.PLAYER2_WIN
        timer <= 0 && score1 > score2 -> GameResult.PLAYER1_WIN
        timer <= 0 && score2 > score1 -> GameResult.PLAYER2_WIN
        timer <= 0 && score1 == score2 -> GameResult.DRAW
        else -> GameResult.ONGOING
    }

    fun startNewGame() {
        score1 = 0
        score2 = 0
        ropePosition = 0f
        timer = 60
        currentInputP1 = ""
        currentInputP2 = ""
        questionP1 = MathUtils.generateQuestion(selectedOp, selectedLevel)
        questionP2 = MathUtils.generateQuestion(selectedOp, selectedLevel)
        screen = "GAMEPAGE"
    }

    if (screen == "MENUPAGE") {
        MenuScreen(
            selectedMode = selectedMode,
            selectedLevel = selectedLevel,
            selectedOp = selectedOp,
            onModeSelect = { selectedMode = it },
            onLevelSelect = { selectedLevel = it },
            onOpSelect = { selectedOp = it },
            onStartGame = { startNewGame() }
        )
    } else {
        GameScreen(
            selectedMode = selectedMode,
            score1 = score1,
            score2 = score2,
            ropePosition = ropePosition,
            timer = timer,
            questionP1 = questionP1,
            questionP2 = questionP2,
            currentInputP1 = currentInputP1,
            currentInputP2 = currentInputP2,
            p1Flash = p1FlashState,
            p2Flash = p2FlashState,
            isGameOver = isGameOver,
            winnerResult = winnerResult,
            onInputP1 = { currentInputP1 = it },
            onInputP2 = { currentInputP2 = it },
            onResetGame = { startNewGame() },
            onExit = { screen = "MENUPAGE" },
            onSubmitP1 = {
                val isCorrect = currentInputP1 == questionP1?.correctAnswer
                scope.launch {
                    if (isCorrect) {
                        p1FlashState = "correct"
                        score1 += 1
                        ropePosition -= 1f // Pull left towards P1
                        questionP1 = MathUtils.generateQuestion(selectedOp, selectedLevel)
                        currentInputP1 = ""
                    } else {
                        p1FlashState = "wrong"
                        delay(800)
                    }
                    delay(300)
                    p1FlashState = ""
                }
            },
            onSubmitP2 = {
                val isCorrect = currentInputP2 == questionP2?.correctAnswer
                scope.launch {
                    if (isCorrect) {
                        p2FlashState = "correct"
                        score2 += 1
                        ropePosition += 1f // Pull right towards P2/CPU
                        questionP2 = MathUtils.generateQuestion(selectedOp, selectedLevel)
                        currentInputP2 = ""
                    } else {
                        p2FlashState = "wrong"
                        delay(800)
                    }
                    delay(300)
                    p2FlashState = ""
                }
            }
        )
    }
}

@Composable
fun MenuScreen(
    selectedMode: GameMode,
    selectedLevel: GameLevel,
    selectedOp: GameOperation,
    onModeSelect: (GameMode) -> Unit,
    onLevelSelect: (GameLevel) -> Unit,
    onOpSelect: (GameOperation) -> Unit,
    onStartGame: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
            .background(Color(0xFFFAFAF9)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        // Brand Title Card
        Box(
            modifier = Modifier
                .shadow(12.dp, shape = RoundedCornerShape(24.dp))
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xFF1E3A8A), Color(0xFF1E40AF))
                    ),
                    shape = RoundedCornerShape(24.dp)
                )
                .fillMaxWidth()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "🏆 MATH TUG OF WAR 🏆",
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "Tarik Tambang Matematika Pintar",
                    color = Color(0xFF93C5FD),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 4.dp),
                    textAlign = TextAlign.Center
                )
            }
        }

        // Selection 1: Game Mode
        Text(
            text = "PILIH MODE BROWSE 🎮",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF374151),
            modifier = Modifier.align(Alignment.Start)
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                GameMode.SINGLE_PLAYER to "vs KOMPUTER 🤖",
                GameMode.TWO_PLAYER_LOCAL to "2 PEMAIN ⚔️"
            ).forEach { (mode, title) ->
                val isSelected = selectedMode == mode
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .shadow(if (isSelected) 4.dp else 1.dp, shape = RoundedCornerShape(16.dp))
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (isSelected) Color(0xFF1E3A8A) else Color.White)
                        .border(
                            width = 2.dp,
                            color = if (isSelected) Color(0xFF3B82F6) else Color(0xFFE5E7EB),
                            shape = RoundedCornerShape(16.dp)
                        )
                        .clickable { onModeSelect(mode) }
                        .padding(vertical = 14.dp, horizontal = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = title,
                        color = if (isSelected) Color.White else Color(0xFF4B5563),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }

        // Selection 2: Game Level
        Text(
            text = "TINGKAT KESULITAN 📈",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF374151),
            modifier = Modifier.align(Alignment.Start)
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                GameLevel.BEGINNER to "Pemula",
                GameLevel.MEDIUM to "Sedang",
                GameLevel.HARD to "Mahir"
            ).forEach { (level, title) ->
                val isSelected = selectedLevel == level
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .shadow(if (isSelected) 4.dp else 1.dp, shape = RoundedCornerShape(16.dp))
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (isSelected) Color(0xFF059669) else Color.White)
                        .border(
                            width = 2.dp,
                            color = if (isSelected) Color(0xFF34D399) else Color(0xFFE5E7EB),
                            shape = RoundedCornerShape(16.dp)
                        )
                        .clickable { onLevelSelect(level) }
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = title,
                        color = if (isSelected) Color.White else Color(0xFF4B5563),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Selection 3: Operation
        Text(
            text = "OPERASI MATEMATIKA ➕",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF374151),
            modifier = Modifier.align(Alignment.Start)
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                GameOperation.ADD to "+",
                GameOperation.SUB to "−",
                GameOperation.MUL to "×",
                GameOperation.DIV to "÷"
            ).forEach { (op, char) ->
                val isSelected = selectedOp == op
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .aspectRatio(1f)
                        .shadow(if (isSelected) 6.dp else 1.dp, shape = RoundedCornerShape(16.dp))
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (isSelected) Color(0xFFD97706) else Color.White)
                        .border(
                            width = 2.dp,
                            color = if (isSelected) Color(0xFFF59E0B) else Color(0xFFE5E7EB),
                            shape = RoundedCornerShape(16.dp)
                        )
                        .clickable { onOpSelect(op) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = char,
                        color = if (isSelected) Color.White else Color(0xFF1F2937),
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // START GAME BUTTON
        Button(
            onClick = onStartGame,
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .shadow(8.dp, shape = RoundedCornerShape(20.dp)),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
            shape = RoundedCornerShape(20.dp)
        ) {
            Text(
                text = "MULAI TARIKANNYA! 🚀",
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
        }
    }
}

@Composable
fun GameScreen(
    selectedMode: GameMode,
    score1: Int,
    score2: Int,
    ropePosition: Float,
    timer: Int,
    questionP1: MathQuestion?,
    questionP2: MathQuestion?,
    currentInputP1: String,
    currentInputP2: String,
    p1Flash: String,
    p2Flash: String,
    isGameOver: Boolean,
    winnerResult: GameResult,
    onInputP1: (String) -> Unit,
    onInputP2: (String) -> Unit,
    onResetGame: () -> Unit,
    onExit: () -> Unit,
    onSubmitP1: () -> Unit,
    onSubmitP2: () -> Unit
) {
    // Dynamic Spring-motion scale triggers for Score 1 and Score 2
    val animatedScore1Scale by animateFloatAsState(
        targetValue = if (p1Flash == "correct") 1.8f else 1f,
        animationSpec = spring(stiffness = 300f, dampingRatio = 0.5f),
        label = "Score1Spring"
    )

    val animatedScore2Scale by animateFloatAsState(
        targetValue = if (p2Flash == "correct") 1.8f else 1f,
        animationSpec = spring(stiffness = 300f, dampingRatio = 0.5f),
        label = "Score2Spring"
    )

    // Dynamic Urgency Timer Animation (for less than 10 seconds left)
    val clockPulseScale by animateFloatAsState(
        targetValue = if (timer <= 10) 1.25f else 1f,
        animationSpec = spring(
            stiffness = Spring.StiffnessHigh,
            dampingRatio = Spring.DampingRatioMediumBouncy
        ),
        label = "ClockPulse"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFFFBEB))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        
        // Header HUD Info
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = onExit,
                colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE5E7EB)),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text("Keluar 🚪", color = Color(0xFF4B5563), fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            // Animated Pulse Urgency Timer Clock
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.scale(clockPulseScale)
            ) {
                Text(
                    text = "SISA WAKTU",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Gray
                )
                Text(
                    text = "00:${if (timer < 10) "0$timer" else timer}",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = if (timer <= 10) Color(0xFFEF4444) else Color(0xFF451A03)
                )
            }

            Box(
                modifier = Modifier
                    .background(Color(0xFFFEF3C7), shape = RoundedCornerShape(8.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text("PvP", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFFD97706))
            }
        }

        // Animated Rope visual viewport
        RopeView(ropePosition = ropePosition)

        // Game play grids
        if (selectedMode == GameMode.SINGLE_PLAYER) {
            // SINGLE PLAYER PANEL LAYOUT
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Left player column (Interactive human player P1)
                Column(
                    modifier = Modifier
                        .weight(3f)
                        .fillMaxHeight()
                        .shadow(4.dp, shape = RoundedCornerShape(20.dp))
                        .background(Color.White)
                        .border(
                            width = 2.dp,
                            color = if (p1Flash == "correct") Color(0xFF10B981) else if (p1Flash == "wrong") Color(0xFFEF4444) else Color.Transparent,
                            shape = RoundedCornerShape(20.dp)
                        )
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("TARIKANMU 🚩", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFF2563EB))
                        
                        // Score counter with Spring animated popping sizes
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Skor: ", fontSize = 11.sp, color = Color.Gray)
                            Text(
                                text = "$score1",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFEA580C),
                                modifier = Modifier.scale(animatedScore1Scale)
                            )
                        }
                    }

                    // Question Display Card
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .background(Color(0xFFEFF6FF), shape = RoundedCornerShape(14.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (questionP1 != null) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "${questionP1.operandA} ${MathUtils.getOperatorSymbol(questionP1.operator)} ${questionP1.operandB} = ",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF1E3A8A)
                                )
                                Text(
                                    text = currentInputP1.ifEmpty { "?" },
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (currentInputP1.isEmpty()) Color.LightGray else Color(0xFF2563EB)
                                )
                            }
                        }
                    }

                    // Embedded Numpad input grid
                    NumpadView(
                        onKeyPress = { onInputP1(currentInputP1 + it) },
                        onDelete = { if (currentInputP1.isNotEmpty()) onInputP1(currentInputP1.dropLast(1)) },
                        onSubmit = onSubmitP1,
                        primaryColor = Color(0xFF2563EB),
                        modifier = Modifier.weight(1f)
                    )
                }

                // Right bot column (Simple CPU status and passive scores)
                Column(
                    modifier = Modifier
                        .weight(1.5f)
                        .fillMaxHeight()
                        .shadow(2.dp, shape = RoundedCornerShape(16.dp))
                        .background(Color(0xFFFEF2F2))
                        .border(
                            width = 2.dp,
                            color = if (p2Flash == "correct") Color(0xFF34D399) else Color.Transparent,
                            shape = RoundedCornerShape(16.dp)
                        )
                        .padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "ROBOT 🤖",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF991B1B)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Bot Score with dynamic springing transitions
                    Text(
                        text = "$score2",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF991B1B),
                        modifier = Modifier.scale(animatedScore2Scale)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Tarikan Bot",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Gray
                    )
                }
            }
        } else {
            // SPLIT SCREEN LOCAL TWO-PLAYER VIEW
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // PLAYER 1 GRID (LEFT)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .shadow(4.dp, shape = RoundedCornerShape(20.dp))
                        .background(Color.White)
                        .border(
                            width = 2.dp,
                            color = if (p1Flash == "correct") Color(0xFF10B981) else if (p1Flash == "wrong") Color(0xFFEF4444) else Color.Transparent,
                            shape = RoundedCornerShape(20.dp)
                        )
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("PEMAIN 1 🚩", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFF2563EB))
                        Text(
                            text = "$score1",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFEA580C),
                            modifier = Modifier.scale(animatedScore1Scale)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                            .background(Color(0xFFEFF6FF), shape = RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (questionP1 != null) {
                            Text(
                                text = "${questionP1.operandA} ${MathUtils.getOperatorSymbol(questionP1.operator)} ${questionP1.operandB} = ${currentInputP1.ifEmpty { "?" }}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF1E3A8A)
                            )
                        }
                    }

                    NumpadView(
                        onKeyPress = { onInputP1(currentInputP1 + it) },
                        onDelete = { if (currentInputP1.isNotEmpty()) onInputP1(currentInputP1.dropLast(1)) },
                        onSubmit = onSubmitP1,
                        primaryColor = Color(0xFF2563EB),
                        modifier = Modifier.weight(1f)
                    )
                }

                // PLAYER 2 GRID (RIGHT)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .shadow(4.dp, shape = RoundedCornerShape(20.dp))
                        .background(Color.White)
                        .border(
                            width = 2.dp,
                            color = if (p2Flash == "correct") Color(0xFF10B981) else if (p2Flash == "wrong") Color(0xFFEF4444) else Color.Transparent,
                            shape = RoundedCornerShape(20.dp)
                        )
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("PEMAIN 2 ⚔️", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFFDC2626))
                        Text(
                            text = "$score2",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFEA580C),
                            modifier = Modifier.scale(animatedScore2Scale)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                            .background(Color(0xFFFEF2F2), shape = RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (questionP2 != null) {
                            Text(
                                text = "${questionP2.operandA} ${MathUtils.getOperatorSymbol(questionP2.operator)} ${questionP2.operandB} = ${currentInputP2.ifEmpty { "?" }}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF991B1B)
                            )
                        }
                    }

                    NumpadView(
                        onKeyPress = { onInputP2(currentInputP2 + it) },
                        onDelete = { if (currentInputP2.isNotEmpty()) onInputP2(currentInputP2.dropLast(1)) },
                        onSubmit = onSubmitP2,
                        primaryColor = Color(0xFFDC2626),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // GAME OVER DIALOG PORTAL OVERLAY
        if (isGameOver) {
            AlertDialog(
                onDismissRequest = {},
                confirmButton = {
                    Button(
                        onClick = onResetGame,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
                    ) {
                        Text("Main Lagi 🔄", color = Color.White, fontWeight = FontWeight.Black)
                    }
                },
                dismissButton = {
                    TextButton(onClick = onExit) {
                        Text("Menu Utama", color = Color.Gray, fontWeight = FontWeight.Bold)
                    }
                },
                title = {
                    Text(
                        text = "PERMAINAN SELESAI! 🏁",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val displayText = when (winnerResult) {
                            GameResult.PLAYER1_WIN -> {
                                if (selectedMode == GameMode.SINGLE_PLAYER) "Selamat! Kamu Berhasil Menang Lawan Komputer! 🎉"
                                else "Hore! Pemain 1 Berhasil Menang! 🎉"
                            }
                            GameResult.PLAYER2_WIN -> {
                                if (selectedMode == GameMode.SINGLE_PLAYER) "Aduh! Komputer Berhasil Menang Tarikan! 🤖"
                                else "Hore! Pemain 2 Berhasil Menang! 🎉"
                            }
                            else -> "Permainan Seri! Tarikan kamu seimbang! 🤝"
                        }
                        Text(
                            text = displayText,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center,
                            color = Color(0xFF374151)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF3F4F6), shape = RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Pemain 1", fontSize = 11.sp, color = Color.Gray)
                                Text("$score1", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF2563EB))
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Pemain 2", fontSize = 11.sp, color = Color.Gray)
                                Text("$score2", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFFDC2626))
                            }
                        }
                    }
                },
                shape = RoundedCornerShape(20.dp),
                containerColor = Color.White
            )
        }
    }
}
