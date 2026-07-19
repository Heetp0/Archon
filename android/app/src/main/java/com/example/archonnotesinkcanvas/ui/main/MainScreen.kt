package com.example.archonnotesinkcanvas.ui.main

import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.archon.notes.canvas.InkCanvas
import com.archon.notes.canvas.InkStrokeState
import com.archon.notes.canvas.StrokeSerialization
import com.archon.notes.canvas.MyScriptOcrService
import com.archon.notes.canvas.OcrResultData
import com.archon.notes.canvas.OcrTokenData
import androidx.ink.strokes.Stroke
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onItemClick: (androidx.navigation3.runtime.NavKey) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val notebookId = "default_notebook"
    var currentPageId by remember { mutableStateOf("page_1") }
    var syncStatus by remember { mutableStateOf("Synced") }
    
    // OCR States
    var ocrJobId by remember { mutableStateOf<String?>(null) }
    var ocrStatus by remember { mutableStateOf("") }
    var ocrResult by remember { mutableStateOf<OcrResultData?>(null) }

    val strokeState = remember { InkStrokeState() }
    var triggerSyncCounter by remember { mutableStateOf(0) }
    var dropdownExpanded by remember { mutableStateOf(false) }

    val pages = remember { mutableStateListOf("page_1", "page_2", "page_3") }
    val coroutineScope = rememberCoroutineScope()

    // Handle initial page load and switcher page load
    LaunchedEffect(currentPageId) {
        loadStrokesFromLocal(context, currentPageId, strokeState)
        ocrResult = null
        ocrStatus = ""
        ocrJobId = null
        syncPage(context, notebookId, currentPageId, strokeState, onStatusChanged = { syncStatus = it }) { jobId ->
            ocrJobId = jobId
        }
    }

    // Sync debouncing when stroke counter increments
    LaunchedEffect(triggerSyncCounter) {
        if (triggerSyncCounter == 0) return@LaunchedEffect
        delay(1500L)
        syncPage(context, notebookId, currentPageId, strokeState, onStatusChanged = { syncStatus = it }) { jobId ->
            ocrJobId = jobId
        }
    }

    // Poll OCR job status on job ID changes
    LaunchedEffect(ocrJobId) {
        val jobId = ocrJobId ?: return@LaunchedEffect
        ocrStatus = "OCR Queued..."
        try {
            while (true) {
                val statusResp = MyScriptOcrService.getJobStatus(jobId)
                ocrStatus = "OCR: %"
                if (statusResp.status == "completed") {
                    ocrResult = statusResp.result
                    ocrStatus = "OCR Completed"
                    break
                } else if (statusResp.status == "failed") {
                    ocrStatus = "OCR Failed: "
                    break
                }
                delay(800L)
            }
        } catch (e: Exception) {
            ocrStatus = "OCR Status Offline"
        }
    }

    Column(modifier = modifier.fillMaxSize()) {
        // Page switcher Row
        Row(
            modifier = Modifier.fillMaxWidth().padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Box {
                Button(onClick = { dropdownExpanded = true }) {
                    Text("Page: ")
                }
                DropdownMenu(
                    expanded = dropdownExpanded,
                    onDismissRequest = { dropdownExpanded = false }
                ) {
                    pages.forEach { pageId ->
                        DropdownMenuItem(
                            text = { Text(pageId) },
                            onClick = {
                                dropdownExpanded = false
                                if (currentPageId != pageId) {
                                    saveStrokesToLocal(context, currentPageId, strokeState.strokes)
                                    currentPageId = pageId
                                }
                            }
                        )
                    }
                }
            }

            Button(onClick = {
                val newPageId = "page_" + (pages.size + 1)
                pages.add(newPageId)
                saveStrokesToLocal(context, currentPageId, strokeState.strokes)
                currentPageId = newPageId
            }) {
                Text("Add Page")
            }
            
            Button(
                onClick = { onItemClick(com.example.archonnotesinkcanvas.Tutor) },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
            ) {
                Text("Tutor Mode")
            }
        }

        // Status Indicators Row
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Sync: ",
                style = MaterialTheme.typography.bodyMedium,
                color = if (syncStatus.contains("Error")) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
            )
            
            if (ocrStatus.isNotEmpty()) {
                Text(
                    text = ocrStatus,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.secondary
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Drawing Canvas
        Box(modifier = Modifier.weight(1.5f)) {
            InkCanvas(
                state = strokeState,
                modifier = Modifier.fillMaxSize(),
                onStrokeAdded = {
                    triggerSyncCounter++
                }
            )
        }

        // OCR Result Review Panel
        ocrResult?.let { result ->
            HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                RecognitionResultPanel(
                    ocrResult = result,
                    onCorrectionSubmitted = { original, corrected ->
                        // Log and send correction to server
                        coroutineScope.launch {
                            val success = MyScriptOcrService.sendCorrection(
                                notebookId = notebookId,
                                pageId = currentPageId,
                                originalToken = original,
                                correctedToken = corrected,
                                confidence = 1.0f
                            )
                            if (success) {
                                // Apply update locally to UI state
                                val updatedTokens = result.tokens?.map { token ->
                                    if (token.text == original) token.copy(text = corrected, confidence = 1.0f) else token
                                }
                                ocrResult = result.copy(
                                    text = result.text.replace(original, corrected),
                                    tokens = updatedTokens
                                )
                            }
                        }
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RecognitionResultPanel(
    ocrResult: OcrResultData,
    onCorrectionSubmitted: (original: String, corrected: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedToken by remember { mutableStateOf<OcrTokenData?>(null) }
    var correctionText by remember { mutableStateOf("") }
    var showDialog by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxWidth().padding(12.dp)) {
        Text(
            text = "Handwriting OCR Review (Tap Low-Confidence Words):",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary
        )
        
        Spacer(modifier = Modifier.height(8.dp))

        if (!ocrResult.latex.isNullOrBlank()) {
            Surface(
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.secondaryContainer
            ) {
                Text(
                    text = "LaTeX Formula: {ocrResult.latex}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.padding(8.dp)
                )
            }
        }

        val tokens = ocrResult.tokens
        if (!tokens.isNullOrEmpty()) {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                tokens.forEach { token ->
                    val isLowConfidence = token.confidence < 0.7f
                    Surface(
                        onClick = {
                            selectedToken = token
                            correctionText = token.text
                            showDialog = true
                        },
                        shape = MaterialTheme.shapes.extraSmall,
                        color = if (isLowConfidence) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant,
                        tonalElevation = 1.dp
                    ) {
                        Text(
                            text = token.text,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isLowConfidence) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            // Fallback plain text display
            Text(
                text = ocrResult.text,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }

    if (showDialog && selectedToken != null) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Correct Token") },
            text = {
                Column {
                    Text(
                        text = "Original: \"\" (Confidence: %)",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = correctionText,
                        onValueChange = { correctionText = it },
                        label = { Text("Corrected value") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDialog = false
                        if (correctionText.trim().isNotEmpty() && correctionText != selectedToken!!.text) {
                            onCorrectionSubmitted(selectedToken!!.text, correctionText.trim())
                        }
                    }
                ) {
                    Text("Apply")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

private fun saveStrokesToLocal(context: Context, pageId: String, strokes: List<Stroke>) {
    val file = File(context.filesDir, "strokes/.bin")
    file.parentFile?.mkdirs()
    val bytes = StrokeSerialization.serialize(strokes)
    file.writeBytes(bytes)
}

private fun loadStrokesFromLocal(context: Context, pageId: String, strokeState: InkStrokeState) {
    val file = File(context.filesDir, "strokes/.bin")
    if (file.exists()) {
        val bytes = file.readBytes()
        val strokes = StrokeSerialization.deserialize(bytes)
        strokeState.setStrokes(strokes)
    } else {
        strokeState.clearAll()
    }
}

private suspend fun syncPage(
    context: Context,
    notebookId: String,
    pageId: String,
    strokeState: InkStrokeState,
    onStatusChanged: (String) -> Unit,
    onOcrJobTriggered: (String) -> Unit
) {
    onStatusChanged("Syncing...")
    val strokes = strokeState.strokes
    val bytes = StrokeSerialization.serialize(strokes)
    saveStrokesToLocal(context, pageId, strokes)

    try {
        val response = MyScriptOcrService.saveStrokesAndTriggerOcr(
            notebookId = notebookId,
            pageId = pageId,
            binaryStrokes = bytes,
            mode = "text"
        )
        
        onStatusChanged("Synced")
        response.ocr_job_id?.let { jobId ->
            onOcrJobTriggered(jobId)
        }
    } catch (e: Exception) {
        onStatusChanged("Offline / Sync Error")
    }
}
