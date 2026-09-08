package com.example.archonnotesinkcanvas.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "quiz_responses")
data class QuizResponseEntity(
    @PrimaryKey val responseId: String,
    val sessionId: String,
    val questionId: String,
    val attemptNumber: Int = 1,
    val userCanvasStrokes: String = "",
    val isCorrect: Boolean = false,
    val confidenceLevel: String = "confident",  // "guess" | "unsure" | "confident"
    val hintUsed: Boolean = false,
    val timeSpentSeconds: Int = 0,
    val ocrText: String? = null,
    val feedbackProvided: String? = null,
    val nextReviewDate: Long? = null
)
