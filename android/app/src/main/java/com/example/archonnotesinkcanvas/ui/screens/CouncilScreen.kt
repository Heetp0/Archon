package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.EmojiEmotions
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.Psychology
import androidx.compose.material.icons.outlined.School
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class AgentResponse(
    val role: String,
    val description: String,
    val accent: Color,
    val icon: ImageVector,
    val response: String,
    val isLoading: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CouncilScreen(windowSizeClass: WindowSizeClass) {
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf("") }
    
    var agents by remember {
        mutableStateOf(
            listOf(
                AgentResponse("Skeptic", "Challenges assumptions", Color(0xFFE11D48), Icons.Outlined.Psychology, ""),
                AgentResponse("Optimist", "Finds opportunities", Color(0xFF10B981), Icons.Outlined.EmojiEmotions, ""),
                AgentResponse("Expert", "Provides domain depth", Color(0xFF4F46E5), Icons.Outlined.School, ""),
                AgentResponse("Synthesizer", "Integrates all views", Color(0xFF00E599), Icons.Outlined.Hub, "")
            )
        )
    }

    var hasRun by remember { mutableStateOf(false) }

    fun runCouncil() {
        if (query.isBlank()) return
        hasRun = true
        
        agents = agents.map { 
            if (it.role != "Synthesizer") it.copy(isLoading = true, response = "")
            else it.copy(isLoading = false, response = "")
        }

        agents.filter { it.role != "Synthesizer" }.forEach { agent ->
            scope.launch {
                delay((1000..3000).random().toLong())
                agents = agents.map { 
                    if (it.role == agent.role) {
                        it.copy(isLoading = false, response = "[${it.role}] analysis of '$query'")
                    } else it
                }
                
                val allDone = agents.filter { it.role != "Synthesizer" }.all { !it.isLoading && it.response.isNotEmpty() }
                if (allDone) {
                    agents = agents.map {
                        if (it.role == "Synthesizer") {
                            it.copy(response = "Based on Skeptic, Optimist and Expert views: consensus on '$query'")
                        } else it
                    }
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050505))
    ) {
        val nonSynth = agents.filter { it.role != "Synthesizer" }
        val synth = agents.first { it.role == "Synthesizer" }

        // Top 40%: The Thinker Deck (3 side-by-side columns)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.40f)
                .background(Color(0xFF0A0A0C))
                .padding(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                nonSynth.forEach { agent ->
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF121214),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (agent.isLoading) Color(0xFFF59E0B) else Color(0xFF27272A)
                        )
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(agent.icon, contentDescription = null, tint = agent.accent, modifier = Modifier.size(16.dp))
                                Text(
                                    "[${agent.role}]",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                                Spacer(modifier = Modifier.weight(1f))
                                if (agent.isLoading) {
                                    CircularProgressIndicator(modifier = Modifier.size(12.dp), strokeWidth = 2.dp, color = Color(0xFFF59E0B))
                                }
                            }

                            HorizontalDivider(color = Color(0xFF27272A), modifier = Modifier.padding(vertical = 6.dp))

                            Text(
                                text = if (agent.isLoading) "Processing query..." else agent.response.ifEmpty { agent.description },
                                color = Color(0xFFA1A1AA),
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }

        HorizontalDivider(color = Color(0xFF27272A))

        // Bottom 60%: The Synthesizer Canvas
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.60f)
                .background(Color(0xFF050505))
                .padding(12.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Text(
                    "SYNTHESIZER CONSENSUS REPORT",
                    color = Color(0xFF00E599),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(8.dp))

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    if (synth.response.isEmpty()) {
                        Text(
                            "Enter a prompt below to multicast query to all 3 Thinker Deck models. Synthesizer will construct cross-referenced consensus report here.",
                            color = Color.Gray,
                            fontSize = 13.sp
                        )
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            item {
                                Surface(
                                    color = Color(0xFF121214),
                                    shape = RoundedCornerShape(8.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF00E599).copy(alpha = 0.4f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(
                                            synth.response,
                                            color = Color(0xFFE4E4E7),
                                            fontSize = 13.sp,
                                            lineHeight = 18.sp
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            "Citations: [Skeptic] [Optimist] [Expert]",
                                            color = Color(0xFF8B5CF6),
                                            fontSize = 10.sp,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Multicast Omnibar at bottom of Synthesizer (PC spec: Amber focus glow)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .background(Color(0xFF121214), RoundedCornerShape(24.dp))
                        .border(1.dp, Color(0xFFF59E0B).copy(alpha = 0.6f), RoundedCornerShape(24.dp))
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Multicast prompt to council...", color = Color.Gray, fontSize = 12.sp) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        singleLine = true
                    )
                    Button(
                        onClick = { runCouncil() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B), contentColor = Color.Black),
                        shape = RoundedCornerShape(18.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Text("Multicast", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun PreQueryAgentCard(agent: AgentResponse, modifier: Modifier = Modifier) {
    ElevatedCard(
        modifier = modifier.padding(8.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = Color(0xFF111111)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(
            modifier = Modifier.border(1.dp, Color(0xFF27272A), RoundedCornerShape(12.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
                Icon(
                    imageVector = agent.icon,
                    contentDescription = null,
                    tint = agent.accent,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = agent.role,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = agent.description,
                    fontSize = 13.sp,
                    color = Color(0xFFA1A1AA)
                )
            }
        }
    }
}

@Composable
fun PostQueryAgentCard(agent: AgentResponse, modifier: Modifier = Modifier) {
    ElevatedCard(
        modifier = modifier.padding(8.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = Color(0xFF111111)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(4.dp)
                    .background(agent.accent)
            )
            Column(modifier = Modifier.padding(16.dp).weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = agent.icon,
                            contentDescription = null,
                            tint = agent.accent,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = agent.role,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                            fontSize = 15.sp
                        )
                    }
                    if (agent.isLoading) {
                        CircularProgressIndicator(
                            color = agent.accent,
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .background(Color(0xFF10B981).copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text("DONE", color = Color(0xFF10B981), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                if (agent.isLoading) {
                    Text(
                        text = "Thinking...",
                        color = Color(0xFFA1A1AA),
                        fontSize = 14.sp
                    )
                } else if (agent.response.isNotEmpty()) {
                    Text(
                        text = agent.response,
                        color = Color.White,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
fun SynthesisCard(agent: AgentResponse, modifier: Modifier = Modifier) {
    ElevatedCard(
        modifier = modifier.padding(8.dp).fillMaxWidth(),
        colors = CardDefaults.elevatedCardColors(
            containerColor = Color(0xFF0A1628)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box(
            modifier = Modifier.border(1.dp, Color(0xFF00E599), RoundedCornerShape(12.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
                Text(
                    text = "SYNTHESIS",
                    color = Color(0xFF00E599),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 2.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = agent.response,
                    color = Color.White,
                    fontSize = 14.sp
                )
            }
        }
    }
}

