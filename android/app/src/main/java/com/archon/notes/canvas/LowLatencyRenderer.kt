package com.archon.notes.canvas

import androidx.graphics.lowlatency.BufferInfo
import androidx.graphics.lowlatency.GLFrontBufferedRenderer
import androidx.graphics.opengl.egl.EGLManager
import androidx.ink.strokes.Stroke

class LowLatencyRenderer : GLFrontBufferedRenderer.Callback<Stroke?> {

    override fun onDrawFrontBufferedLayer(
        eglManager: EGLManager,
        bufferInfo: BufferInfo,
        transform: FloatArray,
        param: Stroke?
    ) {
        // [LATENCY-CRITICAL] Draw transient stroke immediately to front buffer
    }

    override fun onDrawDoubleBufferedLayer(
        eglManager: EGLManager,
        bufferInfo: BufferInfo,
        transform: FloatArray,
        params: Collection<Stroke?>
    ) {
        // Draw committed strokes to double buffer for persistence
    }
}
