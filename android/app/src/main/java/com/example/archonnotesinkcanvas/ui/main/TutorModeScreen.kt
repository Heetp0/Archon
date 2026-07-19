package com.example.archonnotesinkcanvas.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.archon.notes.canvas.InkCanvas
import com.archon.notes.canvas.InkStrokeState
import com.archon.notes.canvas.MyScriptOcrService
import com.archon.notes.canvas.StrokeSerialization
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TutorModeScreen(
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TutorViewModel = viewModel()
) {
    val coroutineScope = rememberCoroutineScope()
    val questions by viewModel.questions.collectAsState()
    val currentIdx by viewModel.currentQuestionIndex.collectAsState()
    val status by viewModel.status.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val hintText by viewModel.hintText.collectAsState()
    val ocrText by viewModel.ocrText.collectAsState()
    val isCorrect by viewModel.isCorrect.collectAsState()
    val hintsRequested by viewModel.hintsRequested.collectAsState()
    val qualityScore by viewModel.qualityScore.collectAsState()
    val nextReviewDays by viewModel.nextReviewDays.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    val inkState = remember { InkStrokeState() }
    var showManualEditDialog by remember { mutableStateOf(false) }
    var manualInputText by remember { mutableStateOf("") }
    
    // Timer to track time spent
    var startTime by remember { mutableStateOf(System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        viewModel.loadQuestions()
    }

    LaunchedEffect(currentIdx) {
        inkState.clearAll()
        startTime = System.currentTimeMillis()
    }

    val currentQuestion = questions.getOrNull(currentIdx)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Archon Tutor Mode", fontSize = 18.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    TextButton(onClick = onBackClick) {
                        Text("< Back", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (isLoading && status == "IDLE") {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (status == "EMPTY") {
                Text(
                    "No quiz questions available. Please ingest notes or create questions.",
                    modifier = Modifier.align(Alignment.Center).padding(16.dp)
                )
            } else if (status == "COMPLETE") {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("All questions completed!", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = onBackClick) {
                        Text("Back to Dashboard")
                    }
                }
            } else if (currentQuestion != null) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Question Header Card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Badge(
                                    containerColor = if (currentQuestion.topic == "calculus") Color(0xFF00796B) else Color(0xFF5E35B1)
                                ) {
                                    Text(currentQuestion.topic.uppercase(), color = Color.White, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 4.dp))
                                }
                                Text("Q ${currentIdx + 1}/${questions.size}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(currentQuestion.question_text, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                        }
                    }

                    // Canvas & Overlay
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .border(1.dp, Color.LightGray, RoundedCornerShape(8.dp))
                            .background(Color.White, RoundedCornerShape(8.dp))
                    ) {
                        // Drawing Canvas Component
                        InkCanvas(
                            state = inkState,
                            modifier = Modifier.fillMaxSize(),
                            onStrokeAdded = {
                                val strokes = inkState.strokes
                                if (strokes.isNotEmpty()) {
                                    coroutineScope.launch {
                                        try {
                                            val bytes = StrokeSerialization.serialize(strokes)
                                            val resp = MyScriptOcrService.saveStrokesAndTriggerOcr(
                                                notebookId = "default_notebook",
                                                pageId = "tutor_temp_page",
                                                binaryStrokes = bytes,
                                                mode = "math"
                                            )
                                            val jobId = resp.ocr_job_id
                                            if (jobId != null) {
                                                // Poll status
                                                var finished = false
                                                var attemptsLeft = 5
                                                while (!finished && attemptsLeft > 0) {
                                                    val statusResp = MyScriptOcrService.getJobStatus(jobId)
                                                    if (statusResp.status == "completed") {
                                                        viewModel.updateOcrText(statusResp.result?.latex ?: statusResp.result?.text ?: "")
                                                        finished = true
                                                    }
                                                    attemptsLeft--
                                                    kotlinx.coroutines.delay(1000)
                                                }
                                            }
                                        } catch (e: Exception) {
                                            // Silently ignore
                                        }
                                    }
                                }
                            }
                        )

                        // Socratic Hint Alert Overlay
                        if (hintText != null) {
                            Card(
                                modifier = Modifier
                                    .align(Alignment.TopCenter)
                                    .fillMaxWidth()
                                    .padding(8.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF9C4)) // Socratic tutor light yellow
                            ) {
                                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text("Hint: " + (hintText ?: ""), fontSize = 13.sp, color = Color.Black, fontWeight = FontWeight.Medium)
                                }
                            }
                        }

                        // Loader Indicator Overlay
                        if (isLoading) {
                            LinearProgressIndicator(modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter))
                        }
                    }

                    // OCR Live stream / Correct/Incorrect feedback
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = when (isCorrect) {
                                true -> Color(0xFFE8F5E9)
                                false -> Color(0xFFFFEBEE)
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        )
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("Handwritten LaTeX output preview:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = ocrText.ifEmpty { "(Write math answer in canvas...)" },
                                    fontSize = 14.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = if (ocrText.isEmpty()) Color.Gray else Color.Black,
                                    modifier = Modifier.weight(1f)
                                )
                                TextButton(
                                    onClick = {
                                        manualInputText = ocrText
                                        showManualEditDialog = true
                                    }
                                ) {
                                    Text("Edit")
                                }
                            }
                            
                            feedback?.let { msg ->
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = msg,
                                    color = if (isCorrect == true) Color(0xFF2E7D32) else Color(0xFFC62828),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    // Button Action Rows
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (status == "IN_PROGRESS" || status == "INCORRECT") {
                            Button(
                                onClick = {
                                    val elapsed = ((System.currentTimeMillis() - startTime) / 1000).toInt()
                                    viewModel.submitAnswer(ocrText, elapsed)
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Submit Answer")
                            }
                            
                            if (status == "INCORRECT" && hintsRequested < 3) {
                                Button(
                                    onClick = { viewModel.requestHint() },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Get Socratic Hint (${hintsRequested}/3)")
                                }
                            }
                        } else if (status == "CORRECT") {
                            Button(
                                onClick = { viewModel.finalizeAttempt() },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                            ) {
                                Text("Lock In & Finalize (SM-2)")
                            }
                        } else if (status == "FINALIZED") {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                            ) {
                                Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Attempt Locked In!", fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                                    Text("Quality Score: ${qualityScore}/5 | Spaced Repetition interval: ${nextReviewDays} days", fontSize = 12.sp)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Button(
                                        onClick = { viewModel.nextQuestion() },
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text("Next Question")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Manual LaTeX Input Edit Dialog
    if (showManualEditDialog) {
        AlertDialog(
            onDismissRequest = { showManualEditDialog = false },
            title = { Text("Manual LaTeX correction") },
            text = {
                OutlinedTextField(
                    value = manualInputText,
                    onValueChange = { manualInputText = it },
                    label = { Text("Edit formula LaTeX") },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace)
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.updateOcrText(manualInputText)
                        showManualEditDialog = false
                    }
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showManualEditDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
