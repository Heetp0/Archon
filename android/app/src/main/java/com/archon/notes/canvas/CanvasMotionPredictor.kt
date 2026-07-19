package com.archon.notes.canvas

import android.graphics.PointF
import android.view.MotionEvent
import android.view.View
import androidx.input.motionprediction.MotionEventPredictor

class CanvasMotionPredictor(view: View) {
    private val predictor = MotionEventPredictor.newInstance(view)

    fun record(event: MotionEvent) {
        // [LATENCY-CRITICAL] Record raw event immediately to feed prediction history
        predictor.record(event)
    }

    fun predictedPoint(event: MotionEvent): PointF {
        record(event)
        val predictedEvent = predictor.predict()
        return if (predictedEvent != null) {
            val point = PointF(predictedEvent.x, predictedEvent.y)
            predictedEvent.recycle()
            point
        } else {
            PointF(event.x, event.y)
        }
    }
}
