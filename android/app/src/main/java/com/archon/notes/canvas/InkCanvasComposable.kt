package com.archon.notes.canvas

import android.view.MotionEvent
import android.view.SurfaceView
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.graphics.lowlatency.GLFrontBufferedRenderer
import androidx.ink.brush.Brush
import androidx.ink.brush.InputToolType
import androidx.ink.brush.StockBrushes
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke

@Composable
fun InkCanvas(
    state: InkStrokeState,
    modifier: Modifier = Modifier,
    onStrokeAdded: () -> Unit = {}
) {
    val context = LocalContext.current
    var frontBufferedRenderer: GLFrontBufferedRenderer<Stroke?>? = null

    // Track active stroke inputs mutable batch
    val currentGestureBatch = remember { MutableStrokeInputBatch() }

    Column(modifier = modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Button(onClick = { 
                state.clearAll() 
                onStrokeAdded()
            }) {
                Text("Clear All")
            }
        }

        AndroidView(
            factory = { ctx ->
                val surfaceView = SurfaceView(ctx)
                val predictor = CanvasMotionPredictor(surfaceView)
                
                // Low-latency graphics callback implementation
                val rendererCallback = LowLatencyRenderer()
                frontBufferedRenderer = GLFrontBufferedRenderer(surfaceView, rendererCallback)
                
                surfaceView.setOnTouchListener { _, event ->
                    // [LATENCY-CRITICAL] Palm rejection check
                    if (!PalmRejectionHelper.isValidStrokeEvent(event)) {
                        return@setOnTouchListener false
                    }
                    
                    // [LATENCY-CRITICAL] Record raw event immediately to feed prediction history
                    predictor.record(event)
                    val predictedPoint = predictor.predictedPoint(event)
                    
                    // Determine tool type
                    val toolType = if (event.getToolType(0) == MotionEvent.TOOL_TYPE_STYLUS) {
                        InputToolType.STYLUS
                    } else {
                        InputToolType.TOUCH
                    }
                    
                    when (event.action) {
                        MotionEvent.ACTION_DOWN -> {
                            currentGestureBatch.clear()
                            currentGestureBatch.add(
                                type = toolType,
                                x = event.x,
                                y = event.y,
                                elapsedTimeMillis = event.eventTime - event.downTime,
                                pressure = event.pressure,
                                tiltRadians = event.getAxisValue(MotionEvent.AXIS_TILT),
                                orientationRadians = event.getAxisValue(MotionEvent.AXIS_ORIENTATION)
                            )
                            // [LATENCY-CRITICAL] Front-buffer render must not block UI thread
                            frontBufferedRenderer?.renderFrontBufferedLayer(null)
                        }
                        MotionEvent.ACTION_MOVE -> {
                            currentGestureBatch.add(
                                type = toolType,
                                x = event.x,
                                y = event.y,
                                elapsedTimeMillis = event.eventTime - event.downTime,
                                pressure = event.pressure,
                                tiltRadians = event.getAxisValue(MotionEvent.AXIS_TILT),
                                orientationRadians = event.getAxisValue(MotionEvent.AXIS_ORIENTATION)
                            )
                            // [LATENCY-CRITICAL] Front-buffer render must not block UI thread
                            frontBufferedRenderer?.renderFrontBufferedLayer(null)
                        }
                        MotionEvent.ACTION_UP -> {
                            currentGestureBatch.add(
                                type = toolType,
                                x = event.x,
                                y = event.y,
                                elapsedTimeMillis = event.eventTime - event.downTime,
                                pressure = event.pressure,
                                tiltRadians = event.getAxisValue(MotionEvent.AXIS_TILT),
                                orientationRadians = event.getAxisValue(MotionEvent.AXIS_ORIENTATION)
                            )
                            // Binds to low-latency graphics pipeline, commit to double buffer
                            frontBufferedRenderer?.commit()
                            
                            // Build and finalize stroke
                            val inputs = currentGestureBatch.toImmutable()
                            val brush = Brush.createWithColorIntArgb(
                                family = StockBrushes.marker(),
                                colorIntArgb = 0xFF000000.toInt(),
                                size = 5f,
                                epsilon = 0.1f
                            )
                            val finishedStroke = Stroke(brush = brush, inputs = inputs)
                            state.addStroke(finishedStroke)
                            onStrokeAdded()
                        }
                    }
                    true
                }
                
                surfaceView
            },
            modifier = Modifier.weight(1f)
        )
    }

    DisposableEffect(Unit) {
        onDispose {
            frontBufferedRenderer?.release(false)
        }
    }
}
