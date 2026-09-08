package com.example.archonnotesinkcanvas.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

import com.example.archonnotesinkcanvas.theme.ArchonColors
import com.example.archonnotesinkcanvas.theme.ArchonDesignTokens

/** Modes for which Left Context Sidebar is visible */
val GATED_CONTEXT_SIDEBAR_MODES = setOf(
    "dashboard",
    "chat",
    "council",
    "research",
    "agents",
    "notes",
    "notebook",
    "obsidian",
    "directory"
)

@Composable
fun ContextSidebarPane(
    currentDestination: String,
    isOpen: Boolean,
    onClose: () -> Unit,
    windowSizeClass: WindowSizeClass,
    modifier: Modifier = Modifier
) {
    val isVisible = isOpen && currentDestination in GATED_CONTEXT_SIDEBAR_MODES
    val isExpanded = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Expanded

    val sidebarWidth = if (isExpanded) 224.dp else 260.dp

    AnimatedVisibility(
        visible = isVisible,
        enter = slideInHorizontally(animationSpec = spring()) { -it } + fadeIn(animationSpec = spring()),
        exit = slideOutHorizontally(animationSpec = spring()) { -it } + fadeOut(animationSpec = spring()),
        modifier = modifier.animateContentSize(animationSpec = spring())
    ) {
        Surface(
            modifier = Modifier
                .fillMaxHeight()
                .width(sidebarWidth),
            color = ArchonDesignTokens.PanelBackground,
            tonalElevation = 0.dp,
            border = androidx.compose.foundation.BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.60f))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp)
            ) {
                // Sidebar Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(36.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color(0xFF22C55E), CircleShape)
                        )
                        Text(
                            text = getSidebarTitle(currentDestination),
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(
                            imageVector = Icons.Outlined.ChevronLeft,
                            contentDescription = "Close Context Sidebar",
                            tint = Color(0xFF22C55E),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                // Mode Segmented Pill [The Vault] | [History]
                var selectedTab by remember(currentDestination) {
                    mutableStateOf(
                        if (currentDestination == "agents" || currentDestination == "directory" || currentDestination == "obsidian" || currentDestination == "notebook") "vault" else "history"
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(28.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(0xFF141416))
                        .border(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                        .padding(2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (selectedTab == "vault") Color(0xFF18181B) else Color.Transparent)
                            .clickable { selectedTab = "vault" },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "The Vault",
                            color = if (selectedTab == "vault") Color(0xFFE4E4E7) else Color(0xFFA1A1AA),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (selectedTab == "history") Color(0xFF18181B) else Color.Transparent)
                            .clickable { selectedTab = "history" },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "History",
                            color = if (selectedTab == "history") Color(0xFFE4E4E7) else Color(0xFFA1A1AA),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                HorizontalDivider(color = Color(0xFF1F1F1F), thickness = 1.dp, modifier = Modifier.padding(vertical = 8.dp))

                // Mode-specific content inside Left Context Sidebar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    if (currentDestination == "research") {
                        ResearchContextContent()
                    } else if (selectedTab == "vault") {
                        VaultContextContent()
                    } else {
                        HistoryContextContent(currentDestination)
                    }
                }
            }
        }
    }
}

private fun getSidebarTitle(destination: String): String {
    return when (destination) {
        "notebook" -> "RAG SOURCES"
        "notes" -> "NOTEBOOK PAGES"
        "chat" -> "CHAT SESSIONS"
        "council" -> "COUNCIL TOPICS"
        "agents" -> "AGENT ROSTER"
        "research" -> "CITATIONS"
        else -> "CONTEXT"
    }
}

@Composable
private fun NotebookRagContextContent() {
    val sources = remember {
        listOf(
            "Archon_Spec_v2.pdf",
            "Neural_OCR_Weights.bin",
            "Ink_Canvas_Protocol.md",
            "Embedding_Index_2026.db"
        )
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Indexed Documents", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(sources) { source ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF161616),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF262626))
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.Description, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                        Text(source, color = Color.White, fontSize = 12.sp, maxLines = 1)
                    }
                }
            }
        }
    }
}

