package com.example.archonnotesinkcanvas.ui.main

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ViewList
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.ink.strokes.Stroke
import com.archon.notes.canvas.InkCanvas
import com.archon.notes.canvas.InkStrokeState
import com.archon.notes.canvas.MyScriptOcrService
import com.archon.notes.canvas.OcrResultData
import com.archon.notes.canvas.OcrTokenData
import com.archon.notes.canvas.StrokeSerialization
import com.example.archonnotesinkcanvas.ui.canvas.FloatingToolbar
import com.example.archonnotesinkcanvas.ui.components.PageNavigator
import com.example.archonnotesinkcanvas.ui.components.PageTemplateDialog
import com.example.archonnotesinkcanvas.ui.components.SyncStatusBadge
import com.example.archonnotesinkcanvas.ui.components.TemplateBackgroundCanvas
import com.example.archonnotesinkcanvas.data.local.ArchonDatabase
import com.example.archonnotesinkcanvas.data.local.entities.NotebookPageEntity
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

// ─── Design Tokens ───────────────────────────────────────────────────────────
private val AppBarBg = Color(0xFF0A0A0A)
private val AppBarBorder = Color(0xFF1C1C1C)
private val SurfaceCard = Color(0xFF111111)
private val TextPrimary = Color(0xFFFFFFFF)
private val TextSecondary = Color(0xFF8A8A8A)
private val TextMuted = Color(0xFF555555)
private val AccentGreen = Color(0xFF22C55E)
private val AccentAmber = Color(0xFFF59E0B)
private val AccentRed = Color(0xFFEF4444)
private val BorderColor = Color(0xFF1E1E1E)

// ─── Sync State ──────────────────────────────────────────────────────────────
private enum class SyncState {
    SYNCING, SYNCED, OFFLINE;

    companion object {
        fun fromLabel(label: String): SyncState = when {
            label.contains("Syncing") -> SYNCING
            label.contains("Offline") || label.contains("Error") -> OFFLINE
            else -> SYNCED
        }
    }
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    notebookId: String = "default_notebook",
    onItemClick: (androidx.navigation3.runtime.NavKey) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val db = remember { ArchonDatabase.getInstance(context) }
    val scope = rememberCoroutineScope()

    var sidebarExpanded by remember { mutableStateOf(false) }
    var showTemplateDialog by remember { mutableStateOf(false) }
    var showConflictBottomSheet by remember { mutableStateOf(false) }
    var conflictLocalVersion by remember { mutableStateOf("v1.0") }
    var conflictRemoteVersion by remember { mutableStateOf("v1.1") }
    val snackbarHostState = remember { SnackbarHostState() }

    // Query room notebook pages
    val pagesFromDb by db.pageDao().getPagesForNotebook(notebookId).collectAsState(initial = emptyList())
    var currentPageId by remember(notebookId) { mutableStateOf("page_1") }
    var syncStatusLabel by remember { mutableStateOf("synced") }

    // Seed default page 1 if db empty
    LaunchedEffect(pagesFromDb) {
        if (pagesFromDb.isEmpty()) {
            scope.launch {
                db.pageDao().insertPage(
                    NotebookPageEntity(
                        pageId = "page_1",
                        notebookId = notebookId,
                        pageNumber = 1,
                        orientation = "portrait",
                        templateType = "blank"
                    )
                )
            }
        } else if (pagesFromDb.none { it.pageId == currentPageId }) {
            currentPageId = pagesFromDb.first().pageId
        }
    }

    val currentPage = remember(pagesFromDb, currentPageId) {
        pagesFromDb.find { it.pageId == currentPageId } ?: NotebookPageEntity(
            pageId = currentPageId,
            notebookId = notebookId,
            pageNumber = 1
        )
    }

    var ocrJobId by remember { mutableStateOf<String?>(null) }
    var ocrStatus by remember { mutableStateOf("") }
    var ocrResult by remember { mutableStateOf<OcrResultData?>(null) }

    val strokeState = remember(notebookId) { InkStrokeState() }
    var triggerSyncCounter by remember { mutableStateOf(0) }
    var isImmersive by remember { mutableStateOf(false) }

    var selectedTool by remember { mutableStateOf("pen") }
    var selectedColor by remember { mutableStateOf(Color.Black) }
    var strokeWidth by remember { mutableStateOf(5f) }

