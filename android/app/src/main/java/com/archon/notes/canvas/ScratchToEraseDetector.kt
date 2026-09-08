package com.archon.notes.canvas

import android.graphics.PointF
import android.graphics.RectF
import kotlin.math.abs

object ScratchToEraseDetector {

    /**
     * Detects if the current gesture points represent a rapid back-and-forth scratch/scribble.
     * Returns the bounding box of the scratch area if detected, or null.
     */
    fun detectScratchOut(points: List<PointF>): RectF? {
        if (points.size < 12) return null

        var directionReversalsX = 0
        var lastDeltaX = 0f
        var minX = Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxX = Float.MIN_VALUE
        var maxY = Float.MIN_VALUE

        for (i in 0 until points.size - 1) {
            val p1 = points[i]
            val p2 = points[i + 1]

            if (p1.x < minX) minX = p1.x
            if (p1.x > maxX) maxX = p1.x
            if (p1.y < minY) minY = p1.y
            if (p1.y > maxY) maxY = p1.y

            val dx = p2.x - p1.x
            if (abs(dx) > 12f) { // Significant horizontal movement
                if (lastDeltaX != 0f && (dx > 0) != (lastDeltaX > 0)) {
                    directionReversalsX++
                }
                lastDeltaX = dx
            }
        }

        // Also check Y reversals for vertical scratchouts
        var directionReversalsY = 0
        var lastDeltaY = 0f
        for (i in 0 until points.size - 1) {
            val p1 = points[i]
            val p2 = points[i + 1]
            val dy = p2.y - p1.y
            if (abs(dy) > 12f) {
                if (lastDeltaY != 0f && (dy > 0) != (lastDeltaY > 0)) {
                    directionReversalsY++
                }
                lastDeltaY = dy
            }
        }

        val boxWidth = maxX - minX
        val boxHeight = maxY - minY

        // A scratch-out has at least 4 reversals and a reasonably localized bounding box
        val isHorizontalScratch = directionReversalsX >= 4 && boxWidth > 30f && boxHeight < 250f
        val isVerticalScratch = directionReversalsY >= 4 && boxHeight > 30f && boxWidth < 250f

        return if (isHorizontalScratch || isVerticalScratch) {
            RectF(minX - 10f, minY - 10f, maxX + 10f, maxY + 10f)
        } else {
            null
        }
    }
}
