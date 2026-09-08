package com.example.archonnotesinkcanvas.data.local.dao

import androidx.room.*
import com.example.archonnotesinkcanvas.data.local.entities.QuizResponseEntity
import com.example.archonnotesinkcanvas.data.local.entities.QuizSessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface QuizSessionDao {
    @Query("SELECT * FROM quiz_sessions ORDER BY sessionStartTime DESC")
    fun getAllSessions(): Flow<List<QuizSessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: QuizSessionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertResponse(response: QuizResponseEntity)

    @Query("SELECT * FROM quiz_responses WHERE sessionId = :sessionId")
    suspend fun getResponsesForSession(sessionId: String): List<QuizResponseEntity>

    @Query("SELECT * FROM quiz_responses WHERE nextReviewDate <= :currentTime")
    suspend fun getDueReviews(currentTime: Long = System.currentTimeMillis()): List<QuizResponseEntity>
}
