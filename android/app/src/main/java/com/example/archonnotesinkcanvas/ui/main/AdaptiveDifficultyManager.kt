package com.example.archonnotesinkcanvas.ui.main

object AdaptiveDifficultyManager {

    enum class Difficulty(val label: String) {
        EASY("easy"),
        MEDIUM("medium"),
        HARD("hard")
    }

    /**
     * Determines next question difficulty based on consecutive streak & confidence.
     */
    fun getNextDifficulty(
        currentDifficulty: Difficulty,
        recentAccuracyRatio: Float,
        recentConfidence: String
    ): Difficulty {
        return when {
            recentAccuracyRatio >= 0.8f && recentConfidence == "confident" -> {
                when (currentDifficulty) {
                    Difficulty.EASY -> Difficulty.MEDIUM
                    Difficulty.MEDIUM -> Difficulty.HARD
                    Difficulty.HARD -> Difficulty.HARD
                }
            }
            recentAccuracyRatio <= 0.4f -> {
                when (currentDifficulty) {
                    Difficulty.HARD -> Difficulty.MEDIUM
                    Difficulty.MEDIUM -> Difficulty.EASY
                    Difficulty.EASY -> Difficulty.EASY
                }
            }
            else -> currentDifficulty
        }
    }
}
