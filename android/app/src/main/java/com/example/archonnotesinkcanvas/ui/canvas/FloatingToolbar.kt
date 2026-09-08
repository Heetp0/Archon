package com.example.archonnotesinkcanvas.ui.canvas

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

// ─── Design Tokens ─────────────────────────────────────────────────────────
// Archon Toolbar — "Ethereal Glass" dark tech aesthetic
// Ref: GoodNotes floating pill + Notability chip-selection pattern
private val ToolbarBg = Color(0xFF0D0D0D)
private val ToolbarBorder = Color(0xFF2A2A2A)
private val DividerColor = Color(0xFF1E1E1E)
private val ActiveBg = Color(0xFF1C2A1C)      // subtle filled chip for selected tool
private val AccentGreen = Color(0xFF22C55E)
private val ToolIconDefault = Color(0xFF8A8A8A)
private val ToolIconActive = Color(0xFF22C55E)
private val WhiteFull = Color(0xFFFFFFFF)

// ─── SVG Icon Paths (Lucide-equivalent, hand-matched for distinct silhouettes) ──
// Using MaterialExtended icons where close, SVG paths for the rest
// We use Path-based icons drawn as Canvas objects for the truly distinct ones
// but fall back to @Composable Icon wrappers using existing material icons

@Composable
fun FloatingToolbar(
    modifier: Modifier = Modifier,
    autoHideSignal: Boolean,
    onToolSelected: (String) -> Unit,
    onColorSelected: (Color) -> Unit,
    onStrokeWidthSelected: (Float) -> Unit,
    onUndo: () -> Unit,
    onRedo: () -> Unit
) {
    var expanded by remember { mutableStateOf(true) }
    var selectedTool by remember { mutableStateOf("pen") }
    var selectedColor by remember { mutableStateOf(Color.Black) }
    var strokeWidth by remember { mutableStateOf(5f) }
    var toolbarOffset by remember { mutableStateOf(Offset.Zero) }

    LaunchedEffect(autoHideSignal) {
        if (autoHideSignal) {
            delay(800)
            expanded = false
        }
    }

    // Full-size box so dragging can position the toolbar anywhere on canvas
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val density = LocalDensity.current
        val maxX = with(density) { maxWidth.toPx() }
        val maxY = with(density) { maxHeight.toPx() }

        Box(
            modifier = Modifier
                .offset {
                    IntOffset(
                        x = toolbarOffset.x.roundToInt().coerceIn(0, maxX.toInt()),
                        y = toolbarOffset.y.roundToInt().coerceIn(-maxY.toInt(), maxY.toInt())
                    )
                }
                .align(Alignment.BottomEnd)
        ) {
            // ── Collapsed FAB ──────────────────────────────────────────────
            if (!expanded) {
                Box(
                    Modifier
                        .size(52.dp)
                        .background(ToolbarBg, RoundedCornerShape(4.dp))
                        .border(1.dp, ToolbarBorder, RoundedCornerShape(4.dp))
                        .draggable(
                            orientation = Orientation.Vertical,
                            state = rememberDraggableState { delta ->
                                toolbarOffset = toolbarOffset.copy(y = toolbarOffset.y + delta)
                            }
                        )
                        .draggable(
                            orientation = Orientation.Horizontal,
                            state = rememberDraggableState { delta ->
                                toolbarOffset = toolbarOffset.copy(x = toolbarOffset.x + delta)
                            }
                        )
                        .clickable { expanded = true },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Edit,
                        contentDescription = "Expand Toolbar (8 tools)",
                        tint = AccentGreen,
                        modifier = Modifier.size(24.dp)
                    )
                }
            } else {
                // ── Expanded Toolbar Pill ──────────────────────────────────
                Box(
                    Modifier
                        .background(ToolbarBg, RoundedCornerShape(4.dp))
                        .border(1.dp, ToolbarBorder, RoundedCornerShape(4.dp))
                        .draggable(
                            orientation = Orientation.Vertical,
                            state = rememberDraggableState { delta ->
                                toolbarOffset = toolbarOffset.copy(y = toolbarOffset.y + delta)
                            }
                        )
                        .draggable(
                            orientation = Orientation.Horizontal,
                            state = rememberDraggableState { delta ->
                                toolbarOffset = toolbarOffset.copy(x = toolbarOffset.x + delta)
                            }
                        )
                ) {
                    AnimatedVisibility(
                        visible = expanded,
                        enter = fadeIn() + expandHorizontally(),
                        exit = fadeOut() + shrinkHorizontally()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(0.dp)
                        ) {
                            // ── GROUP 1: Drawing & Selection Tools (5 tools) ────
                            // 1. Pen tool
                            ToolButton(
                                label = "Pen",
                                icon = ToolIcon.Pen,
                                isActive = selectedTool == "pen",
                                onClick = { selectedTool = "pen"; onToolSelected("pen") }
                            )
                            // 2. Pencil tool
                            ToolButton(
                                label = "Pencil",
                                icon = ToolIcon.Pencil,
                                isActive = selectedTool == "pencil",
                                onClick = { selectedTool = "pencil"; onToolSelected("pencil") }
                            )
                            // 3. Highlighter tool
                            ToolButton(
                                label = "Highlighter",
                                icon = ToolIcon.Highlighter,
                                isActive = selectedTool == "highlighter",
                                onClick = { selectedTool = "highlighter"; onToolSelected("highlighter") }
                            )
                            // 4. Eraser tool
                            ToolButton(
                                label = "Eraser",
                                icon = ToolIcon.Eraser,
                                isActive = selectedTool == "eraser",
                                onClick = { selectedTool = "eraser"; onToolSelected("eraser") }
                            )
                            // 5. Lasso tool
                            ToolButton(
                                label = "Lasso",
                                icon = ToolIcon.Lasso,
                                isActive = selectedTool == "lasso",
                                onClick = { selectedTool = "lasso"; onToolSelected("lasso") }
                            )
                            // 6. Laser Pointer tool (Saber Inspired)
                            ToolButton(
                                label = "Laser",
                                icon = ToolIcon.Laser,
                                isActive = selectedTool == "laser",
                                onClick = { selectedTool = "laser"; onToolSelected("laser") }
                            )
                            // 7. Shape tool (Saber Inspired)
                            ToolButton(
                                label = "Shape",
                                icon = ToolIcon.Shape,
                                isActive = selectedTool == "shape",
                                onClick = { selectedTool = "shape"; onToolSelected("shape") }
                            )
                            // 8. Study Tape tool (StarNote Inspired)
                            ToolButton(
                                label = "Tape",
                                icon = ToolIcon.Tape,
                                isActive = selectedTool == "tape",
                                onClick = { selectedTool = "tape"; onToolSelected("tape") }
                            )

                            ToolbarDivider()

                            // ── GROUP 2: Color Picker Swatches ────────────────
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                                modifier = Modifier.padding(horizontal = 4.dp)
                            ) {
                                val swatchColors = listOf(
                                    Color(0xFFFFFFFF),   // Crisp White
                                    Color(0xFF00E599),   // Archon Emerald
                                    Color(0xFF4F46E5),   // Cyber Indigo
                                    Color(0xFFE11D48),   // Rose Red
                                    Color(0xFFF59E0B),   // Amber
                                    Color(0xFF0D0D0D)    // Near-black ink
                                )
                                swatchColors.forEach { color ->
                                    ColorSwatch(
                                        color = color,
                                        isActive = selectedColor == color,
                                        onClick = { selectedColor = color; onColorSelected(color) }
                                    )
                                }
                            }

                            ToolbarDivider()

                            // ── GROUP 3: Stroke Width ────────────────────────
                            StrokeWidthButton(dotSize = 4.dp, label = "S", isActive = strokeWidth == 2f) {
                                strokeWidth = 2f; onStrokeWidthSelected(2f)
                            }
                            StrokeWidthButton(dotSize = 7.dp, label = "M", isActive = strokeWidth == 5f) {
                                strokeWidth = 5f; onStrokeWidthSelected(5f)
                            }
                            StrokeWidthButton(dotSize = 11.dp, label = "L", isActive = strokeWidth == 10f) {
                                strokeWidth = 10f; onStrokeWidthSelected(10f)
                            }

                            ToolbarDivider()

                            // ── GROUP 4: Actions (Undo / Redo) ───────────────
                            // 6. Undo tool
                            ActionButton(label = "Undo", onClick = onUndo) {
                                Icon(
                                    imageVector = Icons.Outlined.Undo,
                                    contentDescription = "Undo",
                                    tint = ToolIconDefault,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            // 7. Redo tool
                            ActionButton(label = "Redo", onClick = onRedo) {
                                Icon(
                                    imageVector = Icons.Outlined.Redo,
                                    contentDescription = "Redo",
                                    tint = ToolIconDefault,
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            ToolbarDivider()

                            // ── Collapse affordance ─────────────────────────
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .clickable { expanded = false },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Close,
                                    contentDescription = "Collapse",
                                    tint = ToolIconDefault,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Distinct tool icon types for silhouette differentiation */
enum class ToolIcon { Pen, Pencil, Highlighter, Eraser, Lasso, Laser, Shape, Tape }

@Composable
private fun ToolButton(
    label: String,
    icon: ToolIcon,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(if (isActive) ActiveBg else Color.Transparent)
            .border(
                width = if (isActive) 1.dp else 0.dp,
                color = if (isActive) AccentGreen.copy(alpha = 0.5f) else Color.Transparent,
                shape = CircleShape
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        val tint = if (isActive) ToolIconActive else ToolIconDefault
        if (icon == ToolIcon.Eraser) {
            InkEraserIcon(tint = tint, modifier = Modifier.size(20.dp))
        } else {
            val imageVector = when (icon) {
                ToolIcon.Pen -> Icons.Outlined.Edit
                ToolIcon.Pencil -> Icons.Outlined.Create
                ToolIcon.Highlighter -> Icons.Outlined.Brush
                ToolIcon.Lasso -> Icons.Outlined.CropFree
                ToolIcon.Laser -> Icons.Outlined.Flare
                ToolIcon.Shape -> Icons.Outlined.Category
                ToolIcon.Tape -> Icons.Outlined.FormatPaint
                else -> Icons.Outlined.Edit
            }
            Icon(
                imageVector = imageVector,
                contentDescription = label,
                tint = tint,
                modifier = Modifier.size(22.dp)
            )
        }
    }
    Spacer(Modifier.width(2.dp))
}

@Composable
private fun InkEraserIcon(tint: Color, modifier: Modifier = Modifier) {
    androidx.compose.foundation.Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val strokePx = 1.8.dp.toPx()

        // 45° tilted eraser parallelogram matching user image
        val blockPath = androidx.compose.ui.graphics.Path().apply {
            moveTo(w * 0.58f, h * 0.12f)
            lineTo(w * 0.88f, h * 0.42f)
            lineTo(w * 0.42f, h * 0.88f)
            lineTo(w * 0.12f, h * 0.72f)
            close()
        }
        drawPath(
            path = blockPath,
            color = tint,
            style = androidx.compose.ui.graphics.drawscope.Stroke(
                width = strokePx,
                cap = androidx.compose.ui.graphics.StrokeCap.Round,
                join = androidx.compose.ui.graphics.StrokeJoin.Round
            )
        )
        // Horizontal line under bottom-right corner
        drawLine(
            color = tint,
            start = Offset(w * 0.65f, h * 0.88f),
            end = Offset(w * 0.90f, h * 0.88f),
            strokeWidth = strokePx,
            cap = androidx.compose.ui.graphics.StrokeCap.Round
        )
    }
}

@Composable
private fun ColorSwatch(color: Color, isActive: Boolean, onClick: () -> Unit) {
    val innerColor = if (color == Color(0xFF0D0D0D)) Color(0xFF111111) else color
    Box(
        modifier = Modifier
            .size(20.dp)
            .clip(CircleShape)
            // Outer ring on active — visible selection indicator
            .border(
                width = if (isActive) 2.dp else 1.dp,
                color = if (isActive) AccentGreen else ToolbarBorder,
                shape = CircleShape
            )
            .padding(if (isActive) 2.dp else 1.dp)
            .clip(CircleShape)
            .background(innerColor)
            .clickable(onClick = onClick)
    )
}

@Composable
private fun StrokeWidthButton(
    dotSize: androidx.compose.ui.unit.Dp,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(if (isActive) ActiveBg else Color.Transparent)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        // Visual dot as width indicator + label below
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Box(
                modifier = Modifier
                    .size(dotSize)
                    .clip(CircleShape)
                    .background(if (isActive) AccentGreen else ToolIconDefault)
            )
            Text(
                text = label,
                color = if (isActive) AccentGreen else ToolIconDefault,
                fontSize = 8.sp,
                fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal
            )
        }
    }
    Spacer(Modifier.width(1.dp))
}

@Composable
private fun ActionButton(label: String, onClick: () -> Unit, content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        content()
    }
    Spacer(Modifier.width(1.dp))
}

@Composable
private fun ToolbarDivider() {
    Box(
        modifier = Modifier
            .padding(horizontal = 4.dp)
            .width(1.dp)
            .height(24.dp)
            .background(DividerColor)
    )
}
