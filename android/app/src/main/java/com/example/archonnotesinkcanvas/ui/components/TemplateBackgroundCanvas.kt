package com.example.archonnotesinkcanvas.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.unit.dp

@Composable
fun TemplateBackgroundCanvas(
    templateType: String,
    pageColor: String,
    modifier: Modifier = Modifier
) {
    val parsedBgColor = remember(pageColor) {
        try {
            Color(android.graphics.Color.parseColor(pageColor))
        } catch (e: Exception) {
            Color.White
        }
    }

    val patternColor = remember(parsedBgColor) {
        val luminance = (0.299f * parsedBgColor.red + 0.587f * parsedBgColor.green + 0.114f * parsedBgColor.blue)
        if (luminance < 0.5f) Color(0x3300E599) else Color(0x22000000)
    }

    Canvas(modifier = modifier.fillMaxSize()) {
        // Draw base background color
        drawRect(color = parsedBgColor)

        when (templateType.lowercase()) {
            "dot" -> {
                val gridSpacing = 24.dp.toPx()
                val dotRadius = 1.5.dp.toPx()
                var x = gridSpacing
                while (x < size.width) {
                    var y = gridSpacing
                    while (y < size.height) {
                        drawCircle(
                            color = patternColor,
                            radius = dotRadius,
                            center = Offset(x, y)
                        )
                        y += gridSpacing
                    }
                    x += gridSpacing
                }
            }
            "ruled", "lined" -> {
                val lineSpacing = 32.dp.toPx()
                val marginX = 48.dp.toPx()
                
                // Margin line
                drawLine(
                    color = patternColor.copy(alpha = patternColor.alpha * 1.5f.coerceAtMost(1f)),
                    start = Offset(marginX, 0f),
                    end = Offset(marginX, size.height),
                    strokeWidth = 2.dp.toPx()
                )
                
                var y = lineSpacing * 1.5f
                while (y < size.height) {
                    drawLine(
                        color = patternColor,
                        start = Offset(0f, y),
                        end = Offset(size.width, y),
                        strokeWidth = 1.dp.toPx()
                    )
                    y += lineSpacing
                }
            }
            "grid", "graph" -> {
                val gridSpacing = 24.dp.toPx()
                var x = gridSpacing
                while (x < size.width) {
                    drawLine(patternColor, Offset(x, 0f), Offset(x, size.height), strokeWidth = 1.dp.toPx())
                    x += gridSpacing
                }
                var y = gridSpacing
                while (y < size.height) {
                    drawLine(patternColor, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
                    y += gridSpacing
                }
            }
            "isometric" -> {
                val spacing = 24.dp.toPx()
                val angle60 = Math.PI / 3.0
                val dx = (spacing / Math.sin(angle60)).toFloat()
                val shift = (size.height / Math.tan(angle60)).toFloat()
                
                // Horizontal
                var y = spacing
                while (y < size.height) {
                    drawLine(patternColor, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
                    y += spacing
                }
                
                // 60-deg ( / )
                var x = -shift - size.width
                while (x < size.width * 2) {
                    drawLine(patternColor, Offset(x, size.height), Offset(x + shift, 0f), strokeWidth = 1.dp.toPx())
                    x += dx
                }
                
                // 120-deg ( \ )
                x = -shift - size.width
                while (x < size.width * 2) {
                    drawLine(patternColor, Offset(x, 0f), Offset(x + shift, size.height), strokeWidth = 1.dp.toPx())
                    x += dx
                }
            }
            "staff" -> {
                val lineSpacing = 8.dp.toPx()
                val staffSpacing = 48.dp.toPx()
                var y = staffSpacing
                while (y < size.height - lineSpacing * 4) {
                    for (i in 0..4) {
                        drawLine(
                            color = patternColor,
                            start = Offset(0f, y + i * lineSpacing),
                            end = Offset(size.width, y + i * lineSpacing),
                            strokeWidth = 1.dp.toPx()
                        )
                    }
                    y += lineSpacing * 4 + staffSpacing
                }
            }
            "cornell" -> {
                val cueColumnWidth = size.width * 0.3f
                val headerY = size.height * 0.15f
                val summaryHeaderY = size.height * 0.75f

                // Header line
                drawLine(
                    color = patternColor.copy(alpha = patternColor.alpha * 1.5f.coerceAtMost(1f)),
                    start = Offset(0f, headerY),
                    end = Offset(size.width, headerY),
                    strokeWidth = 2.dp.toPx()
                )

                // Vertical cue divider line
                drawLine(
                    color = patternColor.copy(alpha = patternColor.alpha * 1.5f.coerceAtMost(1f)),
                    start = Offset(cueColumnWidth, headerY),
                    end = Offset(cueColumnWidth, summaryHeaderY),
                    strokeWidth = 2.dp.toPx()
                )

                // Horizontal summary divider line
                drawLine(
                    color = patternColor.copy(alpha = patternColor.alpha * 1.5f.coerceAtMost(1f)),
                    start = Offset(0f, summaryHeaderY),
                    end = Offset(size.width, summaryHeaderY),
                    strokeWidth = 2.dp.toPx()
                )

                // Light horizontal ruled lines in main area
                val lineSpacing = 28.dp.toPx()
                var y = headerY + lineSpacing
                while (y < summaryHeaderY) {
                    drawLine(
                        color = patternColor,
                        start = Offset(cueColumnWidth, y),
                        end = Offset(size.width, y),
                        strokeWidth = 1.dp.toPx()
                    )
                    y += lineSpacing
                }
            }
            else -> {
                // Blank page - no additional pattern
            }
        }
    }
}
