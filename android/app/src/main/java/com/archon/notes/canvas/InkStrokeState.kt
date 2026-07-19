package com.archon.notes.canvas

import androidx.compose.runtime.mutableStateListOf
import androidx.ink.strokes.Stroke

class InkStrokeState {
    private val _strokes = mutableStateListOf<Stroke>()
    val strokes: List<Stroke> get() = _strokes

    fun addStroke(stroke: Stroke) {
        _strokes.add(stroke)
    }

    fun clearAll() {
        _strokes.clear()
    }

    fun setStrokes(strokes: List<Stroke>) {
        _strokes.clear()
        _strokes.addAll(strokes)
    }
}
