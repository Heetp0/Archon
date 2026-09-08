package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.archonnotesinkcanvas.data.local.ArchonDatabase
import com.example.archonnotesinkcanvas.data.local.entities.NotebookEntity
import com.example.archonnotesinkcanvas.ui.adaptive.isTabletMode
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

private fun formatRelativeDate(timestamp: Long): String {
    val now = System.currentTimeMillis()
    val diff = now - timestamp
    return when {
        diff < 60_000L -> "Just now"
        diff < 3_600_000L -> "${diff / 60_000}m ago"
        diff < 86_400_000L -> "${diff / 3_600_000}h ago"
        diff < 604_800_000L -> "${diff / 86_400_000}d ago"
        else -> SimpleDateFormat("MMM d", Locale.getDefault()).format(Date(timestamp))
    }
}

private fun themeColorForSubject(title: String): Color {
    val lower = title.lowercase()
    return when {
        lower.contains("thermo") || lower.contains("heat") || lower.contains("energy") -> Color(0xFFEF4444)
        lower.contains("orbital") || lower.contains("astro") || lower.contains("space") || lower.contains("celestial") -> Color(0xFF3B82F6)
        lower.contains("control") || lower.contains("system") || lower.contains("circuit") || lower.contains("signal") -> Color(0xFF22C55E)
        else -> Color(0xFF4F46E5)
    }
}

