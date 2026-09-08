package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import com.example.archonnotesinkcanvas.data.remote.BackendConfigStore
import com.example.archonnotesinkcanvas.data.remote.ArchonApiClient
import kotlinx.coroutines.launch

enum class SettingsCategory(val title: String) {
    BACKEND("BACKEND CONNECTION"),
    MODEL("MODEL CONFIGURATION"),
    AGENTS("AGENTS DIRECTORY"),
    SYNC("SYNC & STORAGE"),
    ABOUT("ABOUT")
}

@Composable
fun SettingsModal(
    windowSizeClass: WindowSizeClass,
    onDismiss: () -> Unit
) {
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .width(800.dp)
                .height(560.dp),
            shape = RoundedCornerShape(12.dp),
            color = Color(0xFF121214),
            border = BorderStroke(1.dp, Color(0xFF27272A))
        ) {
            var selectedCategory by remember { mutableStateOf(SettingsCategory.BACKEND) }

            Column(modifier = Modifier.fillMaxSize()) {
                // Modal Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .background(Color(0xFF0A0A0C))
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "GLOBAL SETTINGS & SECURITY SANDBOX",
                        color = Color(0xFFE4E4E7),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                    TextButton(onClick = onDismiss) {
                        Text("Close", color = Color(0xFFA1A1AA), fontSize = 12.sp)
                    }
                }

                HorizontalDivider(color = Color(0xFF27272A))

                Row(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    // Left navigation column (200dp)
                    Column(
                        modifier = Modifier
                            .width(200.dp)
                            .fillMaxHeight()
                            .background(Color(0xFF0A0A0C))
                            .padding(12.dp)
                    ) {
                        SettingsCategory.values().forEach { category ->
                            CategoryItem(
                                category = category,
                                isSelected = selectedCategory == category,
                                onClick = { selectedCategory = category }
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                        }
                    }

                    VerticalDivider(color = Color(0xFF27272A))

                    // Right workspace content (flex)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .padding(16.dp)
                    ) {
                        CategoryContent(category = selectedCategory)
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(windowSizeClass: WindowSizeClass) {
    SettingsModal(windowSizeClass = windowSizeClass, onDismiss = {})
}

@Composable
fun CategoryItem(category: SettingsCategory, isSelected: Boolean, onClick: () -> Unit) {
    val bgColor = if (isSelected) Color(0xFF111111) else Color.Transparent
    val borderColor = if (isSelected) Color(0xFF4F46E5) else Color.Transparent
    val textColor = if (isSelected) Color.White else Color.Gray

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        color = bgColor,
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Text(
            text = category.title,
            color = textColor,
            modifier = Modifier.padding(16.dp),
            fontFamily = FontFamily.Monospace,
            fontSize = 12.sp,
            letterSpacing = 2.sp
        )
    }
}

@Composable
fun CategoryContent(category: SettingsCategory) {
    Column(modifier = Modifier.fillMaxWidth()) {
        SectionHeader(title = category.title)
        Spacer(modifier = Modifier.height(12.dp))
        when (category) {
            SettingsCategory.BACKEND -> BackendSection()
            SettingsCategory.MODEL -> ModelConfigurationSection()
            SettingsCategory.AGENTS -> AgentsDirectorySection()
            SettingsCategory.SYNC -> SyncAndStorageSection()
            SettingsCategory.ABOUT -> AboutSection()
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        color = Color(0xFF00E599),
        fontSize = 10.sp,
        fontFamily = FontFamily.Monospace,
        letterSpacing = 2.sp
    )
}

@Composable
fun BackendSection() {
    val context = LocalContext.current
    val store = remember { BackendConfigStore(context) }
    val backendUrlState = store.backendUrl.collectAsState(initial = com.example.archonnotesinkcanvas.BuildConfig.BACKEND_URL)
    val scope = rememberCoroutineScope()
    
    var urlDraft by remember { mutableStateOf(backendUrlState.value) }
    var pingResult by remember { mutableStateOf<String?>(null) }
    var pinging by remember { mutableStateOf(false) }

    LaunchedEffect(backendUrlState.value) {
        urlDraft = backendUrlState.value
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111111)),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFF1E1E1E)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            OutlinedTextField(
                value = urlDraft,
                onValueChange = { urlDraft = it },
                textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 13.sp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color(0xFF111111),
                    unfocusedContainerColor = Color(0xFF111111),
                    focusedBorderColor = Color(0xFF4F46E5),
                    unfocusedBorderColor = Color(0xFF333333),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                modifier = Modifier.fillMaxWidth()
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            store.setBackendUrl(urlDraft)
                            pinging = true
                            pingResult = try {
                                if (ArchonApiClient.health()) "Connected" else "Disconnected"
                            } catch (e: Exception) {
                                "Disconnected"
                            }
                            pinging = false
                        }
                    },
                    modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                    border = BorderStroke(1.dp, Color(0xFF4F46E5)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF4F46E5))
                ) {
                    Text("Test Connection")
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                val isConnected = pingResult == "Connected"
                if (pingResult != null) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(if (isConnected) Color(0xFF00E599) else Color.Red, RoundedCornerShape(4.dp))
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = pingResult ?: "",
                        color = if (isConnected) Color(0xFF00E599) else Color.Red,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModelConfigurationSection() {
    var maxTokens by remember { mutableStateOf("2048") }
    var temperature by remember { mutableStateOf(0.7f) }
    var expanded by remember { mutableStateOf(false) }
    val models = listOf("Qwen 2.5 7B", "GPT-4o", "Claude 3.5 Sonnet")
    var selectedModel by remember { mutableStateOf(models[0]) }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111111)),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFF1E1E1E)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Default Model", color = Color.Gray, fontSize = 12.sp)
            Spacer(modifier = Modifier.height(8.dp))
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded }
            ) {
                OutlinedTextField(
                    value = selectedModel,
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFF0A0A0A),
                        unfocusedContainerColor = Color(0xFF0A0A0A),
                        focusedBorderColor = Color(0xFF4F46E5),
                        unfocusedBorderColor = Color(0xFF333333),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                    modifier = Modifier.background(Color(0xFF111111))
                ) {
                    models.forEach { selectionOption ->
                        DropdownMenuItem(
                            text = { Text(selectionOption, color = Color.White) },
                            onClick = {
                                selectedModel = selectionOption
                                expanded = false
                            },
                            contentPadding = ExposedDropdownMenuDefaults.ItemContentPadding
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            Text("Temperature: ${String.format("%.1f", temperature)}", color = Color.Gray, fontSize = 12.sp)
            Slider(
                value = temperature,
                onValueChange = { temperature = it },
                valueRange = 0f..1f,
                colors = SliderDefaults.colors(
                    thumbColor = Color(0xFF00E599),
                    activeTrackColor = Color(0xFF00E599),
                    inactiveTrackColor = Color(0xFF27272A)
                )
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(
                value = maxTokens,
                onValueChange = { maxTokens = it },
                label = { Text("Max Tokens", color = Color.Gray) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color(0xFF0A0A0A),
                    unfocusedContainerColor = Color(0xFF0A0A0A),
                    focusedBorderColor = Color(0xFF4F46E5),
                    unfocusedBorderColor = Color(0xFF333333),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

data class AgentStub(val name: String, val description: String, val roles: List<String>, val enabled: Boolean)

@Composable
fun AgentsDirectorySection() {
    val agents = listOf(
        AgentStub("Archon Core", "Main system coordinator. Routes tasks to appropriate agents.", listOf("Core", "Router"), true),
        AgentStub("Research Agent", "Searches internal DB and web for deep insights.", listOf("Research", "Web"), true),
        AgentStub("Council Moderator", "Handles disputes and aggregates agent opinions.", listOf("Council", "Admin"), false),
        AgentStub("OCR Trainer", "Improves handwriting recognition with human feedback.", listOf("Vision", "ML"), true)
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Sort by: ", color = Color.Gray, fontSize = 12.sp)
            Spacer(modifier = Modifier.width(8.dp))
            listOf("Role", "Name", "Status").forEach { chip ->
                Surface(
                    color = Color(0xFF111111),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color(0xFF27272A)),
                    modifier = Modifier.padding(end = 8.dp)
                ) {
                    Text(chip, color = Color.White, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
                }
            }
        }

        agents.forEach { agent ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111111)),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0xFF27272A)),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = agent.name,
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(if (agent.enabled) Color(0xFF00E599) else Color.Gray, RoundedCornerShape(4.dp))
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = agent.description,
                        color = Color.Gray,
                        fontSize = 13.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row {
                            agent.roles.forEach { role ->
                                Surface(
                                    color = Color(0xFF1A2744),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.padding(end = 8.dp)
                                ) {
                                    Text(
                                        text = role,
                                        color = Color(0xFF4F46E5),
                                        fontSize = 11.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                        
                        OutlinedButton(
                            onClick = { },
                            modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                            border = BorderStroke(1.dp, Color(0xFF4F46E5)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF4F46E5))
                        ) {
                            Text("Configure")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SyncAndStorageSection() {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111111)),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFF1E1E1E)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Syncthing Status", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Text("Last synced: 2 mins ago", color = Color.Gray, fontSize = 12.sp)
                }
                Button(
                    onClick = { },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
                    modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                ) {
                    Text("Sync Now")
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = Color(0xFF1E1E1E))
            Spacer(modifier = Modifier.height(16.dp))
            
            Text("Local Database Stats", color = Color.White, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Total Pages:", color = Color.Gray)
                Text("1,204", color = Color.White)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Total Notebooks:", color = Color.Gray)
                Text("42", color = Color.White)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Storage Used:", color = Color.Gray)
                Text("450 MB", color = Color.White)
            }
        }
    }
}

@Composable
fun AboutSection() {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111111)),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFF1E1E1E)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("App Version", color = Color.Gray)
                Text("v1.0.0-R4", color = Color.White)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Build Number", color = Color.Gray)
                Text("2026.8", color = Color.White)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("GitHub", color = Color.Gray)
                Text("github.com/archon", color = Color(0xFF4F46E5))
            }
        }
    }
}
