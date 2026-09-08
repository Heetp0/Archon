package com.example.archonnotesinkcanvas.ui.screens

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material.icons.outlined.PictureAsPdf
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotebookRAGScreen(windowSizeClass: WindowSizeClass) {
    var selectedSource by remember { mutableStateOf<String?>(null) }
    val chatMessages = remember { mutableStateListOf<Pair<String, String>>() }
    var chatInput by remember { mutableStateOf("") }
    var activeTab by remember { mutableIntStateOf(0) }
    val sources = remember { listOf("Thermodynamics Ch1.pdf", "Orbital Mechanics.pdf") }

    val isTablet = windowSizeClass.widthSizeClass != WindowWidthSizeClass.Compact

    if (isTablet) {
        Row(modifier = Modifier.fillMaxSize().background(Color(0xFF0A0A0A))) {
            // Source list - constrained to <= 35% width (28% assigned here)
            SourcesPanel(
                sources = sources,
                selectedSource = selectedSource,
                onSelect = { selectedSource = it },
                modifier = Modifier
                    .weight(0.28f)
                    .fillMaxHeight()
            )
            VerticalDivider(color = Color(0xFF222222))
            // Reader pane - 44% width (combined reader + chat = 72% >= 65% width)
            ReaderPanel(
                selectedSource = selectedSource,
                sources = sources,
                onSelect = { selectedSource = it },
                modifier = Modifier.weight(0.44f)
            )
            VerticalDivider(color = Color(0xFF222222))
            // Chat panel - 28% width
            ChatPanel(
                chatMessages = chatMessages,
                chatInput = chatInput,
                onInputChange = { chatInput = it },
                selectedSource = selectedSource,
                modifier = Modifier
                    .weight(0.28f)
                    .fillMaxHeight()
            )
        }
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0A0A0A))
        ) {
            val pagerState = rememberPagerState(pageCount = { 3 })
            val scope = rememberCoroutineScope()

            LaunchedEffect(pagerState.currentPage) {
                activeTab = pagerState.currentPage
            }

            TabRow(
                selectedTabIndex = activeTab,
                containerColor = Color(0xFF0A0A0A),
                contentColor = Color(0xFF22C55E)
            ) {
                Tab(
                    selected = activeTab == 0,
                    onClick = { scope.launch { pagerState.animateScrollToPage(0) } },
                    text = { Text("Sources", color = if (activeTab == 0) Color.White else Color(0xFFA1A1AA)) }
                )
                Tab(
                    selected = activeTab == 1,
                    onClick = { scope.launch { pagerState.animateScrollToPage(1) } },
                    text = { Text("Reader", color = if (activeTab == 1) Color.White else Color(0xFFA1A1AA)) }
                )
                Tab(
                    selected = activeTab == 2,
                    onClick = { scope.launch { pagerState.animateScrollToPage(2) } },
                    text = { Text("Chat", color = if (activeTab == 2) Color.White else Color(0xFFA1A1AA)) }
                )
            }
            HorizontalPager(state = pagerState, modifier = Modifier.weight(1f)) { page ->
                when (page) {
                    0 -> SourcesPanel(
                        sources = sources,
                        selectedSource = selectedSource,
                        onSelect = { selectedSource = it },
                        modifier = Modifier.fillMaxSize()
                    )
                    1 -> ReaderPanel(
                        selectedSource = selectedSource,
                        sources = sources,
                        onSelect = { selectedSource = it },
                        modifier = Modifier.fillMaxSize()
                    )
                    2 -> ChatPanel(
                        chatMessages = chatMessages,
                        chatInput = chatInput,
                        onInputChange = { chatInput = it },
                        selectedSource = selectedSource,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }
}

@Composable
fun SourcesPanel(
    sources: List<String>,
    selectedSource: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .background(Color(0xFF111111))
            .padding(8.dp)
    ) {
        item {
            Text(
                "Sources",
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFFFFFFFF),
                modifier = Modifier.padding(8.dp)
            )
        }
        items(sources) { src ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(4.dp)
                    .clickable { onSelect(src) },
                color = if (selectedSource == src) Color(0xFF1A1A1A) else Color.Transparent,
                border = if (selectedSource == src) BorderStroke(1.dp, Color(0xFF27272A)) else null,
                shape = RoundedCornerShape(4.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Outlined.PictureAsPdf,
                        contentDescription = null,
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = src,
                        fontSize = 13.sp,
                        color = Color(0xFFFFFFFF),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
        item {
            OutlinedButton(
                onClick = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp)
                    .heightIn(min = 48.dp),
                border = BorderStroke(1.dp, Color(0xFF22C55E)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF22C55E))
            ) {
                Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Add Source")
            }
        }
    }
}

