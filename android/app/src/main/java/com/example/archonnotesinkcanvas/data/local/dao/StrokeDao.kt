package com.example.archonnotesinkcanvas.data.local.dao

import androidx.room.*
import com.example.archonnotesinkcanvas.data.local.entities.StrokeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface StrokeDao {
    @Query("SELECT * FROM strokes WHERE pageId = :pageId ORDER BY createdAt ASC")
    fun getStrokesForPage(pageId: String): Flow<List<StrokeEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStroke(stroke: StrokeEntity)

    @Update
    suspend fun updateStroke(stroke: StrokeEntity)

    @Query("UPDATE strokes SET ocrStatus = :status WHERE strokeId = :strokeId")
    suspend fun updateOCRStatus(strokeId: String, status: String)

    @Query("UPDATE strokes SET ocrResult = :result, ocrConfidence = :confidence, ocrStatus = :status WHERE strokeId = :strokeId")
    suspend fun updateOCRResult(strokeId: String, result: String, confidence: Float, status: String)

    @Query("DELETE FROM strokes WHERE pageId = :pageId")
    suspend fun deleteStrokesForPage(pageId: String)
}