    LaunchedEffect(notebookId, currentPageId) {
        loadStrokesFromLocal(context, notebookId, currentPageId, strokeState)
        ocrResult = null
        ocrStatus = ""
        ocrJobId = null
        syncPage(
            context = context,
            notebookId = notebookId,
            pageId = currentPageId,
            strokeState = strokeState,
            onStatusChanged = { status: String, localVer: String, remoteVer: String ->
                syncStatusLabel = status
                if (localVer.isNotEmpty()) conflictLocalVersion = localVer
                if (remoteVer.isNotEmpty()) conflictRemoteVersion = remoteVer
            },
            onOcrJobTriggered = { jobId: String ->
                ocrJobId = jobId
            }
        )
    }

    LaunchedEffect(triggerSyncCounter) {
        if (triggerSyncCounter == 0) return@LaunchedEffect
        delay(1500L)
        syncPage(
            context = context,
            notebookId = notebookId,
            pageId = currentPageId,
            strokeState = strokeState,
            onStatusChanged = { status: String, localVer: String, remoteVer: String ->
                syncStatusLabel = status
                if (localVer.isNotEmpty()) conflictLocalVersion = localVer
                if (remoteVer.isNotEmpty()) conflictRemoteVersion = remoteVer
            },
            onOcrJobTriggered = { jobId: String ->
                ocrJobId = jobId
            }
        )
    }

    LaunchedEffect(ocrJobId) {
        val jobId = ocrJobId ?: return@LaunchedEffect
        ocrStatus = "OCR Queued..."
        try {
            while (true) {
                val statusResp = MyScriptOcrService.getJobStatus(jobId)
                ocrStatus = "OCR running..."
                if (statusResp.status == "completed") {
                    ocrResult = statusResp.result
                    ocrStatus = "OCR Completed"
                    break
                } else if (statusResp.status == "failed") {
                    ocrStatus = "OCR Failed"
                    break
                }
                delay(800L)
            }
        } catch (e: Exception) {
            ocrStatus = "OCR Offline"
        }
    }

