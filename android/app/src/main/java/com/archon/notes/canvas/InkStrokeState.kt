package com.archon.notes.canvas

import androidx.compose.runtime.mutableStateListOf
import androidx.ink.strokes.Stroke

class InkStrokeState {
    private val _strokes = mutableStateListOf<Stroke>()
    val strokes: List<Stroke> get() = _strokes

    // History stacks store the state of the strokes list
    private val undoStack = mutableListOf<List<Stroke>>()
    private val redoStack = mutableListOf<List<Stroke>>()

    fun addStroke(stroke: Stroke) {
        saveStateForUndo()
        _strokes.add(stroke)
    }

    fun removeStroke(stroke: Stroke) {
        saveStateForUndo()
        _strokes.remove(stroke)
    }

    fun clearAll() {
        saveStateForUndo()
        _strokes.clear()
    }

    fun setStrokes(strokes: List<Stroke>) {
        _strokes.clear()
        _strokes.addAll(strokes)
        undoStack.clear()
        redoStack.clear()
    }

    private fun saveStateForUndo() {
        undoStack.add(_strokes.toList())
        redoStack.clear()
    }

    fun undo() {
        if (undoStack.isNotEmpty()) {
            redoStack.add(_strokes.toList())
            val previousState = undoStack.removeLast()
            _strokes.clear()
            _strokes.addAll(previousState)
        }
    }

    fun redo() {
        if (redoStack.isNotEmpty()) {
            undoStack.add(_strokes.toList())
            val nextState = redoStack.removeLast()
            _strokes.clear()
            _strokes.addAll(nextState)
        }
    }
}
