package com.example.archonnotesinkcanvas.ui.main

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.archonnotesinkcanvas.data.local.ArchonDatabase
import com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingCheckpointEntity
import com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingSampleEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

import com.example.archonnotesinkcanvas.BuildConfig

class OCRTrainingViewModel(application: Application) : AndroidViewModel(application) {
    private val ocrDao = ArchonDatabase.getInstance(application).ocrDao()

    private val _totalSamples = MutableStateFlow(0)
    val totalSamples: StateFlow<Int> = _totalSamples.asStateFlow()

    private val _certainUnusedSamples = MutableStateFlow(0)
    val certainUnusedSamples: StateFlow<Int> = _certainUnusedSamples.asStateFlow()

    private val _activeCheckpoint = MutableStateFlow<OCRTrainingCheckpointEntity?>(null)
    val activeCheckpoint: StateFlow<OCRTrainingCheckpointEntity?> = _activeCheckpoint.asStateFlow()

    private val _recentSamples = MutableStateFlow<List<OCRTrainingSampleEntity>>(emptyList())
    val recentSamples: StateFlow<List<OCRTrainingSampleEntity>> = _recentSamples.asStateFlow()

    private val _isTrainingQueued = MutableStateFlow(false)
    val isTrainingQueued: StateFlow<Boolean> = _isTrainingQueued.asStateFlow()

    fun loadStats(notebookId: String = "default_notebook") {
        viewModelScope.launch {
            val count = ocrDao.getSampleCount(notebookId)
            if (count == 0) {
                val initialSamples = listOf(
                    Triple("thrmo dynamic", "thermodynamic", "print"),
                    Triple("eq 1: dU = dQ - dW", "Eq 1: dU = dQ - dW", "print"),
                    Triple("v^2 = mu(2/r - 1/a)", "v² = μ(2/r - 1/a)", "mixed"),
                    Triple("G(s) = Y(s)/U(s)", "G(s) = Y(s) / U(s)", "print")
                )
                initialSamples.forEachIndexed { idx, (orig, corr, style) ->
                    ocrDao.insertSample(
                        OCRTrainingSampleEntity(
                            sampleId = "sample_seed_$idx",
                            notebookId = notebookId,
                            strokeData = "",
                            originalOCRText = orig,
                            originalOCRConfidence = 0.82f,
                            correctedText = corr,
                            userConfidence = "certain",
                            handwritingType = style,
                            createdAt = System.currentTimeMillis() - (idx * 60000L),
                            usedInTraining = false
                        )
                    )
                }
            }
            _totalSamples.value = ocrDao.getSampleCount(notebookId)
            _certainUnusedSamples.value = ocrDao.getUnusedCertainSampleCount(notebookId)
            _recentSamples.value = ocrDao.getRecentSamples(notebookId, 10)
            _activeCheckpoint.value = ocrDao.getActiveCheckpoint(notebookId)
        }
    }

    fun saveOCRCorrection(
        notebookId: String = "default_notebook",
        strokeData: String,
        strokeImageBase64: String? = null,
        originalText: String,
        confidence: Float,
        correctedText: String,
        userConfidence: String = "certain",
        handwritingType: String = "print"
    ) {
        viewModelScope.launch {
            val sample = OCRTrainingSampleEntity(
                sampleId = UUID.randomUUID().toString(),
                notebookId = notebookId,
                strokeData = strokeData,
                strokeImageBase64 = strokeImageBase64,
                originalOCRText = originalText,
                originalOCRConfidence = confidence,
                correctedText = correctedText,
                userConfidence = userConfidence,
                handwritingType = handwritingType,
                createdAt = System.currentTimeMillis(),
                usedInTraining = false
            )
            ocrDao.insertSample(sample)
            loadStats(notebookId)

            if (_certainUnusedSamples.value >= 30) {
                triggerTraining(notebookId)
            }
        }
    }

    fun triggerTraining(notebookId: String = "default_notebook") {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                _isTrainingQueued.value = true
                val backendUrl = "${BuildConfig.BACKEND_URL}/ocr-training/notebooks/$notebookId/train"
                val url = URL(backendUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                val code = connection.responseCode
                if (code in 200..299) {
                    withContext(Dispatchers.Main) {
                        _isTrainingQueued.value = true
                    }
                }
                connection.disconnect()
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                withContext(Dispatchers.Main) {
                    _isTrainingQueued.value = false
                    loadStats(notebookId)
                }
            }
        }
    }
}
