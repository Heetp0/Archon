package com.example.archonnotesinkcanvas.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "quiz_sessions")
data class QuizSessionEntity(
    @PrimaryKey val sessionId: String,
    val notebookId: String,
    val topic: String,
    val sessionStartTime: Long = System.currentTimeMillis(),
    val sessionEndTime: Long? = null,
    val totalQuestionsAttempted: Int = 0,
    val totalCorrect: Int = 0,
    val xpEarned: Int = 0,
    val streak: Int = 0,
    val dailyGoalMet: Boolean = false,
    val difficulty: String = "medium",         // "easy" | "medium" | "hard"
    val sessionType: String = "practice",       // "practice" | "review" | "challenge"
    val feedbackLevel: String = "socratic"     // "minimal" | "socratic" | "detailed"
)
