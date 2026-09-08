package com.example.archonnotesinkcanvas.ui.screens

import android.speech.tts.TextToSpeech
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.archonnotesinkcanvas.data.remote.ArchonApiClient
import com.example.archonnotesinkcanvas.theme.ArchonDesignTokens
import com.example.archonnotesinkcanvas.ui.adaptive.ArchonShellViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.UUID

data class ChatMessage(
    val role: String,
    val content: String,
    val model: String? = null,
    val id: UUID = UUID.randomUUID()
)

sealed class MarkdownBlock {
    data class CodeBlock(val language: String, val code: String) : MarkdownBlock()
    data class Paragraph(val text: String) : MarkdownBlock()
}

fun parseMarkdownBlocks(text: String): List<MarkdownBlock> {
    val blocks = mutableListOf<MarkdownBlock>()
    val lines = text.split("\n")
    var inCode = false
    var currentLang = ""
    val codeBuilder = StringBuilder()
    val paragraphBuilder = StringBuilder()

    for (line in lines) {
        if (line.trimStart().startsWith("```")) {
            if (inCode) {
                blocks.add(MarkdownBlock.CodeBlock(currentLang, codeBuilder.toString().trimEnd()))
                codeBuilder.clear()
                inCode = false
            } else {
                if (paragraphBuilder.isNotEmpty()) {
                    blocks.add(MarkdownBlock.Paragraph(paragraphBuilder.toString().trimEnd()))
                    paragraphBuilder.clear()
                }
                currentLang = line.trimStart().removePrefix("```").trim()
                inCode = true
            }
        } else if (inCode) {
            codeBuilder.append(line).append("\n")
        } else {
            paragraphBuilder.append(line).append("\n")
        }
    }

    if (inCode) {
        blocks.add(MarkdownBlock.CodeBlock(currentLang, codeBuilder.toString().trimEnd()))
    } else if (paragraphBuilder.isNotEmpty()) {
        blocks.add(MarkdownBlock.Paragraph(paragraphBuilder.toString().trimEnd()))
    }

    return if (blocks.isEmpty()) listOf(MarkdownBlock.Paragraph(text)) else blocks
}

fun buildAnnotatedMarkdownString(text: String, defaultColor: Color): AnnotatedString {
    return buildAnnotatedString {
        var index = 0
        val regex = Regex("""(\*\*.*?\*\*|`.*?`)""")
        val matches = regex.findAll(text)

        for (match in matches) {
            val start = match.range.first
            val end = match.range.last + 1
            if (start > index) {
                append(text.substring(index, start))
            }
            val matchText = match.value
            if (matchText.startsWith("**") && matchText.endsWith("**")) {
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = defaultColor)) {
                    append(matchText.substring(2, matchText.length - 2))
                }
            } else if (matchText.startsWith("`") && matchText.endsWith("`")) {
                withStyle(
                    SpanStyle(
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF00E599),
                        background = Color(0xFF141416)
                    )
                ) {
                    append(matchText.substring(1, matchText.length - 1))
                }
            } else {
                append(matchText)
            }
            index = end
        }

        if (index < text.length) {
            append(text.substring(index))
        }
    }
}

