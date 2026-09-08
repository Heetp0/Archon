package com.example.archonnotesinkcanvas.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notebook_pages")
data class NotebookPageEntity(
    @PrimaryKey val pageId: String,
    val notebookId: String,
    val pageNumber: Int,
    val orientation: String = "portrait",      // "portrait" | "landscape"
    val templateType: String = "blank",       // "blank" | "dot" | "ruled" | "cornell"
    val pageColor: String = "#FFFFFF",
    val width: Int = 1080,
    val height: Int = 1920,
    val strokeData: String = "",              // JSON stroke representations
    val backgroundImageUri: String? = null,
    val syncStatus: String = "synced",         // "local" | "syncing" | "synced" | "conflict"
    val lastModified: Long = System.currentTimeMillis(),
    val lastSyncedAt: Long? = null,
    val ocrPendingCount: Int = 0,
    val subject: String = "General",
    val topic: String = "Uncategorized"
)
