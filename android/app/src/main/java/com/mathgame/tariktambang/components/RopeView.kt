package com.mathgame.tariktambang.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs

@Composable
fun RopeView(
    ropePosition: Float, // -7 to 7
    modifier: Modifier = Modifier
) {
    val isSnapped = abs(ropePosition) >= 7f
    
    // Position -7 -> 10%, 0 -> 50%, +7 -> 90%
    val percentageOffset = 50f + (ropePosition / 7f) * 40f
    
    // Smooth animate of rope position
    val animatedPercentage by animateFloatAsState(
        targetValue = percentageOffset,
        animationSpec = spring(stiffness = Spring.StiffnessLow, dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "RopePosition"
    )

    // Snapped animations
    val breakOffsetLeft by animateFloatAsState(
        targetValue = if (isSnapped) -120f else 0f,
        animationSpec = spring(stiffness = 200f, dampingRatio = 0.5f),
        label = "BreakLeft"
    )

    val breakOffsetRight by animateFloatAsState(
        targetValue = if (isSnapped) 120f else 0f,
        animationSpec = spring(stiffness = 200f, dampingRatio = 0.5f),
        label = "BreakRight"
    )

    val scaleUpBurst by animateFloatAsState(
        targetValue = if (isSnapped) 1.2f else 0f,
        animationSpec = spring(stiffness = Spring.StiffnessMedium, dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "BurstScale"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(160.dp)
            .shadow(12.dp, shape = RoundedCornerShape(24.dp))
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Color(0xFFFFF9E6), Color(0xFFFFF2CC))
                ),
                shape = RoundedCornerShape(24.dp)
            )
            .border(4.dp, Color(0xFFFFD966), shape = RoundedCornerShape(24.dp))
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        // Clouds & decorative elements
        Box(modifier = Modifier.fillMaxSize()) {
            Text(
                text = "☁️",
                fontSize = 24.sp,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .offset(x = 12.dp, y = 8.dp)
            )
            Text(
                text = "☁️",
                fontSize = 20.sp,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = (-12).dp, y = (-8).dp)
            )
            Text(
                text = "🚩",
                fontSize = 18.sp,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .offset(y = 2.dp)
            )
        }

        // The Rope Drawing Engine
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .align(Alignment.Center)
        ) {
            val width = size.width
            val height = size.height
            val centerY = height / 2f
            
            // Positions
            val ropeX = width * (animatedPercentage / 100f)
            
            // Left boundary indicator (Blue team base)
            drawRoundRect(
                color = Color(0xFF1D4ED8),
                topLeft = Offset(16.dp.toPx(), centerY - 12.dp.toPx()),
                size = Size(16.dp.toPx(), 24.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx())
            )
            
            // Right boundary indicator (Red team base)
            drawRoundRect(
                color = Color(0xFFB91C1C),
                topLeft = Offset(width - 32.dp.toPx(), centerY - 12.dp.toPx()),
                size = Size(16.dp.toPx(), 24.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx())
            )

            if (!isSnapped) {
                // Left rope (blue component)
                drawLine(
                    color = Color(0xFF3B82F6),
                    start = Offset(24.dp.toPx(), centerY),
                    end = Offset(ropeX, centerY),
                    strokeWidth = 12.dp.toPx(),
                    cap = StrokeCap.Round
                )

                // Right rope (red component)
                drawLine(
                    color = Color(0xFFEF4444),
                    start = Offset(ropeX, centerY),
                    end = Offset(width - 24.dp.toPx(), centerY),
                    strokeWidth = 12.dp.toPx(),
                    cap = StrokeCap.Round
                )
                
                // Rope braid pattern highlights (golden highlights)
                drawLine(
                    color = Color(0xFFFBBF24),
                    start = Offset(24.dp.toPx(), centerY),
                    end = Offset(width - 24.dp.toPx(), centerY),
                    strokeWidth = 2.dp.toPx(),
                    cap = StrokeCap.Round
                )
                
                // Center Knot Marker (Yellow flag center)
                drawCircle(
                    color = Color(0xFFFBBF24),
                    radius = 16.dp.toPx(),
                    center = Offset(ropeX, centerY)
                )
                drawCircle(
                    color = Color(0xFFFFFBEB),
                    radius = 8.dp.toPx(),
                    center = Offset(ropeX, centerY)
                )

            } else {
                // Snapped view!
                // Left dynamic broken rope piece
                drawLine(
                    color = Color(0xFF3B82F6),
                    start = Offset(24.dp.toPx(), centerY),
                    end = Offset(ropeX + breakOffsetLeft.dp.toPx(), centerY + abs(breakOffsetLeft).dp.toPx() * 0.15f),
                    strokeWidth = 12.dp.toPx(),
                    cap = StrokeCap.Round
                )

                // Right dynamic broken rope piece
                drawLine(
                    color = Color(0xFFEF4444),
                    start = Offset(ropeX + breakOffsetRight.dp.toPx(), centerY + abs(breakOffsetRight).dp.toPx() * 0.15f),
                    end = Offset(width - 24.dp.toPx(), centerY),
                    strokeWidth = 12.dp.toPx(),
                    cap = StrokeCap.Round
                )
            }
        }

        // Snapped Comics Dialog Boom Burst overlays
        if (isSnapped && scaleUpBurst > 0f) {
            Box(
                modifier = Modifier
                    .shadow(16.dp, shape = RoundedCornerShape(16.dp))
                    .background(
                        brush = Brush.horizontalGradient(
                            colors = listOf(Color(0xFFEF4444), Color(0xFFF97316))
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
                    .border(2.dp, Color.White, shape = RoundedCornerShape(16.dp))
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "💥 TALI PUTUS! 💥",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}
