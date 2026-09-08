package com.archon.notes.canvas

import android.graphics.PointF
import android.graphics.RectF
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.ink.brush.Brush
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke

data class LassoSelection(
    val selectedStrokes: List<Stroke> = emptyList(),
    val bounds: RectF = RectF(),
    val isDragging: Boolean = false,
    val dragStartOffset: PointF = PointF()
)

object LassoSelectionManager {

    /**
     * Checks if a point (px, py) is inside a closed polygon using ray-casting.
     */
    fun isPointInPolygon(px: Float, py: Float, polygon: List<PointF>): Boolean {
        if (polygon.size < 3) return false
        var inside = false
        var j = polygon.size - 1
        for (i in polygon.indices) {
            val xi = polygon[i].x
            val yi = polygon[i].y
            val xj = polygon[j].x
            val yj = polygon[j].y

            val intersect = ((yi > py) != (yj > py)) &&
                    (px < (xj - xi) * (py - yi) / (yj - yi + 1e-6f) + xi)
            if (intersect) inside = !inside
            j = i
        }
        return inside
    }

    /**
     * Identifies all strokes from [allStrokes] that fall inside the [lassoPolygon].
     * Uses stroke vertex sampling and bounding box containment.
     */
    fun selectStrokes(lassoPolygon: List<PointF>, allStrokes: List<Stroke>): List<Stroke> {
        if (lassoPolygon.size < 3 || allStrokes.isEmpty()) return emptyList()

        val polyBounds = computePolygonBounds(lassoPolygon)
        val selected = mutableListOf<Stroke>()

        for (stroke in allStrokes) {
            val box = stroke.shape.computeBoundingBox() ?: continue
            val strokeBounds = RectF(box.xMin, box.yMin, box.xMax, box.yMax)

            // Fast reject: bounding boxes do not overlap
            if (!RectF.intersects(polyBounds, strokeBounds)) continue

            // Sample stroke points (start, center, end)
            val inputs = stroke.inputs
            if (inputs.size == 0) continue

            val sampleIndices = listOf(0, inputs.size / 2, inputs.size - 1)
            var pointsInside = 0
            for (idx in sampleIndices) {
                val pt = inputs[idx]
                if (isPointInPolygon(pt.x, pt.y, lassoPolygon)) {
                    pointsInside++
                }
            }

            // If at least 2 of the 3 sampled points (or the centroid) are inside, select it
            val centroidX = (box.xMin + box.xMax) / 2f
            val centroidY = (box.yMin + box.yMax) / 2f
            if (pointsInside >= 2 || isPointInPolygon(centroidX, centroidY, lassoPolygon)) {
                selected.add(stroke)
            }
        }
        return selected
    }

    fun computePolygonBounds(polygon: List<PointF>): RectF {
        if (polygon.isEmpty()) return RectF()
        var minX = Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxX = Float.MIN_VALUE
        var maxY = Float.MIN_VALUE
        for (pt in polygon) {
            if (pt.x < minX) minX = pt.x
            if (pt.x > maxX) maxX = pt.x
            if (pt.y < minY) minY = pt.y
            if (pt.y > maxY) maxY = pt.y
        }
        return RectF(minX, minY, maxX, maxY)
    }

    fun computeStrokesBounds(strokes: List<Stroke>): RectF {
        if (strokes.isEmpty()) return RectF()
        var minX = Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxX = Float.MIN_VALUE
        var maxY = Float.MIN_VALUE
        for (stroke in strokes) {
            val box = stroke.shape.computeBoundingBox() ?: continue
            if (box.xMin < minX) minX = box.xMin
            if (box.yMin < minY) minY = box.yMin
            if (box.xMax > maxX) maxX = box.xMax
            if (box.yMax > maxY) maxY = box.yMax
        }
        return if (minX < maxX && minY < maxY) RectF(minX, minY, maxX, maxY) else RectF()
    }

    /**
     * Translates each stroke in [strokes] by ([dx], [dy]) while preserving pressure,
     * tool type, and brush properties.
     */
    fun translateStrokes(strokes: List<Stroke>, dx: Float, dy: Float): List<Stroke> {
        return strokes.map { stroke ->
            val inputs = stroke.inputs
            val batch = MutableStrokeInputBatch()
            for (i in 0 until inputs.size) {
                val inp = inputs[i]
                batch.add(
                    type = androidx.ink.brush.InputToolType.STYLUS,
                    x = inp.x + dx,
                    y = inp.y + dy,
                    elapsedTimeMillis = inp.elapsedTimeMillis,
                    pressure = inp.pressure,
                    tiltRadians = inp.tiltRadians,
                    orientationRadians = inp.orientationRadians
                )
            }
            Stroke(brush = stroke.brush, inputs = batch.toImmutable())
        }
    }

    /**
     * Duplicates the selected strokes with an offset (+30px, +30px).
     */
    fun duplicateStrokes(strokes: List<Stroke>, offset: Float = 30f): List<Stroke> {
        return translateStrokes(strokes, offset, offset)
    }

    /**
     * Recolor selected strokes with a new color.
     */
    fun recolorStrokes(strokes: List<Stroke>, newColor: Color): List<Stroke> {
        val argb = newColor.toArgb()
        return strokes.map { stroke ->
            val newBrush = Brush.createWithColorIntArgb(
                family = stroke.brush.family,
                colorIntArgb = argb,
                size = stroke.brush.size,
                epsilon = stroke.brush.epsilon
            )
            Stroke(brush = newBrush, inputs = stroke.inputs)
        }
    }
}
