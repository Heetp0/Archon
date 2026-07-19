package com.example.archonnotesinkcanvas.data.local.dao

import androidx.room.*
import com.example.archonnotesinkcanvas.data.local.entities.NotebookEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NotebookDao {
    @Query("SELECT * FROM notebooks ORDER BY updatedAt DESC")
    fun getAll(): Flow<List<NotebookEntity>>

    @Upsert
    suspend fun upsert(notebook: NotebookEntity)

    @Delete
    suspend fun delete(notebook: NotebookEntity)
}
