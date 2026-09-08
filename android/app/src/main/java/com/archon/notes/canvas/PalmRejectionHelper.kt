package com.archon.notes.canvas

import android.view.MotionEvent

object PalmRejectionHelper {
    const val STYLUS_ONLY: Boolean = true

    fun isValidStrokeEvent(event: MotionEvent): Boolean {
        // [LATENCY-CRITICAL] STYLUS_ONLY filter: Check tool type immediately and reject unwanted types to prevent drawing with palm/fingers

        return when (event.getToolType(0)) {
            MotionEvent.TOOL_TYPE_STYLUS, MotionEvent.TOOL_TYPE_ERASER -> true
            else -> false
        }
    }
}