@Composable
fun ReaderPanel(
    selectedSource: String?,
    sources: List<String> = emptyList(),
    onSelect: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lastOpened = sources.firstOrNull() ?: "Thermodynamics Ch1.pdf"

    Box(
        modifier = modifier
            .background(Color(0xFF0A0A0A))
            .fillMaxSize()
    ) {
        if (selectedSource == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header Prompt Card
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    color = Color(0xFF111111),
                    border = BorderStroke(1.dp, Color(0xFF27272A)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Surface(
                            shape = RoundedCornerShape(24.dp),
                            color = Color(0xFF22C55E).copy(alpha = 0.15f),
                            modifier = Modifier.padding(bottom = 12.dp)
                        ) {
                            Icon(
                                Icons.Outlined.MenuBook,
                                contentDescription = null,
                                tint = Color(0xFF22C55E),
                                modifier = Modifier
                                    .padding(12.dp)
                                    .size(32.dp)
                            )
                        }
                        Text(
                            text = "Select a source to read",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFFFFFF)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Choose a document from your library or pick from your recent sources below to view and analyze with AI.",
                            fontSize = 13.sp,
                            color = Color(0xFFA0A0A0),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }

                // Last-Opened Source Quick Action
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                        .clickable { onSelect(lastOpened) },
                    color = Color(0xFF111111),
                    border = BorderStroke(1.dp, Color(0xFF22C55E).copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).heightIn(min = 48.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                Icons.Outlined.PictureAsPdf,
                                contentDescription = null,
                                tint = Color(0xFFEF4444),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "LAST OPENED SOURCE",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF22C55E)
                                )
                                Text(
                                    text = lastOpened,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFFFFFFFF),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                        Button(
                            onClick = { onSelect(lastOpened) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF22C55E),
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Resume", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }

                // Recent Sources Section
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Recent Sources",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFFFFFFF),
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    sources.forEach { src ->
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clickable { onSelect(src) },
                            color = Color(0xFF111111),
                            border = BorderStroke(1.dp, Color(0xFF27272A)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp).heightIn(min = 48.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Outlined.PictureAsPdf,
                                    contentDescription = null,
                                    tint = Color(0xFFEF4444),
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = src,
                                    fontSize = 13.sp,
                                    color = Color(0xFFFFFFFF),
                                    modifier = Modifier.weight(1f),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "Open",
                                    fontSize = 12.sp,
                                    color = Color(0xFF22C55E),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
        } else {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Surface(
                    color = Color(0xFF0A0A0A),
                    border = BorderStroke(1.dp, Color(0xFF222222)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp).heightIn(min = 48.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Outlined.PictureAsPdf, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = selectedSource,
                            color = Color(0xFFFFFFFF),
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        IconButton(onClick = {
                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                type = "application/pdf"
                            }
                            try {
                                context.startActivity(intent)
                            } catch (e: Exception) {
                            }
                        }) {
                            Icon(Icons.Outlined.OpenInNew, contentDescription = "Open in external viewer", tint = Color(0xFF22C55E), modifier = Modifier.size(24.dp))
                        }
                    }
                }
                // Placeholder for PDF content
                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("📄", fontSize = 48.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(selectedSource, color = Color(0xFFA0A0A0))
                        Spacer(modifier = Modifier.height(16.dp))
                        OutlinedButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW).apply { type = "application/pdf" }
                                try {
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                }
                            },
                            border = BorderStroke(1.dp, Color(0xFF22C55E)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF22C55E)),
                            modifier = Modifier.heightIn(min = 48.dp)
                        ) {
                            Text("Open PDF")
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatPanel(
    chatMessages: androidx.compose.runtime.snapshots.SnapshotStateList<Pair<String, String>>,
    chatInput: String,
    onInputChange: (String) -> Unit,
    selectedSource: String?,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .background(Color(0xFF000000))
            .fillMaxSize()
    ) {
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .padding(8.dp)
        ) {
            items(chatMessages) { (role, content) ->
                val isUser = role == "user"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                ) {
                    Surface(
                        color = if (isUser) Color(0xFF22C55E) else Color(0xFF0F0F0F),
                        border = if (!isUser) BorderStroke(1.dp, Color(0xFF222222)) else null,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .widthIn(max = 240.dp)
                            .padding(4.dp)
                    ) {
                        Text(
                            text = content,
                            color = if (isUser) Color.Black else Color.White,
                            modifier = Modifier.padding(12.dp),
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
        Row(
            modifier = Modifier
                .background(Color(0xFF0A0A0A))
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = chatInput,
                onValueChange = onInputChange,
                modifier = Modifier.weight(1f),
                singleLine = true,
                placeholder = { Text("Ask about source...", color = Color(0xFF666666)) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF22C55E),
                    unfocusedBorderColor = Color(0xFF222222)
                )
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = {
                    if (chatInput.isNotBlank()) {
                        val q = chatInput
                        chatMessages.add("user" to q)
                        onInputChange("")
                        scope.launch {
                            delay(500)
                            chatMessages.add("assistant" to "Based on ${selectedSource ?: "the sources"}: $q — [Relevant excerpt would appear here from RAG retrieval]")
                        }
                    }
                },
                modifier = Modifier.size(48.dp)
            ) {
                Icon(Icons.Filled.Send, contentDescription = "Send", tint = Color(0xFF22C55E), modifier = Modifier.size(24.dp))
            }
        }
    }
}
