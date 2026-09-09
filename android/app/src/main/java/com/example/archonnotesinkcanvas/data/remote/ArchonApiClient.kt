package com.example.archonnotesinkcanvas.data.remote

import io.ktor.client.*
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.client.call.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import com.example.archonnotesinkcanvas.BuildConfig

@Serializable
data class ChatRequest(val message: String)

@Serializable
data class ChatResponse(val response: String)

// Notebook RAG Models
@Serializable
data class NotebookItem(
    val id: String? = null,
    val notebook_id: String? = null,
    val name: String? = null,
    val created_at: Double? = null
) {
    val displayId: String get() = id ?: notebook_id ?: "default"
    val displayName: String get() = name ?: "Untitled Notebook"
}

@Serializable
data class SourcesResponse(
    val notebook_id: String? = null,
    val sources: List<String> = emptyList()
)

@Serializable
data class AddSourceRequest(
    val source_type: String = "pdf",
    val file_path: String,
    val metadata: Map<String, String> = emptyMap()
)

@Serializable
data class AddSourceResponse(
    val job_id: String? = null,
    val status: String? = null
)

@Serializable
data class RAGQueryRequest(
    val query: String,
    val stream: Boolean = false,
    val top_k: Int = 5
)

@Serializable
data class RAGQueryResponse(
    val response: String = "",
    val citations: List<JsonObject> = emptyList()
)

// Dashboard Metrics and Load Models
@Serializable
data class MetricsSummaryResponse(
    val period: String = "1h",
    val avg_latency_ms: Float = 0.0f,
    val total_tokens: Long = 0L,
    val cache_hit_rate: Float = 0.0f,
    val total_requests: Long = 0L,
    val error_rate: Float = 0.0f,
    val uptime_percent: Float = 100.0f,
    val estimated_cost: Double = 0.0,
    val provider_usage: Map<String, Long> = emptyMap()
)

@Serializable
data class HealthLoadResponse(
    val cpu_percent: Float = 0.0f,
    val ram_percent: Float = 0.0f,
    val overall_load: Float = 0.0f,
    val timestamp: String? = null
)

object ArchonApiClient {
    @Volatile
    private var store: BackendConfigStore? = null

    fun init(store: BackendConfigStore) {
        this.store = store
    }

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    val client = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(json)
        }
    }

    suspend fun getBaseUrl(): String {
        return try {
            store?.getBackendUrlSnapshot() ?: BuildConfig.BACKEND_URL
        } catch (e: Exception) {
            BuildConfig.BACKEND_URL
        }
    }

    suspend fun chat(message: String, token: String): String {
        val baseUrl = getBaseUrl()
        val request = ChatRequest(message)
        val response = client.post("$baseUrl/chat") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody(request)
        }
        return response.body<ChatResponse>().response
    }

    suspend fun health(): Boolean {
        val baseUrl = getBaseUrl()
        return try {
            client.get("$baseUrl/health").status == HttpStatusCode.OK
        } catch (e: Exception) {
            false
        }
    }

    // --- Notebook RAG Endpoints ---
    suspend fun getNotebooks(): List<NotebookItem> {
        val baseUrl = getBaseUrl()
        val response = client.get("$baseUrl/notebooks")
        return response.body()
    }

    suspend fun getNotebookSources(notebookId: String): List<String> {
        val baseUrl = getBaseUrl()
        val response = client.get("$baseUrl/notebooks/$notebookId/sources")
        val body = response.body<SourcesResponse>()
        return body.sources
    }

    suspend fun addNotebookSource(notebookId: String, sourceType: String, filePath: String): AddSourceResponse {
        val baseUrl = getBaseUrl()
        val request = AddSourceRequest(source_type = sourceType, file_path = filePath)
        val response = client.post("$baseUrl/notebooks/$notebookId/sources") {
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        return response.body()
    }

    suspend fun queryNotebookRAG(notebookId: String, query: String): String {
        val baseUrl = getBaseUrl()
        val request = RAGQueryRequest(query = query, stream = false)
        val response = client.post("$baseUrl/notebooks/$notebookId/chat") {
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        val result = response.body<RAGQueryResponse>()
        return result.response
    }

    // --- Dashboard Endpoints ---
    suspend fun getMetricsSummary(period: String = "1h"): MetricsSummaryResponse {
        val baseUrl = getBaseUrl()
        val response = client.get("$baseUrl/metrics/summary?period=$period")
        return response.body()
    }

    suspend fun getHealthLoad(): HealthLoadResponse {
        val baseUrl = getBaseUrl()
        val response = client.get("$baseUrl/health/load")
        return response.body()
    }
}
