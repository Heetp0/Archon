package com.archon.notes.canvas

import android.view.MotionEvent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInteropFilter
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.ink.brush.Brush
import androidx.ink.brush.InputToolType
import androidx.ink.brush.StockBrushes
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun InkCanvas(
    state: InkStrokeState,
    modifier: Modifier = Modifier,
    onStrokeAdded: () -> Unit = {},
    currentTool: String = "pen",
    currentColor: Color = Color.Black,
    currentStrokeWidth: Float = 5f
) {
    val view = LocalView.current
    val predictor = remember { CanvasMotionPredictor(view) }
    val currentGestureBatch = remember { MutableStrokeInputBatch() }
    val strokeRenderer = remember { CanvasStrokeRenderer.create() }
    
    // We need a trigger to force redraw when drawing a stroke
    var redrawTrigger by remember { mutableStateOf(0) }

    val isDark = isSystemInDarkTheme()
    val paperColor = if (isDark) Color(0xFF1E1E1E) else Color(0xFFFAF9F6)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Transparent)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {


            Canvas(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxSize()
                    .pointerInteropFilter { event ->
                        if (!PalmRejectionHelper.isValidStrokeEvent(event)) {
                            return@pointerInteropFilter false
                        }
                        
                        val toolType = if (event.getToolType(0) == MotionEvent.TOOL_TYPE_STYLUS) {
                            InputToolType.STYLUS
                        } else {
                            InputToolType.TOUCH
                        }
                        
                        val orientation = event.getAxisValue(MotionEvent.AXIS_ORIENTATION)
                        val normalizedOrientation = if (orientation < 0f) {
                            (orientation + 2 * Math.PI).toFloat()
                        } else {
                            orientation
                        }
                        
                        when (event.actionMasked) {
                            MotionEvent.ACTION_DOWN -> {
                                currentGestureBatch.clear()
                                currentGestureBatch.add(
                                    type = toolType,
                                    x = event.x,
                                    y = event.y,
                                    elapsedTimeMillis = event.eventTime - event.downTime,
                                    pressure = event.pressure,
                                    tiltRadians = event.getAxisValue(MotionEvent.AXIS_TILT),
                                    orientationRadians = normalizedOrientation
                                )
                                redrawTrigger++
                            }
                            MotionEvent.ACTION_MOVE -> {
                                currentGestureBatch.add(
                                    type = toolType,
                                    x = event.x,
                                    y = event.y,
                                    elapsedTimeMillis = event.eventTime - event.downTime,
                                    pressure = event.pressure,
                                    tiltRadians = event.getAxisValue(MotionEvent.AXIS_TILT),
                                    orientationRadians = normalizedOrientation
                                )
                                redrawTrigger++
                            }
                            MotionEvent.ACTION_UP -> {
                                currentGestureBatch.add(
                                    type = toolType,
                                    x = event.x,
                                    y = event.y,
                                    elapsedTimeMillis = event.eventTime - event.downTime,
                                    pressure = event.pressure,
                                    tiltRadians = event.getAxisValue(MotionEvent.AXIS_TILT),
                                    orientationRadians = normalizedOrientation
                                )
                                
                                if (currentTool == "eraser") {
                                    val eraserInputs = currentGestureBatch.toImmutable()
                                    val eraserBrush = Brush.createWithColorIntArgb(
                                        family = StockBrushes.marker(),
                                        colorIntArgb = 0,
                                        size = 10f,
                                        epsilon = 0.1f
                                    )
                                    val eraserStroke = Stroke(brush = eraserBrush, inputs = eraserInputs)
                                    val eraserBox = eraserStroke.shape.computeBoundingBox()
                                    
                                    val strokesToRemove = state.strokes.filter { s ->
                                        val box = s.shape.computeBoundingBox()
                                        if (box == null || eraserBox == null) {
                                            false
                                        } else {
                                            !(box.xMax < eraserBox.xMin || box.xMin > eraserBox.xMax ||
                                              box.yMax < eraserBox.yMin || box.yMin > eraserBox.yMax)
                                        }
                                    }
                                    strokesToRemove.forEach { state.removeStroke(it) }
                                } else {
                                    val inputs = currentGestureBatch.toImmutable()
                                    val brush = createBrushForTool(currentTool, currentColor, currentStrokeWidth)
                                    state.addStroke(Stroke(brush = brush, inputs = inputs))
                                }
                                currentGestureBatch.clear()
                                onStrokeAdded()
                                redrawTrigger++
                            }
                        }
                        true
                    }
            ) {
                // Dummy read to trigger recomposition when drawing
                redrawTrigger.hashCode()

                drawIntoCanvas { canvas ->
                    val nativeCanvas = canvas.nativeCanvas
                    val matrix = android.graphics.Matrix()
                    
                    // Draw finalized strokes
                    state.strokes.forEach { stroke ->
                        strokeRenderer.draw(nativeCanvas, stroke, matrix)
                    }
                    
                    // Draw transient stroke
                    if (!currentGestureBatch.isEmpty() && currentTool != "eraser") {
                        val inputs = currentGestureBatch.toImmutable()
                        val brush = createBrushForTool(currentTool, currentColor, currentStrokeWidth)
                        val transientStroke = Stroke(brush = brush, inputs = inputs)
                        strokeRenderer.draw(nativeCanvas, transientStroke, matrix)
                    }
                }
            }
        }
    }
}

private fun createBrushForTool(tool: String, color: Color, width: Float): Brush {
    val family = when (tool) {
        "marker" -> StockBrushes.marker()
        "highlighter" -> StockBrushes.highlighter()
        "laser" -> StockBrushes.highlighter()
        "shape" -> StockBrushes.pressurePen()
        "pen" -> StockBrushes.pressurePen()
        else -> StockBrushes.pressurePen()
    }
    val effectiveColor = when (tool) {
        "highlighter" -> if (color == Color.Black || color == Color(0xFF0D0D0D)) Color(0xFF00E599).copy(alpha = 0.35f) else color.copy(alpha = 0.30f)
        "laser" -> if (color == Color.Black || color == Color(0xFF0D0D0D)) Color(0xFFE11D48).copy(alpha = 0.85f) else color.copy(alpha = 0.85f)
        else -> color
    }
    val effectiveSize = when (tool) {
        "marker" -> width * 2.2f
        "highlighter" -> width * 4.5f
        "laser" -> width * 3.0f
        "shape" -> width * 1.2f
        else -> width
    }
    return Brush.createWithColorIntArgb(
        family = family,
        colorIntArgb = effectiveColor.toArgb(),
        size = effectiveSize,
        epsilon = 0.1f
    )
}
