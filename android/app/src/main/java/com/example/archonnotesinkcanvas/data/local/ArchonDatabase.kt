package com.example.archonnotesinkcanvas.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.archonnotesinkcanvas.data.local.dao.*
import com.example.archonnotesinkcanvas.data.local.entities.*

@Database(
    entities = [
        NotebookEntity::class,
        MessageEntity::class,
        QuizAttemptEntity::class,
        NotebookPageEntity::class,
        StrokeEntity::class,
        QuizSessionEntity::class,
        QuizResponseEntity::class,
        OCRTrainingSampleEntity::class,
        OCRTrainingCheckpointEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class ArchonDatabase : RoomDatabase() {
    abstract fun notebookDao(): NotebookDao
    abstract fun messageDao(): MessageDao
    abstract fun quizAttemptDao(): QuizAttemptDao
    abstract fun pageDao(): PageDao
    abstract fun strokeDao(): StrokeDao
    abstract fun quizSessionDao(): QuizSessionDao
    abstract fun ocrDao(): OCRDao

    companion object {
        @Volatile private var INSTANCE: ArchonDatabase? = null

        fun getInstance(context: Context): ArchonDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    ArchonDatabase::class.java,
                    "archon.db"
                )
                .build().also { INSTANCE = it }
            }
    }
}
