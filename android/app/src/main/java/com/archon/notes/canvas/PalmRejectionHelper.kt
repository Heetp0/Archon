package com.archon.notes.canvas

import android.view.MotionEvent

object PalmRejectionHelper {
    fun isValidStrokeEvent(event: MotionEvent): Boolean {
        // [LATENCY-CRITICAL] Check tool type immediately and reject unwanted types to prevent drawing with palm/fingers
        return when (event.getToolType(0)) {
            MotionEvent.TOOL_TYPE_STYLUS, MotionEvent.TOOL_TYPE_ERASER -> true
            else -> false
        }
    }
}
