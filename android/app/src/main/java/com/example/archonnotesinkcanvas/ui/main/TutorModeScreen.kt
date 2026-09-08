package com.example.archonnotesinkcanvas.ui.main

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.archon.notes.canvas.InkCanvas
import com.archon.notes.canvas.InkStrokeState
import com.archon.notes.canvas.MyScriptOcrService
import com.archon.notes.canvas.QuizQuestion
import com.archon.notes.canvas.StrokeSerialization
import com.example.archonnotesinkcanvas.ui.canvas.FloatingToolbar
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ─── Design Tokens ───────────────────────────────────────────────────────────
private val ScreenBg = Color(0xFF0A0A0A)
private val SurfaceCard = Color(0xFF111111)
private val SurfaceCardBorder = Color(0xFF1F1F1F)
private val AccentGreen = Color(0xFF22C55E)
private val SuccessGreen = Color(0xFF15803D)
private val SuccessContainer = Color(0xFF0D2818)
private val ErrorRed = Color(0xFFDC2626)
private val ErrorContainer = Color(0xFF2D1212)
private val HintYellow = Color(0xFFEAB308)
private val HintContainer = Color(0xFF2A240E)
private val TextPrimary = Color(0xFFF3F4F6)
private val TextSecondary = Color(0xFF9CA3AF)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TutorModeScreen(
    onBackClick: () -> Unit,
    windowSizeClass: WindowSizeClass? = null,
    modifier: Modifier = Modifier,
    viewModel: TutorViewModel = viewModel()
) {
    val coroutineScope = rememberCoroutineScope()
    val screenState by viewModel.screenState.collectAsState()
    val questions by viewModel.questions.collectAsState()
    val currentIdx by viewModel.currentQuestionIndex.collectAsState()
    val status by viewModel.status.collectAsState()
    val feedback by viewModel.feedback.collectAsState()
    val hintText by viewModel.hintText.collectAsState()
    val ocrText by viewModel.ocrText.collectAsState()
    val ocrConfidence by viewModel.ocrConfidence.collectAsState()
    val showDisagreementDialog by viewModel.showDisagreementDialog.collectAsState()
    val myScriptResult by viewModel.myScriptResult.collectAsState()
    val customResult by viewModel.customResult.collectAsState()
    val isCorrect by viewModel.isCorrect.collectAsState()
    val hintsRequested by viewModel.hintsRequested.collectAsState()
    val qualityScore by viewModel.qualityScore.collectAsState()
    val nextReviewDays by viewModel.nextReviewDays.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val streakCount by viewModel.streakCount.collectAsState()
    val topicMasteryList by viewModel.topicMasteryList.collectAsState()
    val correctCount by viewModel.correctCount.collectAsState()
    val totalAnswered by viewModel.totalAnswered.collectAsState()

    val inkState = remember { InkStrokeState() }
    var showManualEditDialog by remember { mutableStateOf(false) }
    var manualInputText by remember { mutableStateOf("") }
    var selectedTool by remember { mutableStateOf("pen") }
    var selectedColor by remember { mutableStateOf(Color.White) }
    var strokeWidth by remember { mutableStateOf(5f) }

    // Timer tracking
    var startTime by remember { mutableStateOf(System.currentTimeMillis()) }
    var elapsedSeconds by remember { mutableStateOf(0) }

    LaunchedEffect(screenState, currentIdx) {
        if (screenState == TutorScreenState.QUIZ) {
            inkState.clearAll()
            startTime = System.currentTimeMillis()
            elapsedSeconds = 0
            while (true) {
                delay(1000)
                elapsedSeconds = ((System.currentTimeMillis() - startTime) / 1000).toInt()
            }
        }
    }

    val currentQuestion = questions.getOrNull(currentIdx)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(ScreenBg)
    ) {
        AnimatedContent(
            targetState = screenState,
            transitionSpec = {
                fadeIn(animationSpec = tween(300)) togetherWith fadeOut(animationSpec = tween(200))
            },
            label = "tutor_screen_transition"
        ) { targetState ->
            when (targetState) {
                TutorScreenState.DASHBOARD -> {
                    TutorDashboardView(
                        streakCount = streakCount,
                        topicMasteryList = topicMasteryList,
                        onBackClick = onBackClick,
                        onStartQuiz = { notebookId -> viewModel.startQuiz(notebookId) }
                    )
                }
                TutorScreenState.QUIZ -> {
                    TutorQuizView(
                        questions = questions,
                        currentIdx = currentIdx,
                        currentQuestion = currentQuestion,
                        status = status,
                        feedback = feedback,
                        hintText = hintText,
                        ocrText = ocrText,
                        ocrConfidence = ocrConfidence,
                        isCorrect = isCorrect,
                        hintsRequested = hintsRequested,
                        qualityScore = qualityScore,
                        nextReviewDays = nextReviewDays,
                        isLoading = isLoading,
                        streakCount = streakCount,
                        elapsedSeconds = elapsedSeconds,
                        inkState = inkState,
                        selectedTool = selectedTool,
                        selectedColor = selectedColor,
                        strokeWidth = strokeWidth,
                        onToolSelected = { selectedTool = it },
                        onColorSelected = { selectedColor = it },
                        onStrokeWidthSelected = { strokeWidth = it },
                        onBackClick = { viewModel.openDashboard() },
                        onSubmitAnswer = {
                            viewModel.submitAnswer(ocrText, elapsedSeconds)
                        },
                        onRequestHint = { viewModel.requestHint() },
                        onFinalizeAttempt = { viewModel.finalizeAttempt() },
                        onNextQuestion = { viewModel.nextQuestion() },
                        onClearCanvas = { inkState.clearAll() },
                        onEditFormulaClick = {
                            manualInputText = ocrText
                            showManualEditDialog = true
                        },
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
                                        if (resp is com.archon.notes.canvas.SyncResult.Success) {
                                            resp.response.ocr_job_id?.let { jobId ->
                                                var finished = false
                                                var attemptsLeft = 5
                                                while (!finished && attemptsLeft > 0) {
                                                    val statusResp = MyScriptOcrService.getJobStatus(jobId)
                                                    if (statusResp.status == "completed") {
                                                        val text = statusResp.result?.latex ?: statusResp.result?.text ?: ""
                                                        val conf = statusResp.result?.confidence ?: 0f
                                                        
                                                        // Simulate disagreement for testing Check 2 if needed or just update
                                                        // Actually just update the text and confidence normally
                                                        viewModel.updateOcrText(text, conf)
                                                        finished = true
                                                    }
                                                    attemptsLeft--
                                                    delay(800)
                                                }
                                            }
                                        }
                                    } catch (e: Exception) {
                                        // Ignore offline network errors
                                    }
                                }
                            }
                        }
                    )
                }
                TutorScreenState.SUMMARY -> {
                    TutorSummaryView(
                        correctCount = correctCount,
                        totalQuestions = questions.size.coerceAtLeast(1),
                        streakCount = streakCount,
                        onRestartQuiz = { viewModel.startQuiz() },
                        onReturnDashboard = { viewModel.openDashboard() }
                    )
                }
            }
        }
    }

    // Manual Formula Edit Dialog
    if (showManualEditDialog) {
        AlertDialog(
            onDismissRequest = { showManualEditDialog = false },
            containerColor = SurfaceCard,
            titleContentColor = TextPrimary,
            textContentColor = TextSecondary,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Outlined.Edit, contentDescription = "Edit Formula", tint = AccentGreen)
                    Text("Manual Formula LaTeX Correction", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                OutlinedTextField(
                    value = manualInputText,
                    onValueChange = { manualInputText = it },
                    label = { Text("LaTeX Expression") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentGreen,
                        unfocusedBorderColor = SurfaceCardBorder,
                        focusedLabelColor = AccentGreen,
                        unfocusedLabelColor = TextSecondary,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 14.sp)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.updateOcrText(manualInputText)
                        showManualEditDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AccentGreen)
                ) {
                    Text("Save", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showManualEditDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            }
        )
    }

    if (showDisagreementDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.recordUserFeedback("Cancel", "") },
            containerColor = SurfaceCard,
            titleContentColor = TextPrimary,
            textContentColor = TextSecondary,
            title = { Text("Two different recognitions") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Option A: MyScript result")
                    Row {
                        Text(myScriptResult.first)
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            color = Color(0xFF1A1A2E),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4F46E5)),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "[${(myScriptResult.second * 100).toInt()}%]",
                                color = Color(0xFF4F46E5),
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                    Text("Option B: Custom model result")
                    Row {
                        Text(customResult.first)
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            color = Color(0xFF1A1A2E),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4F46E5)),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "[${(customResult.second * 100).toInt()}%]",
                                color = Color(0xFF4F46E5),
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { viewModel.recordUserFeedback("Use MyScript", myScriptResult.first) }) {
                        Text("Use MyScript")
                    }
                    Button(onClick = { viewModel.recordUserFeedback("Use Custom", customResult.first) }) {
                        Text("Use Custom")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    viewModel.recordUserFeedback("Edit Manually", myScriptResult.first)
                    manualInputText = myScriptResult.first
                    showManualEditDialog = true
                }) {
                    Text("Edit Manually")
                }
            }
        )
    }
}