    Box(modifier = modifier.fillMaxSize().background(Color(0xFF000000))) {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── TOP APP BAR ────────────────────────────────────────────────────
            if (!isImmersive) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(AppBarBg)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // ─── LEFT: Sidebar toggle & Page Title ────────────────
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            IconButton(onClick = { sidebarExpanded = !sidebarExpanded }) {
                                Icon(
                                    imageVector = if (sidebarExpanded) Icons.AutoMirrored.Outlined.ViewList else Icons.Outlined.Menu,
                                    contentDescription = "Sidebar",
                                    tint = AccentGreen
                                )
                            }

                            Text(
                                text = "Page ${currentPage.pageNumber} (${currentPage.templateType.uppercase()})",
                                color = TextPrimary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        // ─── CENTER: Sync status badge ────────────────────────
                        SyncStatusBadge(
                            syncStatus = syncStatusLabel,
                            ocrPendingCount = if (ocrStatus.contains("running")) 1 else 0,
                            onResolveClick = { showConflictBottomSheet = true }
                        )

                        // ─── RIGHT: Actions ────────────────────────────────────
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { showTemplateDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E1E1E)),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("+ Page", color = AccentGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            FullscreenToggleButton(
                                isImmersive = isImmersive,
                                onClick = { isImmersive = !isImmersive }
                            )

                            // AI OCR Training chip
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF14241D))
                                    .border(1.dp, AccentGreen.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                    .clickable { onItemClick(com.example.archonnotesinkcanvas.OCRModelTraining) }
                                    .padding(horizontal = 10.dp, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Outlined.Psychology, contentDescription = "AI Training", tint = AccentGreen, modifier = Modifier.size(16.dp))
                                Text(
                                    text = "AI Model",
                                    color = AccentGreen,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            // Tutor mode chip
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF1A2A1A))
                                    .border(1.dp, AccentGreen.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                    .clickable { onItemClick(com.example.archonnotesinkcanvas.Tutor) }
                                    .padding(horizontal = 12.dp, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                TutorGraduationCapIcon(tint = AccentGreen, modifier = Modifier.size(16.dp))
                                Text(
                                    text = "Tutor",
                                    color = AccentGreen,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
                HorizontalDivider(thickness = 1.dp, color = AppBarBorder)
            }

            // ── OCR STATUS BANNER ──────────────────────────────────────────────
            if (ocrStatus.isNotEmpty() && !isImmersive) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0D1A0D))
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = ocrStatus,
                        color = AccentGreen.copy(alpha = 0.8f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // ── MAIN CANVAS AREA WITH SIDEBAR ────────────────────────────────
            Row(modifier = Modifier.weight(1.5f).fillMaxWidth()) {
                // Page Navigator Sidebar
                AnimatedVisibility(
                    visible = !isImmersive,
                    enter = androidx.compose.animation.slideInHorizontally(initialOffsetX = { -it }),
                    exit = androidx.compose.animation.slideOutHorizontally(targetOffsetX = { -it })
                ) {
                    PageNavigator(
                        pages = pagesFromDb,
                        currentPageId = currentPageId,
                        isExpanded = sidebarExpanded,
                        onToggleExpand = { sidebarExpanded = !sidebarExpanded },
                        onPageSelected = { selectedPageId ->
                            if (currentPageId != selectedPageId) {
                                saveStrokesToLocal(context, notebookId, currentPageId, strokeState.strokes)
                                currentPageId = selectedPageId
                            }
                        },
                        onPageDeleted = { pageIdToDelete ->
                            scope.launch {
                                val targetPage = pagesFromDb.find { it.pageId == pageIdToDelete }
                                db.pageDao().deletePageById(pageIdToDelete)
                                val result = snackbarHostState.showSnackbar(
                                    message = "Page ${targetPage?.pageNumber ?: ""} deleted",
                                    actionLabel = "Undo",
                                    duration = SnackbarDuration.Short
                                )
                                if (result == SnackbarResult.ActionPerformed && targetPage != null) {
                                    db.pageDao().insertPage(targetPage)
                                }
                            }
                        },
                        onReorderPages = { fromIndex, toIndex ->
                            if (fromIndex in pagesFromDb.indices && toIndex in pagesFromDb.indices) {
                                scope.launch {
                                    val p1 = pagesFromDb[fromIndex]
                                    val p2 = pagesFromDb[toIndex]
                                    db.pageDao().updatePage(p1.copy(pageNumber = p2.pageNumber))
                                    db.pageDao().updatePage(p2.copy(pageNumber = p1.pageNumber))
                                }
                            }
                        },
                        onShowTemplateDialog = { showTemplateDialog = true }
                    )
                }

                // Ink Canvas Container with Template Background & Swipe-from-right-edge gesture
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .pointerInput(Unit) {
                            detectHorizontalDragGestures { change, dragAmount ->
                                // Detect swipe left from right edge of screen
                                if (change.position.x > size.width - 120f && dragAmount < -15f) {
                                    showTemplateDialog = true
                                }
                            }
                        }
                ) {
                    TemplateBackgroundCanvas(
                        templateType = currentPage.templateType,
                        pageColor = currentPage.pageColor,
                        modifier = Modifier.fillMaxSize()
                    )

                    InkCanvas(
                        state = strokeState,
                        modifier = Modifier.fillMaxSize(),
                        onStrokeAdded = { triggerSyncCounter++ },
                        currentTool = selectedTool,
                        currentColor = selectedColor,
                        currentStrokeWidth = strokeWidth
                    )

                    FloatingToolbar(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .navigationBarsPadding()
                            .padding(bottom = 20.dp, end = 20.dp),
                        autoHideSignal = false,
                        onToolSelected = { selectedTool = it },
                        onColorSelected = { selectedColor = it },
                        onStrokeWidthSelected = { strokeWidth = it },
                        onUndo = { strokeState.undo() },
                        onRedo = { strokeState.redo() }
                    )

                    // Immersive exit hint
                    if (isImmersive) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(12.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color(0x88000000))
                                .clickable { isImmersive = false }
                                .padding(horizontal = 10.dp, vertical = 5.dp)
                        ) {
                            Text("Exit fullscreen", color = TextSecondary, fontSize = 11.sp)
                        }
                    }
                }
            }

            // ── OCR RESULT PANEL ───────────────────────────────────────────────
            ocrResult?.let { result ->
                if (!isImmersive) {
                    HorizontalDivider(thickness = 1.dp, color = BorderColor)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                    ) {
                        RecognitionResultPanel(
                            ocrResult = result,
                            onCorrectionSubmitted = { original, corrected ->
                                scope.launch {
                                    val success = MyScriptOcrService.sendCorrection(
                                        notebookId = notebookId,
                                        pageId = currentPageId,
                                        originalToken = original,
                                        correctedToken = corrected,
                                        confidence = 1.0f
                                    )
                                    if (success) {
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

        // ── PAGE TEMPLATE DIALOG ─────────────────────────────────────────────
        if (showTemplateDialog) {
            PageTemplateDialog(
                onDismiss = { showTemplateDialog = false },
                onCreatePage = { orientation, template, color ->
                    showTemplateDialog = false
                    val newPageNumber = pagesFromDb.size + 1
                    val newPageId = "page_$newPageNumber"
                    scope.launch {
                        db.pageDao().insertPage(
                            NotebookPageEntity(
                                pageId = newPageId,
                                notebookId = notebookId,
                                pageNumber = newPageNumber,
                                orientation = orientation,
                                templateType = template,
                                pageColor = color
                            )
                        )
                        saveStrokesToLocal(context, notebookId, currentPageId, strokeState.strokes)
                        currentPageId = newPageId
                    }
                }
            )
        }

        // ── CONFLICT RESOLUTION BOTTOM SHEET ───────────────────────────────────
        if (showConflictBottomSheet) {
            ModalBottomSheet(
                onDismissRequest = { showConflictBottomSheet = false },
                containerColor = Color(0xFF111111)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(Icons.Outlined.Warning, contentDescription = null, tint = AccentRed, modifier = Modifier.size(24.dp))
                        Text("Sync Conflict (HTTP 409)", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                    Text(
                        "The server detected conflicting modifications for page '$currentPageId'. Compare diff below:",
                        color = TextSecondary,
                        fontSize = 13.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Local version card
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF1A2A1A),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AccentGreen.copy(alpha = 0.4f))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("Local Version", color = AccentGreen, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Version: $conflictLocalVersion", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                Text("Strokes: ${strokeState.strokes.size}", color = TextSecondary, fontSize = 11.sp)
                                Text("Local device state", color = TextMuted, fontSize = 10.sp)
                            }
                        }

                        // Remote version card
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF1A1A2E),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF3B82F6).copy(alpha = 0.4f))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("Remote Version", color = Color(0xFF3B82F6), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Version: $conflictRemoteVersion", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                Text("Server state (409)", color = TextSecondary, fontSize = 11.sp)
                                Text("Conflicting remote copy", color = TextMuted, fontSize = 10.sp)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = {
                                showConflictBottomSheet = false
                                syncStatusLabel = "synced"
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = AccentGreen, contentColor = Color.Black)
                        ) {
                            Text("Keep Local", fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                showConflictBottomSheet = false
                                strokeState.clearAll()
                                syncStatusLabel = "synced"
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2A2A2A), contentColor = Color.White)
                        ) {
                            Text("Keep Remote", fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

// ─── Sync Status Chip ────────────────────────────────────────────────────────
@Composable
private fun SyncStatusChip(label: String) {
    val state = SyncState.fromLabel(label)

    val chipColor = when (state) {
        SyncState.SYNCING -> Color(0xFF1A1A0D)
        SyncState.SYNCED -> Color(0xFF0D1A0D)
        SyncState.OFFLINE -> Color(0xFF1A1010)
    }
    val textColor = when (state) {
        SyncState.SYNCING -> AccentAmber
        SyncState.SYNCED -> AccentGreen
        SyncState.OFFLINE -> AccentRed.copy(alpha = 0.8f)
    }
    val icon = when (state) {
        SyncState.SYNCING -> "↻"
        SyncState.SYNCED -> "✓"
        SyncState.OFFLINE -> "✗"
    }
    val displayLabel = when (state) {
        SyncState.SYNCING -> "Syncing..."
        SyncState.SYNCED -> "Synced"
        SyncState.OFFLINE -> "Offline"
    }

    val infiniteTransition = rememberInfiniteTransition(label = "sync_spin")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing)
        ),
        label = "sync_rotation"
    )

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(chipColor)
            .border(1.dp, textColor.copy(alpha = 0.2f), RoundedCornerShape(20.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        Text(
            text = icon,
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = if (state == SyncState.SYNCING) Modifier.rotate(rotation) else Modifier
        )
        Text(
            text = displayLabel,
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun FullscreenToggleButton(isImmersive: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(34.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(SurfaceCard)
            .border(1.dp, BorderColor, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        androidx.compose.foundation.Canvas(modifier = Modifier.size(16.dp)) {
            val w = size.width
            val h = size.height
            val strokePx = 1.8.dp.toPx()
            val color = TextSecondary

            if (!isImmersive) {
                // Phosphor CornersOut (Expand to Fullscreen)
                // Top-Left
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.45f), androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.15f), strokePx)
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.15f), androidx.compose.ui.geometry.Offset(w * 0.45f, h * 0.15f), strokePx)
                // Top-Right
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.55f, h * 0.15f), androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.15f), strokePx)
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.15f), androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.45f), strokePx)
                // Bottom-Left
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.55f), androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.85f), strokePx)
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.85f), androidx.compose.ui.geometry.Offset(w * 0.45f, h * 0.85f), strokePx)
                // Bottom-Right
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.55f, h * 0.85f), androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.85f), strokePx)
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.85f), androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.55f), strokePx)
            } else {
                // Phosphor CornersIn (Exit Fullscreen)
                // Top-Left corner pointing in
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.35f), androidx.compose.ui.geometry.Offset(w * 0.35f, h * 0.35f), strokePx)
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.35f, h * 0.35f), androidx.compose.ui.geometry.Offset(w * 0.35f, h * 0.15f), strokePx)
                // Top-Right corner pointing in
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.35f), androidx.compose.ui.geometry.Offset(w * 0.65f, h * 0.35f), strokePx)
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.65f, h * 0.35f), androidx.compose.ui.geometry.Offset(w * 0.65f, h * 0.15f), strokePx)
                // Bottom-Left corner pointing in
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.65f), androidx.compose.ui.geometry.Offset(w * 0.35f, h * 0.65f), strokePx)
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.35f, h * 0.65f), androidx.compose.ui.geometry.Offset(w * 0.35f, h * 0.85f), strokePx)
                // Bottom-Right corner pointing in
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.65f), androidx.compose.ui.geometry.Offset(w * 0.65f, h * 0.65f), strokePx)
                drawLine(color, androidx.compose.ui.geometry.Offset(w * 0.65f, h * 0.65f), androidx.compose.ui.geometry.Offset(w * 0.65f, h * 0.85f), strokePx)
            }
        }
    }
}