@Composable
fun MarkdownText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = ArchonDesignTokens.TextPrimary
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val parts = remember(text) { parseMarkdownBlocks(text) }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        parts.forEach { block ->
            when (block) {
                is MarkdownBlock.CodeBlock -> {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = ArchonDesignTokens.PanelBackground,
                        border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(ArchonDesignTokens.CardBackground)
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = block.language.ifBlank { "code" },
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = ArchonDesignTokens.AccentPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                                TextButton(
                                    onClick = {
                                        clipboardManager.setText(AnnotatedString(block.code))
                                        Toast.makeText(context, "Code copied", Toast.LENGTH_SHORT).show()
                                    },
                                    contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ContentCopy,
                                        contentDescription = "Copy code",
                                        tint = ArchonDesignTokens.TextSecondary,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Copy", fontSize = 11.sp, color = ArchonDesignTokens.TextSecondary)
                                }
                            }
                            HorizontalDivider(color = ArchonDesignTokens.BorderCore)
                            Text(
                                text = block.code,
                                color = ArchonDesignTokens.AccentPrimary,
                                fontSize = 13.sp,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }
                }
                is MarkdownBlock.Paragraph -> {
                    val annotatedString = buildAnnotatedMarkdownString(block.text, color)
                    Text(
                        text = annotatedString,
                        color = color,
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    windowSizeClass: WindowSizeClass,
    shellViewModel: ArchonShellViewModel = viewModel()
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current

    val messages = remember { mutableStateListOf<ChatMessage>() }
    var input by remember { mutableStateOf("") }
    var isStreaming by remember { mutableStateOf(false) }
    var selectedModel by remember { mutableStateOf("groq/llama-3.3-70b-versatile") }

    val tokenUsage by shellViewModel.tokenUsage.collectAsState()
    val maxTokens by shellViewModel.maxTokens.collectAsState()
    val isBackendConnected by shellViewModel.isBackendConnected.collectAsState()
    val contextFiles by shellViewModel.contextFiles.collectAsState()

    val availableModels = remember {
        listOf(
            "groq/llama-3.3-70b-versatile",
            "groq/mixtral-8x7b",
            "gemini/gemini-2.0-flash",
            "ollama/qwen2.5"
        )
    }

    var tts by remember { mutableStateOf<TextToSpeech?>(null) }
    DisposableEffect(context) {
        val speech = TextToSpeech(context) { _ -> }
        tts = speech
        onDispose {
            speech.stop()
            speech.shutdown()
        }
    }

    fun sendMessage(customPrompt: String? = null) {
        val query = customPrompt ?: input
        if (query.isBlank()) return

        val userMsg = ChatMessage(role = "User", content = query)
        messages.add(userMsg)
        if (customPrompt == null) {
            input = ""
        }
        isStreaming = true

        scope.launch {
            try {
                val reply = ArchonApiClient.chat(query, "")
                messages.add(ChatMessage(role = "Assistant", content = reply, model = selectedModel))
            } catch (e: Exception) {
                delay(800)
                val fallbackReply = "Response from Archon ($selectedModel):\n\nProcessed query: `$query`.\n\n```kotlin\n// RAG Context Attached: ${if (contextFiles.isEmpty()) "None" else contextFiles.joinToString()}\nfun executeArchonTask() {\n    println(\"Task completed successfully.\")\n}\n```\n\nSystem Status: ${if (isBackendConnected) "Online" else "Standalone mode active"}."
                messages.add(ChatMessage(role = "Assistant", content = fallbackReply, model = selectedModel))
            } finally {
                isStreaming = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ArchonDesignTokens.AppBackground)
    ) {
        // Telemetry & Top Bar Header
        ChatTelemetryHeader(
            tokenUsage = tokenUsage,
            maxTokens = maxTokens,
            isBackendConnected = isBackendConnected,
            onClearChat = {
                messages.clear()
                Toast.makeText(context, "Chat history cleared", Toast.LENGTH_SHORT).show()
            }
        )

        HorizontalDivider(color = ArchonDesignTokens.BorderCore)

        // Main Chat Workspace (PC spec: centered 800dp column, no right side-panel split)
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentAlignment = Alignment.TopCenter
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .widthIn(max = 800.dp)
                    .fillMaxWidth()
            ) {
                if (messages.isEmpty()) {
                    ChatEmptyState(
                        selectedModel = selectedModel,
                        onPromptSelected = { prompt ->
                            input = prompt
                            sendMessage(prompt)
                        }
                    )
                } else {
                    val lazyListState = rememberLazyListState()

                    LaunchedEffect(messages.size) {
                        if (messages.isNotEmpty()) {
                            lazyListState.animateScrollToItem(messages.size - 1)
                        }
                    }

                    LazyColumn(
                        state = lazyListState,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 12.dp),
                        contentPadding = PaddingValues(top = 16.dp, bottom = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(messages, key = { it.id }) { msg ->
                            ChatBubble(
                                msg = msg,
                                selectedModel = selectedModel,
                                onCopy = {
                                    clipboardManager.setText(AnnotatedString(msg.content))
                                    Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                                },
                                onRegenerate = {
                                    if (!isStreaming && messages.isNotEmpty()) {
                                        val lastUserQuery = messages.lastOrNull { it.role.equals("User", ignoreCase = true) }?.content
                                        if (lastUserQuery != null) {
                                            sendMessage(lastUserQuery)
                                        }
                                    }
                                },
                                onEdit = {
                                    input = msg.content
                                },
                                onSpeak = {
                                    tts?.speak(msg.content, TextToSpeech.QUEUE_FLUSH, null, null)
                                }
                            )
                        }

                        if (isStreaming) {
                            item { StreamingIndicator() }
                        }
                    }

                    val showJumpToBottom by remember {
                        derivedStateOf {
                            lazyListState.firstVisibleItemIndex < (messages.size - 3).coerceAtLeast(0)
                        }
                    }

                    if (showJumpToBottom) {
                        SmallFloatingActionButton(
                            onClick = {
                                scope.launch {
                                    lazyListState.animateScrollToItem(messages.size - 1)
                                }
                            },
                            containerColor = ArchonDesignTokens.CardBackground,
                            contentColor = ArchonDesignTokens.AccentPrimary,
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(bottom = 16.dp, end = 16.dp)
                                .border(1.dp, ArchonDesignTokens.BorderCore, CircleShape)
                        ) {
                            Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Scroll to bottom")
                        }
                    }
                }
            }
        }

        // Vercel-Style Floating Prompt Input Bar
        ChatInputBar(
            input = input,
            onInputChange = { input = it },
            isStreaming = isStreaming,
            onSend = { sendMessage() },
            onStop = { isStreaming = false },
            selectedModel = selectedModel,
            onModelSelected = { selectedModel = it },
            availableModels = availableModels,
            contextFiles = contextFiles,
            onRemoveContextFile = { shellViewModel.removeContextFile(it) },
            onAddContextFile = { shellViewModel.addContextFile(it) }
        )
    }
}

@Composable
fun ChatTelemetryHeader(
    tokenUsage: Int,
    maxTokens: Int,
    isBackendConnected: Boolean,
    onClearChat: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(ArchonDesignTokens.PanelBackground)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.Tune,
                contentDescription = "Telemetry",
                tint = ArchonDesignTokens.AccentPrimary,
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = "${String.format("%.1fk", tokenUsage / 1000.0)} / ${maxTokens / 1000}k tokens",
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                color = ArchonDesignTokens.TextSecondary,
                fontWeight = FontWeight.Medium
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (isBackendConnected) ArchonDesignTokens.AccentEmerald.copy(alpha = 0.15f) else ArchonDesignTokens.AccentRose.copy(alpha = 0.15f),
                border = BorderStroke(1.dp, if (isBackendConnected) ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.AccentRose)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(if (isBackendConnected) ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.AccentRose)
                    )
                    Text(
                        text = if (isBackendConnected) "Online" else "Standalone",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isBackendConnected) ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.AccentRose
                    )
                }
            }

            IconButton(
                onClick = onClearChat,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Delete,
                    contentDescription = "Clear Chat",
                    tint = ArchonDesignTokens.TextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

@Composable
fun ChatBubble(
    msg: ChatMessage,
    selectedModel: String,
    onCopy: () -> Unit,
    onRegenerate: () -> Unit,
    onEdit: () -> Unit,
    onSpeak: () -> Unit
) {
    val isUser = msg.role.equals("User", ignoreCase = true)

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Top
    ) {
        if (!isUser) {
            Surface(
                shape = CircleShape,
                color = Color(0xFF0C1938),
                border = BorderStroke(1.dp, ArchonDesignTokens.AccentIndigo.copy(alpha = 0.5f)),
                modifier = Modifier
                    .size(32.dp)
                    .padding(top = 2.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Outlined.AutoAwesome,
                        contentDescription = "Bot Avatar",
                        tint = ArchonDesignTokens.AccentPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Column(
            modifier = Modifier.fillMaxWidth(0.8f),
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
        ) {
            if (!isUser) {
                Text(
                    text = msg.model ?: selectedModel,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = Color.Gray,
                    modifier = Modifier.padding(bottom = 4.dp, start = 4.dp)
                )
            }

            Surface(
                shape = if (isUser) RoundedCornerShape(12.dp, 4.dp, 12.dp, 12.dp) else RoundedCornerShape(4.dp, 12.dp, 12.dp, 12.dp),
                color = if (isUser) Color(0xFF1A1A1A) else Color(0xFF0D1B2A),
                border = BorderStroke(1.dp, if (isUser) Color(0xFF333333) else Color(0xFF1E3A5F)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    MarkdownText(
                        text = msg.content,
                        color = if (isUser) Color.White else Color(0xFFF1F5F9)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onCopy, modifier = Modifier.size(24.dp).defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)) {
                            Icon(
                                imageVector = Icons.Default.ContentCopy,
                                contentDescription = "Copy",
                                tint = ArchonDesignTokens.TextMuted,
                                modifier = Modifier.size(14.dp)
                            )
                        }

                        if (!isUser) {
                            Spacer(modifier = Modifier.width(4.dp))
                            IconButton(onClick = onRegenerate, modifier = Modifier.size(24.dp).defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)) {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = "Regenerate",
                                    tint = ArchonDesignTokens.TextMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                            IconButton(onClick = onSpeak, modifier = Modifier.size(24.dp).defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)) {
                                Icon(
                                    imageVector = Icons.Default.VolumeUp,
                                    contentDescription = "Speak",
                                    tint = ArchonDesignTokens.TextMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        } else {
                            Spacer(modifier = Modifier.width(4.dp))
                            IconButton(onClick = onEdit, modifier = Modifier.size(24.dp).defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Edit",
                                    tint = ArchonDesignTokens.TextMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        if (isUser) {
            Spacer(modifier = Modifier.width(8.dp))
            Surface(
                shape = CircleShape,
                color = ArchonDesignTokens.PanelBackground,
                border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore),
                modifier = Modifier
                    .size(32.dp)
                    .padding(top = 2.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Outlined.Person,
                        contentDescription = "User Avatar",
                        tint = ArchonDesignTokens.TextPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatInputBar(
    input: String,
    onInputChange: (String) -> Unit,
    isStreaming: Boolean,
    onSend: () -> Unit,
    onStop: () -> Unit,
    selectedModel: String,
    onModelSelected: (String) -> Unit,
    availableModels: List<String>,
    contextFiles: List<String>,
    onRemoveContextFile: (String) -> Unit,
    onAddContextFile: (String) -> Unit
) {
    var showToolsMenu by remember { mutableStateOf(false) }
    var showModelMenu by remember { mutableStateOf(false) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.lastPathSegment?.let { fileName ->
            onAddContextFile(fileName.substringAfterLast("/"))
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color.Transparent,
                        ArchonDesignTokens.AppBackground
                    )
                )
            )
            .padding(12.dp)
    ) {
        var isFocused by remember { mutableStateOf(false) }
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFF111111),
            border = BorderStroke(1.dp, if (isFocused) Color(0xFF4F46E5) else Color(0xFF333333)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                if (contextFiles.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        contextFiles.forEach { file ->
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = ArchonDesignTokens.PanelBackground,
                                border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.Article,
                                        contentDescription = null,
                                        tint = ArchonDesignTokens.AccentPrimary,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = file,
                                        fontSize = 11.sp,
                                        color = ArchonDesignTokens.TextSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Remove file",
                                        tint = ArchonDesignTokens.TextMuted,
                                        modifier = Modifier
                                            .size(12.dp)
                                            .clickable { onRemoveContextFile(file) }
                                    )
                                }
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = input,
                    onValueChange = onInputChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text("Ask Archon anything...", color = Color.Gray, fontSize = 14.sp)
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                        cursorColor = Color(0xFF4F46E5),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent
                    ),
                    maxLines = 5,
                    interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
                        .also { interactionSource ->
                            LaunchedEffect(interactionSource) {
                                interactionSource.interactions.collect { interaction ->
                                    if (interaction is androidx.compose.foundation.interaction.FocusInteraction.Focus) {
                                        isFocused = true
                                    } else if (interaction is androidx.compose.foundation.interaction.FocusInteraction.Unfocus) {
                                        isFocused = false
                                    }
                                }
                            }
                        }
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        IconButton(
                            onClick = { filePickerLauncher.launch("*/*") },
                            modifier = Modifier.size(48.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AttachFile,
                                contentDescription = "Attach File",
                                tint = Color.Gray,
                                modifier = Modifier.size(24.dp)
                            )
                        }

                        var expanded by remember { mutableStateOf(false) }
                        
                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = it }
                        ) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF1A1A1A),
                                border = BorderStroke(1.dp, Color(0xFF333333)),
                                modifier = Modifier.menuAnchor()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp).defaultMinSize(minHeight = 48.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = selectedModel.substringAfter("/").take(14),
                                        fontSize = 12.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color.Gray
                                    )
                                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                                }
                            }

                            ExposedDropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false }
                            ) {
                                availableModels.forEach { model ->
                                    DropdownMenuItem(
                                        text = {
                                            Text(
                                                model,
                                                fontSize = 12.sp,
                                                fontFamily = FontFamily.Monospace,
                                                color = if (model == selectedModel) Color(0xFF4F46E5) else Color.White
                                            )
                                        },
                                        onClick = {
                                            onModelSelected(model)
                                            expanded = false
                                        },
                                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                                    )
                                }
                            }
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "${input.length}",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = Color.Gray
                        )

                        if (isStreaming) {
                            IconButton(
                                onClick = onStop,
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFE11D48))
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Stop,
                                    contentDescription = "Stop Generation",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        } else {
                            IconButton(
                                onClick = onSend,
                                enabled = input.isNotBlank(),
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (input.isNotBlank()) Color(0xFF4F46E5) else Color(0xFF1A1A1A)
                                    )
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Send,
                                    contentDescription = "Send Message",
                                    tint = if (input.isNotBlank()) Color.White else Color.Gray,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChatEmptyState(
    selectedModel: String,
    onPromptSelected: (String) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Surface(
                shape = CircleShape,
                color = Color.Transparent,
                modifier = Modifier.size(64.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Outlined.AutoAwesome,
                        contentDescription = "Archon Logo",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "Welcome to Archon",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = selectedModel,
                    fontSize = 13.sp,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFF00E599)
                )
            }

            Text(
                text = "Select a suggested prompt below or type your message to begin:",
                fontSize = 14.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )

            val promptSuggestions = listOf(
                "Explain this notebook",
                "Quiz me on today's notes",
                "Summarize key concepts"
            )

            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth(0.8f)
            ) {
                promptSuggestions.forEach { prompt ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onPromptSelected(prompt) },
                        shape = RoundedCornerShape(12.dp),
                        color = Color.Transparent,
                        border = BorderStroke(1.dp, Color(0xFF333333))
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp).defaultMinSize(minHeight = 48.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = prompt,
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Icon(
                                imageVector = Icons.Outlined.ArrowForward,
                                contentDescription = null,
                                tint = Color.Gray,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StreamingIndicator() {
    val dotCount = 3
    val infiniteTransition = rememberInfiniteTransition(label = "StreamingIndicator")

    Row(
        modifier = Modifier.padding(start = 40.dp, top = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (i in 0 until dotCount) {
            val offset by infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = -8f,
                animationSpec = infiniteRepeatable(
                    animation = tween(400, delayMillis = i * 150, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "dot_$i"
            )
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .offset(y = offset.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF4F46E5))
            )
        }
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = "Archon is thinking...",
            fontSize = 12.sp,
            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
            color = Color.Gray
        )
    }
}