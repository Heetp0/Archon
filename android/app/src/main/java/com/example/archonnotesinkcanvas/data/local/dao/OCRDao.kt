package com.example.archonnotesinkcanvas.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingCheckpointEntity
import com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingSampleEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OCRDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSample(sample: OCRTrainingSampleEntity)

    @Query("SELECT COUNT(*) FROM ocr_training_samples WHERE notebookId = :notebookId")
    suspend fun getSampleCount(notebookId: String): Int

    @Query("SELECT COUNT(*) FROM ocr_training_samples WHERE notebookId = :notebookId AND usedInTraining = 0 AND userConfidence = 'certain'")
    suspend fun getUnusedCertainSampleCount(notebookId: String): Int

    @Query("SELECT * FROM ocr_training_samples WHERE notebookId = :notebookId ORDER BY createdAt DESC LIMIT :limit")
    fun getRecentSamplesFlow(notebookId: String, limit: Int = 10): Flow<List<OCRTrainingSampleEntity>>

    @Query("SELECT * FROM ocr_training_samples WHERE notebookId = :notebookId ORDER BY createdAt DESC LIMIT :limit")
    suspend fun getRecentSamples(notebookId: String, limit: Int = 10): List<OCRTrainingSampleEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCheckpoint(checkpoint: OCRTrainingCheckpointEntity)

    @Query("UPDATE ocr_training_checkpoints SET isActive = 0 WHERE notebookId = :notebookId")
    suspend fun deactivateCheckpoints(notebookId: String)

    @Query("SELECT * FROM ocr_training_checkpoints WHERE notebookId = :notebookId AND isActive = 1 LIMIT 1")
    fun getActiveCheckpointFlow(notebookId: String): Flow<OCRTrainingCheckpointEntity?>

    @Query("SELECT * FROM ocr_training_checkpoints WHERE notebookId = :notebookId AND isActive = 1 LIMIT 1")
    suspend fun getActiveCheckpoint(notebookId: String): OCRTrainingCheckpointEntity?

    @Query("UPDATE ocr_training_samples SET usedInTraining = 1, trainingCheckpointId = :checkpointId WHERE notebookId = :notebookId AND usedInTraining = 0")
    suspend fun markSamplesAsUsed(notebookId: String, checkpointId: String)
}