// ─── OCR Result Panel ─────────────────────────────────────────────────────────
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
            text = "Handwriting Recognition — tap uncertain words to correct",
            style = MaterialTheme.typography.labelMedium,
            color = TextSecondary
        )

        Spacer(modifier = Modifier.height(8.dp))

        if (!ocrResult.latex.isNullOrBlank()) {
            Surface(
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                shape = RoundedCornerShape(6.dp),
                color = Color(0xFF111111)
            ) {
                Text(
                    text = "LaTeX: ${ocrResult.latex}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AccentGreen,
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
                        shape = RoundedCornerShape(4.dp),
                        color = if (isLowConfidence) Color(0xFF1F0F0F) else Color(0xFF111111),
                        tonalElevation = 0.dp
                    ) {
                        Text(
                            text = token.text,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isLowConfidence) AccentRed else TextPrimary
                        )
                    }
                }
            }
        } else {
            Text(
                text = ocrResult.text,
                style = MaterialTheme.typography.bodyLarge,
                color = TextPrimary
            )
        }
    }

    if (showDialog && selectedToken != null) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            containerColor = Color(0xFF111111),
            titleContentColor = TextPrimary,
            title = { Text("Correct word", fontWeight = FontWeight.SemiBold) },
            text = {
                Column {
                    Text(
                        text = "Original: \"${selectedToken!!.text}\"  (${(selectedToken!!.confidence * 100).toInt()}% confidence)",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = correctionText,
                        onValueChange = { correctionText = it },
                        label = { Text("Corrected value", color = TextSecondary) },
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
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AccentGreen, contentColor = Color.Black)
                ) { Text("Apply", fontWeight = FontWeight.SemiBold) }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            }
        )
    }
}