@Composable
private fun NotesContextContent() {
    val pages = remember { listOf("P1: Introduction", "P2: Architecture", "P3: Ink Strokes", "P4: Neural Engine") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Notebook Outline", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(pages) { page ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF161616),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF262626))
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.Article, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                        Text(page, color = Color.White, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatContextContent() {
    val sessions = remember { listOf("Archon Shell Design", "Room DB Migration", "OCR Quantization Task", "Kotlin Multiplatform") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Recent Threads", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(sessions) { session ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF161616),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF262626))
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.Forum, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                        Text(session, color = Color.White, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun CouncilContextContent() {
    val topics = remember { listOf("Security Review", "Performance Scaling", "UX Modernization", "Local Qwen Route") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Active Deliberations", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(topics) { topic ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF161616),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF262626))
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.AccountBalance, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                        Text(topic, color = Color.White, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun AgentsContextContent() {
    val agents = remember { listOf("shell-agent (Active)", "ocr-trainer (Idle)", "rag-indexer (Active)", "tutor-assistant (Standby)") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Subagent Pool", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(agents) { agent ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF161616),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF262626))
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.SmartToy, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                        Text(agent, color = Color.White, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun VaultContextContent() {
    val vaultFiles = remember {
        listOf(
            "SecondBrain/" to listOf("Ethical_Guidelines.txt", "Architecture_Spec.md"),
            "Project_Scripts/" to listOf("train_ocr.py", "quantize_model.py", "sync_db.kt")
        )
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Local Vault Directory", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            vaultFiles.forEach { (dir, files) ->
                item {
                    Text(dir, color = ArchonDesignTokens.AccentIndigo, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                }
                items(files) { file ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 8.dp),
                        shape = RoundedCornerShape(4.dp),
                        color = Color(0xFF141416),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A))
                    ) {
                        Row(
                            modifier = Modifier.padding(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Outlined.InsertDriveFile, contentDescription = null, tint = ArchonDesignTokens.TextSecondary, modifier = Modifier.size(14.dp))
                            Text(file, color = Color(0xFFE4E4E7), fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryContextContent(destination: String) {
    val items = remember(destination) {
        when (destination) {
            "council" -> listOf("Security Review", "Performance Scaling", "UX Modernization", "Local Qwen Route")
            "agents" -> listOf("OCR Pipeline Run #4", "Dataset Export Task", "Model Fine-Tune Run")
            else -> listOf("Archon Shell Design", "Room DB Migration", "OCR Quantization Task", "Kotlin Multiplatform")
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Past Sessions", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.SemiBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(items) { item ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF161616),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF262626))
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Outlined.Forum, contentDescription = null, tint = ArchonDesignTokens.AccentPrimary, modifier = Modifier.size(16.dp))
                        Text(item, color = Color.White, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ResearchContextContent() {
    val sources = remember {
        listOf(
            "quantum_error_correction.pdf" to "Vectorized (100%)",
            "surface_codes_2023.txt" to "Vectorized (100%)",
            "fault_tolerance_notes.md" to "Parsing..."
        )
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("SOURCE LEDGER", fontSize = 11.sp, color = ArchonDesignTokens.AccentIndigo, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(sources) { (name, status) ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF141416),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27272A))
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Bookmark,
                            contentDescription = null,
                            tint = if (status.contains("Parsing")) Color(0xFF8B5CF6) else Color(0xFF10B981),
                            modifier = Modifier.size(16.dp)
                        )
                        Column {
                            Text(name, color = Color.White, fontSize = 11.sp, fontFamily = FontFamily.Monospace, maxLines = 1)
                            Text(status, color = Color.Gray, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DefaultContextContent(destination: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Context for $destination", color = Color.Gray, fontSize = 12.sp)
    }
}
