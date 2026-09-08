package com.example.archonnotesinkcanvas.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ocr_training_samples")
data class OCRTrainingSampleEntity(
    @PrimaryKey val sampleId: String,
    val notebookId: String,
    val strokeData: String,
    val strokeImageBase64: String? = null,
    val originalOCRText: String,
    val originalOCRConfidence: Float,
    val correctedText: String,
    val userConfidence: String = "certain", // "certain" | "guess"
    val handwritingType: String = "print",  // "print" | "cursive" | "mixed"
    val subject: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val usedInTraining: Boolean = false,
    val trainingCheckpointId: String? = null
)