@Composable
fun NotebookListScreen(
    windowSizeClass: WindowSizeClass,
    onNotebookOpen: (String) -> Unit
) {
    val context = LocalContext.current
    val db = remember { ArchonDatabase.getInstance(context) }
    val notebooks by db.notebookDao().getAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    LaunchedEffect(notebooks) {
        if (notebooks.isEmpty()) {
            scope.launch {
                val demoSubjects = listOf(
                    Triple("demo-0", "Thermodynamics", "First Law, Heat Transfer & Entropy equations"),
                    Triple("demo-1", "Orbital Mechanics", "Kepler's laws, Orbital velocity & Δv calculations"),
                    Triple("demo-2", "Control Systems", "Transfer Functions, PID controllers & Bode plots")
                )
                demoSubjects.forEach { (id, title, topicText) ->
                    db.notebookDao().upsert(NotebookEntity(notebookId = id, title = title))
                    db.pageDao().insertPage(
                        com.example.archonnotesinkcanvas.data.local.entities.NotebookPageEntity(
                            pageId = "${id}_p1",
                            notebookId = id,
                            pageNumber = 1,
                            topic = topicText
                        )
                    )
                    db.ocrDao().insertSample(
                        com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingSampleEntity(
                            sampleId = "ocr_${id}_1",
                            notebookId = id,
                            strokeData = "",
                            originalOCRText = topicText,
                            originalOCRConfidence = 0.95f,
                            correctedText = topicText,
                            userConfidence = "certain"
                        )
                    )
                }
            }
        }
    }

    var showCreateDialog by remember { mutableStateOf(false) }
    var newNotebookTitle by remember { mutableStateOf("") }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = Color(0xFF00E599),
                contentColor = Color.Black,
                modifier = Modifier.size(56.dp),
                shape = CircleShape
            ) {
                Icon(Icons.Outlined.Add, contentDescription = "Add")
            }
        },
        containerColor = Color.Black
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            if (notebooks.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Book,
                        contentDescription = null,
                        tint = Color(0xFFA1A1AA),
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No notebooks yet",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Tap + to create your first notebook",
                        color = Color(0xFFA1A1AA),
                        fontSize = 14.sp
                    )
                }
            } else {
                Column(modifier = Modifier.fillMaxSize()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Notebooks",
                                color = Color.White,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "${notebooks.size} subject${if (notebooks.size != 1) "s" else ""}",
                                color = Color(0xFF555555),
                                fontSize = 12.sp
                            )
                        }
                    }

                    HorizontalDivider(thickness = 1.dp, color = Color(0xFF111111))
                    Spacer(modifier = Modifier.height(8.dp))

                    val isExpanded = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Expanded
                    if (windowSizeClass.isTabletMode) {
                        val gridColumns = if (isExpanded) GridCells.Fixed(4) else GridCells.Fixed(3)
                        LazyVerticalGrid(
                            columns = gridColumns,
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(notebooks) { nb ->
                                NotebookCard(nb, db, onNotebookOpen)
                            }
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(notebooks) { nb ->
                                NotebookCard(nb, db, onNotebookOpen)
                            }
                        }
                    }
                }
            }

            if (showCreateDialog) {
                AlertDialog(
                    onDismissRequest = {
                        showCreateDialog = false
                        newNotebookTitle = ""
                    },
                    containerColor = Color(0xFF111111),
                    titleContentColor = Color.White,
                    title = { Text("Create Notebook", fontWeight = FontWeight.SemiBold) },
                    text = {
                        Column {
                            Text(
                                text = "Enter a title for your new notebook",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF8A8A8A)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedTextField(
                                value = newNotebookTitle,
                                onValueChange = { newNotebookTitle = it },
                                label = { Text("Notebook Title", color = Color(0xFF8A8A8A)) },
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = Color(0xFF22C55E),
                                    unfocusedBorderColor = Color(0xFF1E1E1E)
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                val title = newNotebookTitle.trim()
                                if (title.isNotEmpty()) {
                                    scope.launch {
                                        val id = "nb_${System.currentTimeMillis()}"
                                        db.notebookDao().upsert(
                                            NotebookEntity(
                                                notebookId = id,
                                                title = title,
                                                updatedAt = System.currentTimeMillis()
                                            )
                                        )
                                        showCreateDialog = false
                                        newNotebookTitle = ""
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF22C55E),
                                contentColor = Color.Black
                            )
                        ) {
                            Text("Create", fontWeight = FontWeight.SemiBold)
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = {
                                showCreateDialog = false
                                newNotebookTitle = ""
                            }
                        ) {
                            Text("Cancel", color = Color(0xFF8A8A8A))
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun NotebookCard(
    notebook: NotebookEntity,
    db: ArchonDatabase,
    onNotebookOpen: (String) -> Unit
) {
    val notebookColor = themeColorForSubject(notebook.title)
    val relativeDate = remember(notebook.updatedAt) { formatRelativeDate(notebook.updatedAt) }

    val pages by db.pageDao().getPagesForNotebook(notebook.notebookId).collectAsState(initial = emptyList())
    val recentOcr by db.ocrDao().getRecentSamplesFlow(notebook.notebookId, limit = 1).collectAsState(initial = emptyList())

    val pageCount = pages.size
    val lastTopicRaw = remember(pages, recentOcr, notebook) {
        val ocrText = recentOcr.firstOrNull()?.correctedText?.takeIf { it.isNotBlank() }
            ?: recentOcr.firstOrNull()?.originalOCRText?.takeIf { it.isNotBlank() }
        val pageTopic = pages.lastOrNull { it.topic.isNotBlank() && it.topic != "Uncategorized" }?.topic
        val defaultTopic = "General lecture notes and diagrams"
        ocrText ?: pageTopic ?: defaultTopic
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF111111))
            .border(1.dp, Color(0xFF27272A), RoundedCornerShape(12.dp))
            .clickable { onNotebookOpen(notebook.notebookId) }
    ) {
        Row(modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(notebookColor)
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = notebook.title,
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = relativeDate,
                        color = Color(0xFFA1A1AA),
                        fontSize = 11.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "$pageCount pages",
                    color = Color(0xFFA1A1AA),
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (lastTopicRaw.length > 60) lastTopicRaw.take(57) + "..." else lastTopicRaw,
                    color = Color(0xFFA1A1AA),
                    fontSize = 12.sp,
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
