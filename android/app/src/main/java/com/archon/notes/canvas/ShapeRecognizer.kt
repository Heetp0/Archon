package com.archon.notes.canvas

import android.graphics.PointF
import android.graphics.RectF
import kotlin.math.*

sealed class RecognizedShape {
    data class StraightLine(val start: PointF, val end: PointF) : RecognizedShape()
    data class Circle(val center: PointF, val radius: Float) : RecognizedShape()
    data class Rectangle(val bounds: RectF) : RecognizedShape()
}

object ShapeRecognizer {

    /**
     * Attempts to recognize a geometric shape from raw input stroke points.
     * Returns a [RecognizedShape] if recognized with high confidence, or null.
     */
    fun recognize(points: List<PointF>): RecognizedShape? {
        if (points.size < 8) return null

        val pStart = points.first()
        val pEnd = points.last()

        val straightDist = distance(pStart, pEnd)
        var pathLength = 0f
        for (i in 0 until points.size - 1) {
            pathLength += distance(points[i], points[i + 1])
        }

        if (pathLength < 30f) return null

        // 1. Check for Straight Line
        // If path length is very close to straight-line distance, it is a line
        val chordRatio = pathLength / (straightDist + 1e-4f)
        if (chordRatio < 1.15f && straightDist > 50f) {
            return RecognizedShape.StraightLine(pStart, pEnd)
        }

        // 2. Check for Closed Shapes (Circle, Rectangle)
        val closureRatio = straightDist / pathLength
        val isClosed = closureRatio < 0.22f

        if (isClosed) {
            // Calculate Centroid
            var sumX = 0f
            var sumY = 0f
            for (p in points) {
                sumX += p.x
                sumY += p.y
            }
            val cx = sumX / points.size
            val cy = sumY / points.size
            val center = PointF(cx, cy)

            // Radii from centroid
            val radii = points.map { distance(it, center) }
            val avgRadius = radii.average().toFloat()
            if (avgRadius > 15f) {
                val variance = radii.map { (it - avgRadius) * (it - avgRadius) }.average().toFloat()
                val stdDev = sqrt(variance)
                val circularityError = stdDev / avgRadius

                // Low radius variance implies a Circle / Ellipse
                if (circularityError < 0.20f) {
                    return RecognizedShape.Circle(center, avgRadius)
                }

                // Check for Rectangle: bounds aspect ratio and corner proximity
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
                val bounds = RectF(minX, minY, maxX, maxY)
                val boxWidth = bounds.width()
                val boxHeight = bounds.height()

                if (boxWidth > 40f && boxHeight > 40f) {
                    // Test if points lie predominantly near the 4 boundaries
                    var nearBorderCount = 0
                    val tolerance = 0.20f * min(boxWidth, boxHeight)
                    for (p in points) {
                        val nearLeft = abs(p.x - minX) < tolerance
                        val nearRight = abs(p.x - maxX) < tolerance
                        val nearTop = abs(p.y - minY) < tolerance
                        val nearBottom = abs(p.y - maxY) < tolerance
                        if (nearLeft || nearRight || nearTop || nearBottom) {
                            nearBorderCount++
                        }
                    }
                    if (nearBorderCount.toFloat() / points.size > 0.75f) {
                        return RecognizedShape.Rectangle(bounds)
                    }
                }
            }
        }

        return null
    }

    /**
     * Converts a [RecognizedShape] into a discrete sequence of points for stroke synthesis.
     */
    fun generateShapePoints(shape: RecognizedShape): List<PointF> {
        return when (shape) {
            is RecognizedShape.StraightLine -> {
                listOf(shape.start, shape.end)
            }
            is RecognizedShape.Circle -> {
                val points = mutableListOf<PointF>()
                val numSteps = 40
                for (i in 0..numSteps) {
                    val theta = 2.0 * Math.PI * i / numSteps
                    val x = shape.center.x + shape.radius * cos(theta).toFloat()
                    val y = shape.center.y + shape.radius * sin(theta).toFloat()
                    points.add(PointF(x, y))
                }
                points
            }
            is RecognizedShape.Rectangle -> {
                val b = shape.bounds
                listOf(
                    PointF(b.left, b.top),
                    PointF(b.right, b.top),
                    PointF(b.right, b.bottom),
                    PointF(b.left, b.bottom),
                    PointF(b.left, b.top)
                )
            }
        }
    }

    private fun distance(p1: PointF, p2: PointF): Float {
        val dx = p2.x - p1.x
        val dy = p2.y - p1.y
        return sqrt(dx * dx + dy * dy)
    }
}
