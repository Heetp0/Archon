package com.example.archonnotesinkcanvas.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ocr_training_checkpoints")
data class OCRTrainingCheckpointEntity(
    @PrimaryKey val checkpointId: String,
    val notebookId: String,
    val trainingDate: Long = System.currentTimeMillis(),
    val samplesUsed: Int,
    val validationAccuracy: Float,
    val checkpointPath: String,
    val modelName: String = "paddleocr_lora_v1",
    val loraRank: Int = 8,
    val loraAlpha: Int = 16,
    val baseModelVersion: String = "paddle-2.8",
    val trainingLoss: Float? = null,
    val isActive: Boolean = false
)
