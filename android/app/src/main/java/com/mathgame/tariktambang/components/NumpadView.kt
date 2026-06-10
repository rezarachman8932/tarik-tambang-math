package com.mathgame.tariktambang.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun NumpadView(
    onKeyPress: (String) -> Unit,
    onDelete: () -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
    primaryColor: Color = Color(0xFF3B82F6),
    accentColor: Color = Color(0xFFEFF6FF)
) {
    val buttons = listOf(
        listOf("1", "2", "3"),
        listOf("4", "5", "6"),
        listOf("7", "8", "9"),
        listOf(".", "0", "⌫")
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Transparent),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        buttons.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                row.forEach { char ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .shadow(2.dp, shape = RoundedCornerShape(12.dp))
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                when (char) {
                                    "⌫" -> Color(0xFFFEE2E2)
                                    else -> Color.White
                                }
                            )
                            .border(
                                width = 1.dp,
                                color = when (char) {
                                    "⌫" -> Color(0xFFFCA5A5)
                                    else -> Color(0xFFE5E7EB)
                                },
                                shape = RoundedCornerShape(12.dp)
                            )
                            .clickable {
                                if (char == "⌫") {
                                    onDelete()
                                } else {
                                    onKeyPress(char)
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = char,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = when (char) {
                                "⌫" -> Color(0xFFEF4444)
                                else -> Color(0xFF1F2937)
                            }
                        )
                    }
                }
            }
        }

        // Wide Submit Button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .shadow(4.dp, shape = RoundedCornerShape(16.dp))
                .clip(RoundedCornerShape(16.dp))
                .background(primaryColor)
                .clickable { onSubmit() },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "KIRIM JAWABAN 🚀",
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
        }
    }
}
