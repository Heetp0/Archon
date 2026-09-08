package com.example.archonnotesinkcanvas.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import kotlin.math.roundToInt

import com.example.archonnotesinkcanvas.theme.ArchonColors
import com.example.archonnotesinkcanvas.theme.ArchonDesignTokens

@Composable
fun RightSidebarPane(
    isOpen: Boolean,
    onClose: () -> Unit,
    windowSizeClass: WindowSizeClass,
    temperature: Float,
    onTemperatureChange: (Float) -> Unit,
    contextFiles: List<String>,
    activityLogs: List<String>,
    tokenUsage: Int,
    maxTokens: Int,
    onAddFile: (String) -> Unit = {},
    onRemoveFile: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val isExpanded = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Expanded
    val sidebarWidth = if (isExpanded) 256.dp else 280.dp

    var newFileName by remember { mutableStateOf("") }
    var showAddFileDialog by remember { mutableStateOf(false) }

    AnimatedVisibility(
        visible = isOpen,
        enter = slideInHorizontally(animationSpec = spring()) { it } + fadeIn(animationSpec = spring()),
        exit = slideOutHorizontally(animationSpec = spring()) { it } + fadeOut(animationSpec = spring()),
        modifier = modifier.animateContentSize(animationSpec = spring())
    ) {
        Surface(
            modifier = Modifier
                .fillMaxHeight()
                .width(sidebarWidth),
            color = ArchonDesignTokens.PanelBackground,
            border = androidx.compose.foundation.BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.60f))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp)
            ) {
                // Top bar / Header
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
                        Icon(
                            imageVector = Icons.Outlined.Tune,
                            contentDescription = null,
                            tint = Color(0xFF22C55E),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "MODEL & SESSION",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(
                            imageVector = Icons.Outlined.ChevronRight,
                            contentDescription = "Close Right Sidebar",
                            tint = Color(0xFF22C55E),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                HorizontalDivider(color = Color(0xFF1F1F1F), thickness = 1.dp, modifier = Modifier.padding(vertical = 8.dp))

                // Content scrollable column
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // SECTION 1: Token Usage Gauge & Stats
                    TokenUsageSection(tokenUsage = tokenUsage, maxTokens = maxTokens)

                    // SECTION 2: Model Controls (Temperature Slider)
                    ModelControlsSection(
                        temperature = temperature,
                        onTemperatureChange = onTemperatureChange
                    )

                    // SECTION 3: Context Files
                    ContextFilesSection(
                        files = contextFiles,
                        onAddClick = { showAddFileDialog = true },
                        onRemoveFile = onRemoveFile
                    )

                    // SECTION 4: Activity Feed
                    ActivityFeedSection(logs = activityLogs, modifier = Modifier.weight(1f))
                }
            }
        }
    }

    if (showAddFileDialog) {
        AlertDialog(
            onDismissRequest = { showAddFileDialog = false },
            title = { Text("Add Context File", color = Color.White) },
            text = {
                OutlinedTextField(
                    value = newFileName,
                    onValueChange = { newFileName = it },
                    label = { Text("Filename (e.g. notes.txt)") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF22C55E),
                        unfocusedBorderColor = Color(0xFF333333)
                    )
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newFileName.isNotBlank()) {
                            onAddFile(newFileName.trim())
                            newFileName = ""
                        }
                        showAddFileDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                ) {
                    Text("Add", color = Color.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddFileDialog = false }) {
                    Text("Cancel", color = Color.Gray)
                }
            },
            containerColor = Color(0xFF181818)
        )
    }
}

@Composable
private fun TokenUsageSection(tokenUsage: Int, maxTokens: Int) {
    val progress = (tokenUsage.toFloat() / maxTokens.toFloat()).coerceIn(0f, 1f)
    val percentage = (progress * 100).roundToInt()

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF141414),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF222222))
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Outlined.Speed, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                    Text("Token Usage", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Text("$percentage%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF22C55E))
            }

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = if (progress > 0.85f) Color(0xFFEF4444) else Color(0xFF22C55E),
                trackColor = Color(0xFF262626)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Used: $tokenUsage", fontSize = 10.sp, color = Color.Gray)
                Text("Max: $maxTokens", fontSize = 10.sp, color = Color.Gray)
            }
        }
    }
}

@Composable
private fun ModelControlsSection(
    temperature: Float,
    onTemperatureChange: (Float) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF141414),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF222222))
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Outlined.Thermostat, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                    Text("Temperature", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Text(
                    text = String.format("%.2f", temperature),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = Color(0xFF22C55E)
                )
            }

            Slider(
                value = temperature,
                onValueChange = onTemperatureChange,
                valueRange = 0.0f..1.0f,
                colors = SliderDefaults.colors(
                    thumbColor = Color(0xFF22C55E),
                    activeTrackColor = Color(0xFF22C55E),
                    inactiveTrackColor = Color(0xFF262626)
                )
            )
        }
    }
}

@Composable
private fun ContextFilesSection(
    files: List<String>,
    onAddClick: () -> Unit,
    onRemoveFile: (String) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF141414),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF222222))
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Outlined.FolderOpen, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                    Text("Context Files (${files.size})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
                IconButton(onClick = onAddClick, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Outlined.Add, contentDescription = "Add Context File", tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                }
            }

            if (files.isEmpty()) {
                Text("No context files attached", fontSize = 11.sp, color = Color.Gray)
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    files.forEach { file ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF1E1E1E), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(file, fontSize = 11.sp, color = Color.White, maxLines = 1, modifier = Modifier.weight(1f))
                            IconButton(onClick = { onRemoveFile(file) }, modifier = Modifier.size(20.dp)) {
                                Icon(Icons.Outlined.Close, contentDescription = "Remove", tint = Color.Gray, modifier = Modifier.size(12.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActivityFeedSection(
    logs: List<String>,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF141414),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF222222))
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Outlined.ReceiptLong, contentDescription = null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                Text("Activity Feed", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(logs) { log ->
                    Text(
                        text = log,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFFA0A0A0)
                    )
                }
            }
        }
    }
}