// ─── 1. MASTERY DASHBOARD VIEW ──────────────────────────────────────────────
@Composable
private fun TutorDashboardView(
    streakCount: Int,
    topicMasteryList: List<TopicMastery>,
    onBackClick: () -> Unit,
    onStartQuiz: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Dashboard Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                }
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Outlined.School, contentDescription = "Tutor Mode", tint = AccentGreen, modifier = Modifier.size(22.dp))
                        Text("Tutor Mastery Dashboard", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    Text("Interactive Socratic Problem Solving", fontSize = 12.sp, color = TextSecondary)
                }
            }

            // Streak Badge
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF261908),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF97316).copy(alpha = 0.4f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Outlined.LocalFireDepartment, contentDescription = "Streak", tint = Color(0xFFF97316), modifier = Modifier.size(18.dp))
                    Text("$streakCount Quiz Streak", color = Color(0xFFF97316), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Hero Start Quiz Banner
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = SurfaceCard,
            border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = AccentGreen.copy(alpha = 0.15f)
                        ) {
                            Text("RECOMMENDED PRACTICE", color = AccentGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                        Spacer(Modifier.height(6.dp))
                        Text("Thermodynamics & Orbital Mechanics Set", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("3 Active Socratic Questions • Handwritten Derivations", fontSize = 13.sp, color = TextSecondary)
                    }
                    Icon(Icons.Outlined.AutoStories, contentDescription = "Study", tint = AccentGreen, modifier = Modifier.size(36.dp))
                }

                Button(
                    onClick = { onStartQuiz("default_notebook") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentGreen),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.PlayArrow, contentDescription = "Start", tint = Color.Black)
                        Text("Start Interactive Practice Session", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Section Title: Topic Mastery Breakdown
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Topic Mastery Breakdown", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text("${topicMasteryList.size} Topics Active", fontSize = 12.sp, color = TextSecondary)
        }

        // Topic Cards List
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            topicMasteryList.forEach { topic ->
                TopicMasteryCard(topic = topic, onClick = { onStartQuiz(topic.topicId) })
            }
        }
    }
}