// ─── Private helpers ─────────────────────────────────────────────────────────
private fun saveStrokesToLocal(context: Context, notebookId: String, pageId: String, strokes: List<Stroke>) {
    try {
        val file = File(context.filesDir, "strokes/$notebookId/$pageId.bin")
        file.parentFile?.mkdirs()
        val bytes = StrokeSerialization.serialize(strokes)
        file.writeBytes(bytes)
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

private fun loadStrokesFromLocal(context: Context, notebookId: String, pageId: String, strokeState: InkStrokeState) {
    try {
        val file = File(context.filesDir, "strokes/$notebookId/$pageId.bin")
        if (file.exists()) {
            val bytes = file.readBytes()
            val strokes = StrokeSerialization.deserialize(bytes)
            strokeState.setStrokes(strokes)
        } else {
            strokeState.clearAll()
        }
    } catch (e: Exception) {
        strokeState.clearAll()
    }
}

private suspend fun syncPage(
    context: Context,
    notebookId: String,
    pageId: String,
    strokeState: InkStrokeState,
    onStatusChanged: (status: String, localVer: String, remoteVer: String) -> Unit,
    onOcrJobTriggered: (String) -> Unit
) {
    onStatusChanged("syncing", "", "")
    val strokes = strokeState.strokes
    val bytes = StrokeSerialization.serialize(strokes)
    saveStrokesToLocal(context, notebookId, pageId, strokes)

    try {
        val result = MyScriptOcrService.saveStrokesAndTriggerOcr(
            notebookId = notebookId,
            pageId = pageId,
            binaryStrokes = bytes,
            mode = "text"
        )
        when (result) {
            is com.archon.notes.canvas.SyncResult.Success -> {
                onStatusChanged("synced", "", "")
                result.response.ocr_job_id?.let { jobId -> onOcrJobTriggered(jobId) }
            }
            is com.archon.notes.canvas.SyncResult.Conflict -> {
                onStatusChanged("conflict", result.localVersion, result.remoteVersion)
            }
            is com.archon.notes.canvas.SyncResult.Offline -> {
                onStatusChanged("synced", "", "")
            }
        }
    } catch (e: Exception) {
        onStatusChanged("synced", "", "")
    }
}

@Composable
fun TutorGraduationCapIcon(tint: Color, modifier: Modifier = Modifier) {
    androidx.compose.foundation.Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val strokePx = 1.6.dp.toPx()

        // Mortarboard diamond top
        val capTop = androidx.compose.ui.graphics.Path().apply {
            moveTo(w * 0.50f, h * 0.15f)
            lineTo(w * 0.90f, h * 0.38f)
            lineTo(w * 0.50f, h * 0.60f)
            lineTo(w * 0.10f, h * 0.38f)
            close()
        }
        drawPath(
            path = capTop,
            color = tint,
            style = androidx.compose.ui.graphics.drawscope.Stroke(
                width = strokePx,
                cap = androidx.compose.ui.graphics.StrokeCap.Round,
                join = androidx.compose.ui.graphics.StrokeJoin.Round
            )
        )

        // Skullcap lower rim
        val capBase = androidx.compose.ui.graphics.Path().apply {
            moveTo(w * 0.28f, h * 0.50f)
            lineTo(w * 0.28f, h * 0.68f)
            cubicTo(w * 0.38f, h * 0.85f, w * 0.62f, h * 0.85f, w * 0.72f, h * 0.68f)
            lineTo(w * 0.72f, h * 0.50f)
        }
        drawPath(
            path = capBase,
            color = tint,
            style = androidx.compose.ui.graphics.drawscope.Stroke(
                width = strokePx,
                cap = androidx.compose.ui.graphics.StrokeCap.Round,
                join = androidx.compose.ui.graphics.StrokeJoin.Round
            )
        )

        // Right side hanging tassel
        drawLine(
            color = tint,
            start = Offset(w * 0.90f, h * 0.38f),
            end = Offset(w * 0.90f, h * 0.72f),
            strokeWidth = strokePx,
            cap = androidx.compose.ui.graphics.StrokeCap.Round
        )
    }
}
