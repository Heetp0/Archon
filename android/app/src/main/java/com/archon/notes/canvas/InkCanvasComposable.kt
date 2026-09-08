package com.archon.notes.canvas

import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.PointF
import android.graphics.RectF
import android.view.MotionEvent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInteropFilter
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.ink.brush.Brush
import androidx.ink.brush.InputToolType
import androidx.ink.brush.StockBrushes
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import java.util.UUID

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
    val density = LocalDensity.current
    val currentGestureBatch = remember { MutableStrokeInputBatch() }
    val strokeRenderer = remember { CanvasStrokeRenderer.create() }

    // Advanced StarNote & GoodNotes Managers
    val tapeState = remember { StudyTapeState() }
    var lassoSelection by remember { mutableStateOf<LassoSelection?>(null) }
    val lassoPoints = remember { mutableListOf<PointF>() }
    val currentRawPoints = remember { mutableListOf<PointF>() }
    var lastMoveTime by remember { mutableStateOf(0L) }

    var redrawTrigger by remember { mutableStateOf(0) }

    // Paints for Canvas Custom Overlays
    val lassoPaint = remember {
        Paint().apply {
            color = android.graphics.Color.parseColor("#10B981") // Archon Emerald
            style = Paint.Style.STROKE
            strokeWidth = 3f
            pathEffect = DashPathEffect(floatArrayOf(12f, 8f), 0f)
            isAntiAlias = true
        }
    }

    val lassoBoundsPaint = remember {
        Paint().apply {
            color = android.graphics.Color.parseColor("#6366F1") // Electric Indigo
            style = Paint.Style.STROKE
            strokeWidth = 2.5f
            pathEffect = DashPathEffect(floatArrayOf(14f, 10f), 0f)
            isAntiAlias = true
        }
    }

    val tapeOpaquePaint = remember {
        Paint().apply {
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
            isAntiAlias = true
        }
    }

    val tapeRevealedPaint = remember {
        Paint().apply {
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
            pathEffect = DashPathEffect(floatArrayOf(10f, 6f), 0f)
            isAntiAlias = true
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Transparent)
    ) {
        Canvas(
            modifier = Modifier
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
                            currentRawPoints.clear()
                            currentRawPoints.add(PointF(event.x, event.y))
                            lastMoveTime = event.eventTime

                            if (currentTool == "tape") {
                                // Test if user tapped an existing study tape to toggle reveal
                                if (tapeState.toggleAtPoint(event.x, event.y)) {
                                    redrawTrigger++
                                    return@pointerInteropFilter true
                                }
                            } else if (currentTool == "lasso") {
                                val curSelection = lassoSelection
                                if (curSelection != null && curSelection.selectedStrokes.isNotEmpty() && curSelection.bounds.contains(event.x, event.y)) {
                                    // Start dragging selected strokes
                                    lassoSelection = curSelection.copy(isDragging = true, dragStartOffset = PointF(event.x, event.y))
                                    return@pointerInteropFilter true
                                } else {
                                    // Clear selection and start new lasso loop
                                    lassoSelection = null
                                    lassoPoints.clear()
                                    lassoPoints.add(PointF(event.x, event.y))
                                }
                            }

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
                            currentRawPoints.add(PointF(event.x, event.y))
                            lastMoveTime = event.eventTime

                            if (currentTool == "lasso") {
                                val curSelection = lassoSelection
                                if (curSelection?.isDragging == true) {
                                    val dx = event.x - curSelection.dragStartOffset.x
                                    val dy = event.y - curSelection.dragStartOffset.y
                                    if (dx != 0f || dy != 0f) {
                                        val oldStrokes = curSelection.selectedStrokes
                                        val movedStrokes = LassoSelectionManager.translateStrokes(oldStrokes, dx, dy)

                                        // Update state: replace old with moved
                                        oldStrokes.forEach { state.removeStroke(it) }
                                        movedStrokes.forEach { state.addStroke(it) }

                                        val newBounds = LassoSelectionManager.computeStrokesBounds(movedStrokes)
                                        lassoSelection = curSelection.copy(
                                            selectedStrokes = movedStrokes,
                                            bounds = newBounds,
                                            dragStartOffset = PointF(event.x, event.y)
                                        )
                                        redrawTrigger++
                                    }
                                    return@pointerInteropFilter true
                                } else {
                                    lassoPoints.add(PointF(event.x, event.y))
                                    redrawTrigger++
                                }
                            }

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
                            currentRawPoints.add(PointF(event.x, event.y))

                            if (currentTool == "lasso") {
                                val curSelection = lassoSelection
                                if (curSelection?.isDragging == true) {
                                    lassoSelection = curSelection.copy(isDragging = false)
                                } else if (lassoPoints.size >= 3) {
                                    val selected = LassoSelectionManager.selectStrokes(lassoPoints, state.strokes)
                                    if (selected.isNotEmpty()) {
                                        val bounds = LassoSelectionManager.computeStrokesBounds(selected)
                                        lassoSelection = LassoSelection(selectedStrokes = selected, bounds = bounds)
                                    } else {
                                        lassoSelection = null
                                    }
                                    lassoPoints.clear()
                                }
                                redrawTrigger++
                                return@pointerInteropFilter true
                            }

                            if (currentTool == "tape") {
                                if (currentRawPoints.size >= 2) {
                                    val tapeColor = if (currentColor == Color.Black || currentColor == Color(0xFF0D0D0D)) Color(0xFFFBBF24) else currentColor
                                    tapeState.addTape(
                                        StudyTape(
                                            points = currentRawPoints.toList(),
                                            strokeWidth = currentStrokeWidth * 6.5f,
                                            color = tapeColor
                                        )
                                    )
                                }
                                currentRawPoints.clear()
                                currentGestureBatch.clear()
                                onStrokeAdded()
                                redrawTrigger++
                                return@pointerInteropFilter true
                            }

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
                                    if (box == null || eraserBox == null) false
                                    else !(box.xMax < eraserBox.xMin || box.xMin > eraserBox.xMax || box.yMax < eraserBox.yMin || box.yMin > eraserBox.yMax)
                                }
                                strokesToRemove.forEach { state.removeStroke(it) }
                            } else {
                                // 1. Check Scratch-to-Erase gesture (Apple Notes style)
                                val scratchBox = ScratchToEraseDetector.detectScratchOut(currentRawPoints)
                                if (scratchBox != null && (currentTool == "pen" || currentTool == "pencil")) {
                                    val scratchedStrokes = state.strokes.filter { s ->
                                        val box = s.shape.computeBoundingBox()
                                        if (box == null) false
                                        else !(box.xMax < scratchBox.left || box.xMin > scratchBox.right || box.yMax < scratchBox.top || box.yMin > scratchBox.bottom)
                                    }
                                    scratchedStrokes.forEach { state.removeStroke(it) }
                                } else {
                                    // 2. Check Shape Snapping (GoodNotes / Apple Notes style)
                                    val recognizedShape = if (currentTool == "shape" || (event.eventTime - lastMoveTime > 350L && currentRawPoints.size >= 8)) {
                                        ShapeRecognizer.recognize(currentRawPoints)
                                    } else null

                                    if (recognizedShape != null) {
                                        val shapePoints = ShapeRecognizer.generateShapePoints(recognizedShape)
                                        val shapeBatch = MutableStrokeInputBatch()
                                        val dt = if (shapePoints.size > 1) 400L / shapePoints.size else 10L
                                        shapePoints.forEachIndexed { i, pt ->
                                            shapeBatch.add(
                                                type = toolType,
                                                x = pt.x,
                                                y = pt.y,
                                                elapsedTimeMillis = i * dt,
                                                pressure = 0.8f,
                                                tiltRadians = 0f,
                                                orientationRadians = 0f
                                            )
                                        }
                                        val brush = createBrushForTool(currentTool, currentColor, currentStrokeWidth)
                                        state.addStroke(Stroke(brush = brush, inputs = shapeBatch.toImmutable()))
                                    } else {
                                        // 3. Normal Stroke
                                        currentGestureBatch.add(
                                            type = toolType,
                                            x = event.x,
                                            y = event.y,
                                            elapsedTimeMillis = event.eventTime - event.downTime,
                                            pressure = event.pressure,
                                            tiltRadians = event.getAxisValue(MotionEvent.AXIS_TILT),
                                            orientationRadians = normalizedOrientation
                                        )
                                        val inputs = currentGestureBatch.toImmutable()
                                        val brush = createBrushForTool(currentTool, currentColor, currentStrokeWidth)
                                        state.addStroke(Stroke(brush = brush, inputs = inputs))
                                    }
                                }
                            }
                            currentGestureBatch.clear()
                            currentRawPoints.clear()
                            onStrokeAdded()
                            redrawTrigger++
                        }
                    }
                    true
                }
        ) {
            redrawTrigger.hashCode()

            drawIntoCanvas { canvas ->
                val nativeCanvas = canvas.nativeCanvas
                val matrix = android.graphics.Matrix()

                // 1. Draw finalized strokes
                state.strokes.forEach { stroke ->
                    strokeRenderer.draw(nativeCanvas, stroke, matrix)
                }

                // 2. Draw StarNote Study Tapes over strokes
                tapeState.tapes.forEach { tape ->
                    if (tape.points.size >= 2) {
                        val path = android.graphics.Path()
                        path.moveTo(tape.points[0].x, tape.points[0].y)
                        for (i in 1 until tape.points.size) {
                            path.lineTo(tape.points[i].x, tape.points[i].y)
                        }

                        if (!tape.isRevealed) {
                            tapeOpaquePaint.color = tape.color.toArgb()
                            tapeOpaquePaint.strokeWidth = tape.strokeWidth
                            nativeCanvas.drawPath(path, tapeOpaquePaint)
                        } else {
                            tapeRevealedPaint.color = tape.color.copy(alpha = 0.45f).toArgb()
                            tapeRevealedPaint.strokeWidth = tape.strokeWidth
                            nativeCanvas.drawPath(path, tapeRevealedPaint)
                        }
                    }
                }

                // 3. Draw transient in-progress stroke
                if (!currentGestureBatch.isEmpty() && currentTool != "eraser" && currentTool != "lasso" && currentTool != "tape") {
                    val inputs = currentGestureBatch.toImmutable()
                    val brush = createBrushForTool(currentTool, currentColor, currentStrokeWidth)
                    val transientStroke = Stroke(brush = brush, inputs = inputs)
                    strokeRenderer.draw(nativeCanvas, transientStroke, matrix)
                }

                // 4. Draw transient lasso selection path
                if (currentTool == "lasso" && lassoPoints.size >= 2) {
                    val path = android.graphics.Path()
                    path.moveTo(lassoPoints[0].x, lassoPoints[0].y)
                    for (i in 1 until lassoPoints.size) {
                        path.lineTo(lassoPoints[i].x, lassoPoints[i].y)
                    }
                    nativeCanvas.drawPath(path, lassoPaint)
                }

                // 5. Draw Lasso Selected Bounding Box
                val curSelection = lassoSelection
                if (curSelection != null && curSelection.selectedStrokes.isNotEmpty()) {
                    val b = curSelection.bounds
                    val pad = 12f
                    nativeCanvas.drawRect(b.left - pad, b.top - pad, b.right + pad, b.bottom + pad, lassoBoundsPaint)
                }
            }
        }

        // ── Floating Lasso Action Menu Bar ─────────────────────────────────────────
        val curSelection = lassoSelection
        if (curSelection != null && curSelection.selectedStrokes.isNotEmpty() && !curSelection.isDragging) {
            val bounds = curSelection.bounds
            val leftDp = with(density) { (bounds.centerX() - 110f).coerceAtLeast(16f).toDp() }
            val topDp = with(density) { (bounds.top - 65f).coerceAtLeast(16f).toDp() }

            Surface(
                modifier = Modifier
                    .offset(x = leftDp, y = topDp)
                    .shadow(12.dp, RoundedCornerShape(12.dp)),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF1E1E24).copy(alpha = 0.94f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF6366F1).copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Duplicate
                    IconButton(
                        onClick = {
                            val duplicated = LassoSelectionManager.duplicateStrokes(curSelection.selectedStrokes, 35f)
                            duplicated.forEach { state.addStroke(it) }
                            val newBounds = LassoSelectionManager.computeStrokesBounds(duplicated)
                            lassoSelection = LassoSelection(selectedStrokes = duplicated, bounds = newBounds)
                            redrawTrigger++
                        },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Outlined.ContentCopy, contentDescription = "Duplicate", tint = Color.White, modifier = Modifier.size(18.dp))
                    }

                    // Recolor
                    IconButton(
                        onClick = {
                            val recolored = LassoSelectionManager.recolorStrokes(curSelection.selectedStrokes, currentColor)
                            curSelection.selectedStrokes.forEach { state.removeStroke(it) }
                            recolored.forEach { state.addStroke(it) }
                            lassoSelection = curSelection.copy(selectedStrokes = recolored)
                            redrawTrigger++
                        },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Outlined.Palette, contentDescription = "Recolor", tint = currentColor, modifier = Modifier.size(18.dp))
                    }

                    // Delete
                    IconButton(
                        onClick = {
                            curSelection.selectedStrokes.forEach { state.removeStroke(it) }
                            lassoSelection = null
                            redrawTrigger++
                        },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = Color(0xFFF43F5E), modifier = Modifier.size(18.dp))
                    }

                    // Deselect
                    IconButton(
                        onClick = {
                            lassoSelection = null
                            redrawTrigger++
                        },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Outlined.Close, contentDescription = "Deselect", tint = Color.LightGray, modifier = Modifier.size(18.dp))
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