@Composable
private fun TopicMasteryCard(topic: TopicMastery, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = SurfaceCard,
        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(topic.title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Text("${topic.questionCount} Solved Problems • Practiced ${topic.lastPracticedDaysAgo}d ago", fontSize = 12.sp, color = TextSecondary)
                }
                Text("${(topic.masteryPercentage * 100).toInt()}%", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = AccentGreen)
            }

            // Mastery Progress Bar
            LinearProgressIndicator(
                progress = { topic.masteryPercentage },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = AccentGreen,
                trackColor = Color(0xFF1E2D1E)
            )
        }
    }
}

// ─── 2. QUIZ WORKSPACE VIEW ──────────────────────────────────────────────────
@Composable
private fun TutorQuizView(
    questions: List<QuizQuestion>,
    currentIdx: Int,
    currentQuestion: QuizQuestion?,
    status: String,
    feedback: String?,
    hintText: String?,
    ocrText: String,
    ocrConfidence: Float?,
    isCorrect: Boolean?,
    hintsRequested: Int,
    qualityScore: Int,
    nextReviewDays: Int,
    isLoading: Boolean,
    streakCount: Int,
    elapsedSeconds: Int,
    inkState: InkStrokeState,
    selectedTool: String,
    selectedColor: Color,
    strokeWidth: Float,
    onToolSelected: (String) -> Unit,
    onColorSelected: (Color) -> Unit,
    onStrokeWidthSelected: (Float) -> Unit,
    onBackClick: () -> Unit,
    onSubmitAnswer: () -> Unit,
    onRequestHint: () -> Unit,
    onFinalizeAttempt: () -> Unit,
    onNextQuestion: () -> Unit,
    onClearCanvas: () -> Unit,
    onEditFormulaClick: () -> Unit,
    onStrokeAdded: () -> Unit
) {
    val totalQ = questions.size.coerceAtLeast(1)
    val progressFraction = ((currentIdx + 1).toFloat() / totalQ.toFloat()).coerceIn(0f, 1f)
    var selectedConfidence by remember { mutableStateOf("confident") }

    Column(modifier = Modifier.fillMaxSize()) {
        // Gamified Top Session Header (Streak, XP, Progress)
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = SurfaceCard,
            border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
        ) {
            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        IconButton(onClick = onBackClick, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                        }
                        TutorGraduationCapIcon(tint = AccentGreen, modifier = Modifier.size(20.dp))
                        Text(
                            text = currentQuestion?.topic ?: "Tutor Quiz",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Streak Counter Pill
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF2A1506),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF97316).copy(alpha = 0.4f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(Icons.Outlined.LocalFireDepartment, contentDescription = "Streak", tint = Color(0xFFF97316), modifier = Modifier.size(14.dp))
                                Text(text = "🔥 $streakCount", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF97316))
                            }
                        }

                        // XP Earned Pill
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF26210A),
                            border = androidx.compose.foundation.BorderStroke(1.dp, HintYellow.copy(alpha = 0.4f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(Icons.Outlined.Star, contentDescription = "XP", tint = HintYellow, modifier = Modifier.size(14.dp))
                                Text(text = "⭐ 120 XP", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = HintYellow)
                            }
                        }

                        // Counter Pill
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF142918),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AccentGreen.copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = "Q ${currentIdx + 1}/$totalQ",
                                color = AccentGreen,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                // Linear Animated Progress Bar
                LinearProgressIndicator(
                    progress = { progressFraction },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = AccentGreen,
                    trackColor = Color(0xFF1E2D1E)
                )
            }
        }

        if (isLoading && status == "IDLE") {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AccentGreen)
            }
        } else if (currentQuestion != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Question Card (Isolated Frame)
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = SurfaceCard,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = AccentGreen.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = currentQuestion.topic.uppercase(),
                                    color = AccentGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }

                            // Difficulty Pill
                            val (diffLabel, diffColor) = when (currentQuestion.difficulty) {
                                1 -> "EASY" to AccentGreen
                                2 -> "MEDIUM" to HintYellow
                                else -> "HARD" to ErrorRed
                            }
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = diffColor.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = diffLabel,
                                    color = diffColor,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Text(
                            text = currentQuestion.question_text,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextPrimary,
                            lineHeight = 24.sp
                        )
                    }
                }

                // Socratic Hint Card (Animated Reveal)
                AnimatedVisibility(
                    visible = hintText != null,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically()
                ) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        color = HintContainer,
                        border = androidx.compose.foundation.BorderStroke(1.dp, HintYellow.copy(alpha = 0.4f))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(Icons.Outlined.Lightbulb, contentDescription = "Hint", tint = HintYellow, modifier = Modifier.size(20.dp))
                            Column {
                                Text("Socratic Hint ($hintsRequested/3)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = HintYellow)
                                Spacer(Modifier.height(2.dp))
                                Text(hintText ?: "", fontSize = 13.sp, color = TextPrimary, lineHeight = 18.sp)
                            }
                        }
                    }
                }

                // Answer Canvas Box (Bounded Frame)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, SurfaceCardBorder, RoundedCornerShape(12.dp))
                        .background(Color(0xFF141414))
                ) {
                    // Drawing Canvas
                    InkCanvas(
                        state = inkState,
                        modifier = Modifier.fillMaxSize(),
                        onStrokeAdded = onStrokeAdded,
                        currentTool = selectedTool,
                        currentColor = selectedColor,
                        currentStrokeWidth = strokeWidth
                    )

                    // Clear Canvas Quick Action Button
                    IconButton(
                        onClick = onClearCanvas,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(10.dp)
                            .clip(CircleShape)
                            .background(Color(0x88000000))
                    ) {
                        Icon(Icons.Outlined.DeleteSweep, contentDescription = "Clear Canvas", tint = TextSecondary, modifier = Modifier.size(20.dp))
                    }

                    // Floating Drawing Toolbar
                    FloatingToolbar(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(12.dp),
                        autoHideSignal = false,
                        onToolSelected = onToolSelected,
                        onColorSelected = onColorSelected,
                        onStrokeWidthSelected = onStrokeWidthSelected,
                        onUndo = { inkState.undo() },
                        onRedo = { inkState.redo() }
                    )
                }

                // Live OCR Formula Preview Bar
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .clickable(onClick = onEditFormulaClick),
                    shape = RoundedCornerShape(10.dp),
                    color = SurfaceCard,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Outlined.Edit, contentDescription = "Formula", tint = AccentGreen, modifier = Modifier.size(16.dp))
                            Text(
                                text = ocrText.ifEmpty { "(Write formula solution on canvas...)" },
                                fontSize = 13.sp,
                                fontFamily = FontFamily.Monospace,
                                color = if (ocrText.isEmpty()) TextSecondary else TextPrimary,
                                maxLines = 1
                            )
                            if (ocrConfidence != null && ocrText.isNotEmpty()) {
                                Surface(
                                    color = Color(0xFF1A1A2E),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4F46E5)),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = "[${(ocrConfidence * 100).toInt()}%]",
                                        color = Color(0xFF4F46E5),
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Monospace,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }

                        TextButton(onClick = onEditFormulaClick) {
                            Text("Edit", color = AccentGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Confidence Selector Chips ("Guess", "Unsure", "Confident")
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Confidence Level:", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("guess" to "Guess", "unsure" to "Unsure", "confident" to "Confident").forEach { (key, label) ->
                            FilterChip(
                                selected = selectedConfidence == key,
                                onClick = { selectedConfidence = key },
                                label = { Text(label, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AccentGreen,
                                    selectedLabelColor = Color.Black
                                )
                            )
                        }
                    }
                }

                // Result Feedback Sheet (Correct / Incorrect Overlays with SM-2 Review Date Pill)
                if (status == "CORRECT" || status == "INCORRECT" || status == "FINALIZED") {
                    val isSuccess = isCorrect == true
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSuccess) SuccessContainer else ErrorContainer,
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isSuccess) SuccessGreen else ErrorRed)
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(
                                        imageVector = if (isSuccess) Icons.Outlined.CheckCircle else Icons.Outlined.Cancel,
                                        contentDescription = if (isSuccess) "Correct" else "Incorrect",
                                        tint = if (isSuccess) AccentGreen else ErrorRed,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Text(
                                        text = if (isSuccess) "🏆 Correct! Excellent derivation!" else "Not quite right.",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSuccess) AccentGreen else ErrorRed
                                    )
                                }

                                if (isSuccess) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFF26210A),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, HintYellow.copy(alpha = 0.5f))
                                    ) {
                                        Text("+50 XP", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = HintYellow, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                    }
                                }
                            }

                            feedback?.let { msg ->
                                Text(msg, fontSize = 13.sp, color = TextPrimary, lineHeight = 18.sp)
                            }

                            // SM-2 Review Date Pill
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF181818),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF333333))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Outlined.Schedule, contentDescription = "Review", tint = AccentGreen, modifier = Modifier.size(14.dp))
                                    Text(
                                        text = "Review this topic in $nextReviewDays days (SM-2 Spaced Repetition)",
                                        fontSize = 11.sp,
                                        color = AccentGreen,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }

                // Action Controls Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (status == "IN_PROGRESS" || status == "INCORRECT") {
                        if (hintsRequested < 3) {
                            OutlinedButton(
                                onClick = onRequestHint,
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = HintYellow),
                                border = androidx.compose.foundation.BorderStroke(1.dp, HintYellow.copy(alpha = 0.5f)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Outlined.Lightbulb, contentDescription = "Hint", modifier = Modifier.size(16.dp))
                                    Text("Hint ($hintsRequested/3)", fontSize = 13.sp)
                                }
                            }
                        }

                        Button(
                            onClick = onSubmitAnswer,
                            colors = ButtonDefaults.buttonColors(containerColor = AccentGreen),
                            modifier = Modifier.weight(1.5f)
                        ) {
                            Text("Submit Answer", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    } else if (status == "CORRECT") {
                        Button(
                            onClick = onFinalizeAttempt,
                            colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Lock In & Finalize (SM-2)", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    } else if (status == "FINALIZED") {
                        Button(
                            onClick = onNextQuestion,
                            colors = ButtonDefaults.buttonColors(containerColor = AccentGreen),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Next Question", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                Icon(Icons.AutoMirrored.Outlined.ArrowForward, contentDescription = "Next", tint = Color.Black)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── 3. CELEBRATORY SESSION SUMMARY VIEW ────────────────────────────────────
@Composable
private fun TutorSummaryView(
    correctCount: Int,
    totalQuestions: Int,
    streakCount: Int,
    onRestartQuiz: () -> Unit,
    onReturnDashboard: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Surface(
            shape = CircleShape,
            color = AccentGreen.copy(alpha = 0.15f),
            modifier = Modifier.size(72.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.EmojiEvents, contentDescription = "Trophy", tint = AccentGreen, modifier = Modifier.size(40.dp))
            }
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Session Complete!", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text("Mastered $correctCount of $totalQuestions problems in this review set", fontSize = 13.sp, color = TextSecondary)
        }

        // 2x2 Stat Cards Grid
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Stat Card 1: Accuracy %
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    color = SurfaceCard,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Accuracy", fontSize = 11.sp, color = TextSecondary)
                        Text("${((correctCount.toFloat() / totalQuestions.toFloat()) * 100).toInt()}%", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = AccentGreen)
                    }
                }

                // Stat Card 2: Streak
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    color = SurfaceCard,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Quiz Streak", fontSize = 11.sp, color = TextSecondary)
                        Text("🔥 $streakCount Days", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF97316))
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Stat Card 3: XP Earned
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    color = SurfaceCard,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("XP Earned", fontSize = 11.sp, color = TextSecondary)
                        Text("⭐ +150 XP", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = HintYellow)
                    }
                }

                // Stat Card 4: Topic Mastery %
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    color = SurfaceCard,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Overall Mastery", fontSize = 11.sp, color = TextSecondary)
                        Text("88%", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF3B82F6))
                    }
                }
            }
        }

        // Action Buttons
        Button(
            onClick = onRestartQuiz,
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AccentGreen),
            shape = RoundedCornerShape(10.dp)
        ) {
            Text("Practice Another Set", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }

        TextButton(onClick = onReturnDashboard) {
            Text("Back to Mastery Dashboard", color = TextSecondary)
        }
    }
}
