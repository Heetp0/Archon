package com.example.archonnotesinkcanvas.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "strokes")
data class StrokeEntity(
    @PrimaryKey val strokeId: String,
    val pageId: String,
    val notebookId: String,
    val pathDataJson: String,
    val tool: String = "pen",                 // "pen" | "pencil" | "highlighter" | "eraser" | "lasso"
    val color: String = "#000000",
    val strokeWidth: Float = 3f,
    val opacity: Float = 1.0f,
    val createdAt: Long = System.currentTimeMillis(),
    val ocrStatus: String = "done",           // "pending" | "processing" | "done" | "failed"
    val ocrResult: String? = null,
    val ocrConfidence: Float = 0.95f,
    val syncStatus: String = "synced",         // "local" | "syncing" | "synced" | "conflict"
    val syncedAt: Long? = null
)
