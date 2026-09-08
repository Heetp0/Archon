package com.example.archonnotesinkcanvas.data.local.dao

import androidx.room.*
import com.example.archonnotesinkcanvas.data.local.entities.NotebookPageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PageDao {
    @Query("SELECT * FROM notebook_pages WHERE notebookId = :notebookId ORDER BY pageNumber ASC")
    fun getPagesForNotebook(notebookId: String): Flow<List<NotebookPageEntity>>

    @Query("SELECT * FROM notebook_pages WHERE pageId = :pageId LIMIT 1")
    suspend fun getPageById(pageId: String): NotebookPageEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPage(page: NotebookPageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPages(pages: List<NotebookPageEntity>)

    @Update
    suspend fun updatePage(page: NotebookPageEntity)

    @Delete
    suspend fun deletePage(page: NotebookPageEntity)

    @Query("DELETE FROM notebook_pages WHERE pageId = :pageId")
    suspend fun deletePageById(pageId: String)
}
