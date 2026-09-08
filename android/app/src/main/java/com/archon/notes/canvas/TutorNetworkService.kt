package com.archon.notes.canvas

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.client.call.body
import com.example.archonnotesinkcanvas.BuildConfig

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
    private val BASE_URL = BuildConfig.BACKEND_URL
    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

    suspend fun getQuestions(notebookId: String): List<QuizQuestion> = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/notebooks/$notebookId/quiz-questions"
        client.get(url).body()
    }

    suspend fun startAttempt(notebookId: String, questionId: String): QuizAttemptResponse = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/notebooks/$notebookId/quiz-attempts?question_id=$questionId"
        client.post(url).body()
    }

    suspend fun submitAnswer(attemptId: String, questionId: String, latex: String, timeSpent: Int): ValidationResponse = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/quiz-attempts/$attemptId/answers"
        val request = SubmitAnswerRequest(questionId, latex, timeSpent)
        client.post(url) {
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }

    suspend fun getHint(
        attemptId: String,
        questionId: String,
        latex: String,
        level: Int,
        errorType: String?
    ): HintResponse = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/quiz-attempts/$attemptId/hints"
        val request = HintRequest(questionId, latex, level, errorType)
        client.post(url) {
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }

    suspend fun finalizeAttempt(attemptId: String): FinalizeResponse = withContext(Dispatchers.IO) {
        val url = "$BASE_URL/quiz-attempts/$attemptId/finalize"
        client.post(url).body()
    }
}
