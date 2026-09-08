package com.archon.notes.canvas

import android.graphics.PointF
import android.graphics.RectF
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.ui.graphics.Color
import java.util.UUID

data class StudyTape(
    val id: String = UUID.randomUUID().toString(),
    val points: List<PointF>,
    val strokeWidth: Float = 42f,
    val color: Color = Color(0xFFFBBF24), // Pastel Amber Tape
    val isRevealed: Boolean = false
) {
    val bounds: RectF by lazy {
        if (points.isEmpty()) RectF()
        else {
            var minX = Float.MAX_VALUE
            var minY = Float.MAX_VALUE
            var maxX = Float.MIN_VALUE
            var maxY = Float.MIN_VALUE
            for (p in points) {
                if (p.x < minX) minX = p.x
                if (p.x > maxX) maxX = p.x
                if (p.y < minY) minY = p.y
                if (p.y > maxY) maxY = p.y
            }
            val halfW = strokeWidth / 2f
            RectF(minX - halfW, minY - halfW, maxX + halfW, maxY + halfW)
        }
    }

    fun containsPoint(px: Float, py: Float): Boolean {
        if (!bounds.contains(px, py)) return false
        // Distance check to segment lines
        val thresholdSq = (strokeWidth / 2f) * (strokeWidth / 2f)
        for (i in 0 until points.size - 1) {
            val p1 = points[i]
            val p2 = points[i + 1]
            if (distSqToSegment(px, py, p1.x, p1.y, p2.x, p2.y) <= thresholdSq) {
                return true
            }
        }
        return false
    }

    private fun distSqToSegment(px: Float, py: Float, x1: Float, y1: Float, x2: Float, y2: Float): Float {
        val dx = x2 - x1
        val dy = y2 - y1
        val l2 = dx * dx + dy * dy
        if (l2 == 0f) {
            val dpx = px - x1
            val dpy = py - y1
            return dpx * dpx + dpy * dpy
        }
        var t = ((px - x1) * dx + (py - y1) * dy) / l2
        t = t.coerceIn(0f, 1f)
        val projX = x1 + t * dx
        val projY = y1 + t * dy
        val distX = px - projX
        val distY = py - projY
        return distX * distX + distY * distY
    }
}

class StudyTapeState {
    private val _tapes = mutableStateListOf<StudyTape>()
    val tapes: List<StudyTape> get() = _tapes

    fun addTape(tape: StudyTape) {
        _tapes.add(tape)
    }

    fun removeTape(tape: StudyTape) {
        _tapes.remove(tape)
    }

    fun toggleTape(tapeId: String) {
        val index = _tapes.indexOfFirst { it.id == tapeId }
        if (index != -1) {
            val current = _tapes[index]
            _tapes[index] = current.copy(isRevealed = !current.isRevealed)
        }
    }

    fun toggleAtPoint(x: Float, y: Float): Boolean {
        // Iterate backwards (top-most tape first)
        for (i in _tapes.indices.reversed()) {
            val tape = _tapes[i]
            if (tape.containsPoint(x, y)) {
                _tapes[i] = tape.copy(isRevealed = !tape.isRevealed)
                return true
            }
        }
        return false
    }

    fun revealAll() {
        for (i in _tapes.indices) {
            _tapes[i] = _tapes[i].copy(isRevealed = true)
        }
    }

    fun hideAll() {
        for (i in _tapes.indices) {
            _tapes[i] = _tapes[i].copy(isRevealed = false)
        }
    }

    fun clearAll() {
        _tapes.clear()
    }
}
