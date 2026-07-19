package com.example.archonnotesinkcanvas.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "quiz_attempts")
data class QuizAttemptEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val question: String,
    val correct: Boolean,
    val timestamp: Long = System.currentTimeMillis()
)
