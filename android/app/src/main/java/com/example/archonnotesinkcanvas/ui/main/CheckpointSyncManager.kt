package com.example.archonnotesinkcanvas.ui.main

import android.content.Context
import com.example.archonnotesinkcanvas.data.local.ArchonDatabase
import com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingCheckpointEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

import com.example.archonnotesinkcanvas.BuildConfig

class CheckpointSyncManager(
    private val context: Context,
    private val notebookId: String = "default_notebook"
) {
    suspend fun syncLatestCheckpoint(): Boolean = withContext(Dispatchers.IO) {
        val db = ArchonDatabase.getInstance(context)
        try {
            val endpoint = "${BuildConfig.BACKEND_URL}/ocr-training/notebooks/$notebookId/checkpoint"
            val url = URL(endpoint)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 5000

            if (connection.responseCode == 200) {
                val jsonStr = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(jsonStr)

                if (json.optString("status") == "available") {
                    val checkpointId = json.getString("checkpoint_id")
                    val valAcc = json.getDouble("validation_accuracy").toFloat()
                    val samplesUsed = json.getInt("samples_used")
                    val downloadUrl = json.getString("download_url")

                    val downloadConn = URL("${BuildConfig.BACKEND_URL}$downloadUrl").openConnection() as HttpURLConnection
                    val bytes = downloadConn.inputStream.use { it.readBytes() }

                    val engine = OCRInferenceEngine(context, notebookId)
                    engine.installCheckpoint(bytes)

                    db.ocrDao().deactivateCheckpoints(notebookId)
                    db.ocrDao().insertCheckpoint(
                        OCRTrainingCheckpointEntity(
                            checkpointId = checkpointId,
                            notebookId = notebookId,
                            samplesUsed = samplesUsed,
                            validationAccuracy = valAcc,
                            checkpointPath = "ocr_checkpoints/$notebookId/adapter.bin",
                            isActive = true
                        )
                    )
                    db.ocrDao().markSamplesAsUsed(notebookId, checkpointId)
                    return@withContext true
                }
            }
            connection.disconnect()
            return@withContext false
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
}
