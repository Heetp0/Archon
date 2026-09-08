package com.example.archonnotesinkcanvas.ui.main

import java.util.concurrent.TimeUnit

object SpacedRepetitionCalculator {

    data class SM2Result(
        val intervalDays: Int,
        val nextReviewTimestamp: Long,
        val newEasinessFactor: Float
    )

    /**
     * Calculates SM-2 spaced repetition review date.
     * @param isCorrect Whether user answered correctly
     * @param confidence User confidence rating: "guess", "unsure", "confident"
     * @param currentRepetitions Previous successful repetitions count
     * @param currentEF Current Easiness Factor (default 2.5f)
     */
    fun calculateNextReview(
        isCorrect: Boolean,
        confidence: String,
        currentRepetitions: Int = 0,
        currentEF: Float = 2.5f
    ): SM2Result {
        // Map confidence & correctness to Quality grade q (0..5)
        val q = when {
            !isCorrect -> if (confidence == "guess") 0 else 1
            confidence == "guess" -> 3
            confidence == "unsure" -> 4
            else -> 5 // confident
        }

        // New Easiness Factor EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        val newEF = (currentEF + (0.1f - (5 - q) * (0.08f + (5 - q) * 0.02f))).coerceAtLeast(1.3f)

        val repetitions = if (q >= 3) currentRepetitions + 1 else 0
        val intervalDays = when (repetitions) {
            0 -> 1
            1 -> 1
            2 -> 6
            else -> (currentRepetitions * newEF).toInt().coerceAtLeast(6)
        }

        val nextTimestamp = System.currentTimeMillis() + TimeUnit.DAYS.toMillis(intervalDays.toLong())

        return SM2Result(
            intervalDays = intervalDays,
            nextReviewTimestamp = nextTimestamp,
            newEasinessFactor = newEF
        )
    }
}
