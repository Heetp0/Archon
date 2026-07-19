package com.archon.notes.canvas

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Serializable
data class BoundingBoxData(val x: Float, val y: Float, val width: Float, val height: Float)

@Serializable
data class OcrTokenData(val text: String, val confidence: Float, val bbox: BoundingBoxData? = null)

@Serializable
data class OcrResultData(val text: String, val latex: String? = null, val confidence: Float, val tokens: List<OcrTokenData>? = null)

@Serializable
data class JobStatusResponse(val job_id: String, val status: String, val progress: Int, val result: OcrResultData? = null, val error: String? = null)

@Serializable
data class SaveStrokesResponse(val status: String, val page_id: String, val ocr_job_id: String? = null)

@Serializable
data class CorrectionRequest(val original_token: String, val corrected_token: String, val confidence: Float)

object MyScriptOcrService {
    private const val BASE_URL = "http://10.0.2.2:8000"
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun saveStrokesAndTriggerOcr(
        notebookId: String,
        pageId: String,
        binaryStrokes: ByteArray,
        mode: String = "text"
    ): SaveStrokesResponse = withContext(Dispatchers.IO) {
        val url = "/notebooks//pages//strokes?ocr_requested=true&mode="
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/octet-stream")
            conn.doOutput = true
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            conn.outputStream.use { out ->
                out.write(binaryStrokes)
            }
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val respText = conn.inputStream.use { it.readBytes().decodeToString() }
                return@withContext json.decodeFromString<SaveStrokesResponse>(respText)
            } else {
                throw IOException("Server returned HTTP error code: ")
            }
        } finally {
            conn.disconnect()
        }
    }

    suspend fun getJobStatus(jobId: String): JobStatusResponse = withContext(Dispatchers.IO) {
        val url = "/jobs/"
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "GET"
            conn.connectTimeout = 3000
            conn.readTimeout = 3000
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val respText = conn.inputStream.use { it.readBytes().decodeToString() }
                return@withContext json.decodeFromString<JobStatusResponse>(respText)
            } else {
                throw IOException("Server returned HTTP error code: ")
            }
        } finally {
            conn.disconnect()
        }
    }

    suspend fun sendCorrection(
        notebookId: String,
        pageId: String,
        originalToken: String,
        correctedToken: String,
        confidence: Float
    ): Boolean = withContext(Dispatchers.IO) {
        val url = "/notebooks//pages//corrections"
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 3000
            conn.readTimeout = 3000
            
            val request = CorrectionRequest(originalToken, correctedToken, confidence)
            val jsonBody = json.encodeToString(request)
            
            conn.outputStream.use { out ->
                out.write(jsonBody.toByteArray(Charsets.UTF_8))
            }
            return@withContext conn.responseCode == HttpURLConnection.HTTP_OK
        } catch (e: Exception) {
            return@withContext false
        } finally {
            conn.disconnect()
        }
    }
}
