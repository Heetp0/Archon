package com.example.archonnotesinkcanvas.data.local.dao

import androidx.room.*
import com.example.archonnotesinkcanvas.data.local.entities.QuizAttemptEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface QuizAttemptDao {
    @Query("SELECT * FROM quiz_attempts ORDER BY timestamp DESC")
    fun getAll(): Flow<List<QuizAttemptEntity>>

    @Query("SELECT COUNT(*) FROM quiz_attempts")
    suspend fun totalCount(): Int

    @Query("SELECT COUNT(*) FROM quiz_attempts WHERE correct = 1")
    suspend fun correctCount(): Int

    @Insert
    suspend fun insert(attempt: QuizAttemptEntity)
}
