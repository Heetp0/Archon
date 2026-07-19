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
data class QuizQuestion(
    val question_id: String,
    val notebook_id: String,
    val topic: String,
    val difficulty: Int,
    val question_text: String,
    val question_latex: String,
    val expected_answer_latex: String,
    val answer_numeric: Double? = null,
    val answer_units: String? = null,
    val explanation: String,
    val source: String
)

@Serializable
data class QuizAttemptResponse(
    val attempt_id: String,
    val status: String,
    val attempt_number: Int
)

@Serializable
data class SubmitAnswerRequest(
    val question_id: String,
    val student_answer_latex: String,
    val time_spent_seconds: Int
)

@Serializable
data class FeedbackData(
    val type: String,
    val message: String
)

@Serializable
data class ValidationResponse(
    val is_correct: Boolean?,
    val is_partial: Boolean = false,
    val score: Float = 0.0f,
    val error_type: String? = null,
    val student_simplified: String = "",
    val expected_simplified: String = "",
    val feedback: FeedbackData? = null
)

@Serializable
data class HintRequest(
    val question_id: String,
    val student_answer_latex: String,
    val current_hint_level: Int,
    val error_type: String? = null
)

@Serializable
data class HintResponse(
    val hint_level: Int,
    val hint_text: String,
    val can_request_stronger_hint: Boolean
)

@Serializable
data class FinalizeResponse(
    val status: String,
    val quality_score: Int,
    val next_review_interval_days: Int,
    val next_review_date: Double
)

object TutorNetworkService {
    private const val BASE_URL = "http://10.0.2.2:8000"
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun getQuestions(notebookId: String): List<QuizQuestion> = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/notebooks/$notebookId/quiz-questions"
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "GET"
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val respText = conn.inputStream.use { it.readBytes().decodeToString() }
                return@withContext json.decodeFromString<List<QuizQuestion>>(respText)
            } else {
                throw IOException("Server returned HTTP error code: ${conn.responseCode}")
            }
        } finally {
            conn.disconnect()
        }
    }

    suspend fun startAttempt(notebookId: String, questionId: String): QuizAttemptResponse = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/notebooks/$notebookId/quiz-attempts?question_id=$questionId"
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val respText = conn.inputStream.use { it.readBytes().decodeToString() }
                return@withContext json.decodeFromString<QuizAttemptResponse>(respText)
            } else {
                throw IOException("Server returned HTTP error code: ${conn.responseCode}")
            }
        } finally {
            conn.disconnect()
        }
    }

    suspend fun submitAnswer(attemptId: String, questionId: String, latex: String, timeSpent: Int): ValidationResponse = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/quiz-attempts/$attemptId/answers"
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            
            val request = SubmitAnswerRequest(questionId, latex, timeSpent)
            val jsonBody = json.encodeToString(request)
            
            conn.outputStream.use { out ->
                out.write(jsonBody.toByteArray(Charsets.UTF_8))
            }
            
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val respText = conn.inputStream.use { it.readBytes().decodeToString() }
                return@withContext json.decodeFromString<ValidationResponse>(respText)
            } else {
                throw IOException("Server returned HTTP error code: ${conn.responseCode}")
            }
        } finally {
            conn.disconnect()
        }
    }

    suspend fun getHint(
        attemptId: String,
        questionId: String,
        latex: String,
        level: Int,
        errorType: String?
    ): HintResponse = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/quiz-attempts/$attemptId/hints"
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            
            val request = HintRequest(questionId, latex, level, errorType)
            val jsonBody = json.encodeToString(request)
            
            conn.outputStream.use { out ->
                out.write(jsonBody.toByteArray(Charsets.UTF_8))
            }
            
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val respText = conn.inputStream.use { it.readBytes().decodeToString() }
                return@withContext json.decodeFromString<HintResponse>(respText)
            } else {
                throw IOException("Server returned HTTP error code: ${conn.responseCode}")
            }
        } finally {
            conn.disconnect()
        }
    }

    suspend fun finalizeAttempt(attemptId: String): FinalizeResponse = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/quiz-attempts/$attemptId/finalize"
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val respText = conn.inputStream.use { it.readBytes().decodeToString() }
                return@withContext json.decodeFromString<FinalizeResponse>(respText)
            } else {
                throw IOException("Server returned HTTP error code: ${conn.responseCode}")
            }
        } finally {
            conn.disconnect()
        }
    }
}
