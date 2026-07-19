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

@Serializable
data class ChatRequest(val message: String)

@Serializable
data class ChatResponse(val response: String)

object ArchonApiClient {
    private lateinit var store: BackendConfigStore

    fun init(store: BackendConfigStore) {
        this.store = store
    }

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
            })
        }
    }

    suspend fun chat(message: String, token: String): String {
        val baseUrl = store.getBackendUrlSnapshot()
        val request = ChatRequest(message)
        val response = client.post("$baseUrl/chat") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody(request)
        }
        return response.body<ChatResponse>().response
    }

    suspend fun health(): Boolean {
        val baseUrl = store.getBackendUrlSnapshot()
        return try {
            client.get("$baseUrl/health").status == HttpStatusCode.OK
        } catch (e: Exception) {
            false
        }
    }
}
