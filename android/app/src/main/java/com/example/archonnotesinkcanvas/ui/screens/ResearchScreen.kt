package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.KeyboardArrowUp
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class ResearchSource(
    val id: String,
    val name: String,
    val snippet: String
)

data class ResearchResult(
    val id: String,
    val title: String,
    val snippet: String,
    val sourceName: String
)

data class GraphNode(
    val label: String,
    val pos: Offset,
    val isExternal: Boolean
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResearchScreen(windowSizeClass: WindowSizeClass) {
    var query by remember { mutableStateOf("") }
    var isResearching by remember { mutableStateOf(false) }
    var hasSearched by remember { mutableStateOf(false) }
    var selectedSourceId by remember { mutableStateOf<String?>(null) }
    var sourcesExpandedOnPhone by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    val sources = remember {
        listOf(
            ResearchSource("1", "quantum_error_correction.pdf", "Quantum error correction (QEC) is used in quantum computing to protect quantum information..."),
            ResearchSource("2", "surface_codes_2023.txt", "Surface codes are a class of topological quantum error correcting codes..."),
            ResearchSource("3", "fault_tolerance_notes.md", "Fault-tolerant quantum computation requires error rates below the threshold...")
        )
    }

    val results = remember {
        listOf(
            ResearchResult("r1", "Topological Qubits Overview", "Topological quantum computers employ anyons to encode and process quantum information, providing inherent protection against local noise...", "quantum_error_correction.pdf"),
            ResearchResult("r2", "Threshold Theorem", "The threshold theorem states that arbitrarily long quantum computation can be performed reliably provided the error rate per operation is below a certain value...", "fault_tolerance_notes.md"),
            ResearchResult("r3", "Logical vs Physical Qubits", "A logical qubit is a robust qubit formed from many physical qubits using a quantum error correcting code, typically requiring hundreds of physical qubits...", "surface_codes_2023.txt")
        )
    }

    fun startResearch() {
        if (query.isBlank()) return
        isResearching = true
        scope.launch {
            delay(1000)
            isResearching = false
            hasSearched = true
        }
    }

    val isExpanded = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Expanded

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF000000))
    ) {
        // Search bar at top
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0A0A0A))
                .padding(16.dp)
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search research sources...", color = Color(0xFF666666)) },
                leadingIcon = {
                    Icon(
                        Icons.Outlined.Search,
                        contentDescription = "Search",
                        tint = Color(0xFF666666),
                        modifier = Modifier.size(20.dp)
                    )
                },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { 
                            query = ""
                            hasSearched = false 
                        }) {
                            Icon(
                                Icons.Filled.Close,
                                contentDescription = "Clear",
                                tint = Color(0xFF666666),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF333333),
                    unfocusedBorderColor = Color(0xFF333333),
                    focusedContainerColor = Color(0xFF111111),
                    unfocusedContainerColor = Color(0xFF111111)
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
        }

        HorizontalDivider(color = Color(0xFF27272A), thickness = 1.dp)

        if (isExpanded) {
            // Center Workspace: 2D Knowledge Graph Canvas (PC spec)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF050505))
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Graph Canvas Bar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF0A0A0C))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "2D KNOWLEDGE GRAPH",
                            color = Color(0xFF8B5CF6),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            letterSpacing = 1.sp
                        )
                        Text(
                            "Nodes: 8 Ingested | Connections: 14",
                            color = Color.Gray,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    HorizontalDivider(color = Color(0xFF27272A))

                    // Canvas area with nodes and vector connecting edges
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .background(Color(0xFF050505))
                            .padding(16.dp)
                    ) {
                        // Render Nodes Graph
                        val graphNodes = remember {
                            listOf(
                                GraphNode("Ethical_Guidelines.txt", Offset(120f, 150f), false),
                                GraphNode("Neural_OCR_Weights.bin", Offset(350f, 100f), false),
                                GraphNode("Transformer Attention v2", Offset(220f, 260f), true),
                                GraphNode("Vector Quantization", Offset(480f, 220f), true),
                                GraphNode("Quantum Error Correction", Offset(160f, 400f), true)
                            )
                        }

                        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
                            // Draw vector edges between nodes
                            for (i in 0 until graphNodes.size - 1) {
                                drawLine(
                                    color = Color(0xFF27272A),
                                    start = graphNodes[i].pos,
                                    end = graphNodes[i + 1].pos,
                                    strokeWidth = 1.5f
                                )
                            }
                        }

                        // Draw Node Circles and Labels
                        graphNodes.forEach { node ->
                            Surface(
                                modifier = Modifier
                                    .offset(x = node.pos.x.dp, y = node.pos.y.dp)
                                    .clip(RoundedCornerShape(20.dp))
                                    .clickable { selectedSourceId = node.label },
                                color = if (node.isExternal) Color(0xFF8B5CF6).copy(alpha = 0.2f) else Color(0xFF141416),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (node.isExternal) Color(0xFF8B5CF6) else Color(0xFF27272A)
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .background(if (node.isExternal) Color(0xFF8B5CF6) else Color(0xFF00E599), CircleShape)
                                    )
                                    Text(
                                        node.label,
                                        color = Color(0xFFE4E4E7),
                                        fontSize = 11.sp,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Phone Layout
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { sourcesExpandedOnPhone = !sourcesExpandedOnPhone }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "SOURCES (${sources.size})",
                            color = Color(0xFF00E599),
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            letterSpacing = 2.sp
                        )
                        Icon(
                            if (sourcesExpandedOnPhone) Icons.Outlined.KeyboardArrowUp else Icons.Outlined.KeyboardArrowDown,
                            contentDescription = "Toggle Sources",
                            tint = Color(0xFF666666)
                        )
                    }
                    HorizontalDivider(color = Color(0xFF27272A), thickness = 1.dp)
                }

                if (sourcesExpandedOnPhone) {
                    if (sources.isEmpty()) {
                        item {
                            Text(
                                "No sources indexed. Upload documents to begin.",
                                color = Color(0xFF666666),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            )
                        }
                    } else {
                        items(sources) { source ->
                            SourceItem(
                                source = source,
                                isSelected = selectedSourceId == source.id,
                                onClick = { selectedSourceId = source.id }
                            )
                        }
                    }
                }

                if (!hasSearched && selectedSourceId == null) {
                    item {
                        Box(modifier = Modifier.fillParentMaxHeight(0.7f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                           EmptyStateView(onQuerySelected = { 
                                query = it
                                startResearch()
                           })
                        }
                    }
                } else if (hasSearched) {
                    if (isResearching) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = Color(0xFF00E599))
                            }
                        }
                    } else {
                        itemsIndexed(results) { index, result ->
                            Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                                ResultCard(result, index + 1)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SourceItem(source: ResearchSource, isSelected: Boolean, onClick: () -> Unit) {
    val bgColor = if (isSelected) Color(0xFF1A2744) else Color.Transparent
    val borderModifier = if (isSelected) Modifier.border(width = 2.dp, color = Color(0xFF4F46E5), shape = RoundedCornerShape(0.dp)) else Modifier

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .background(bgColor)
            .padding(vertical = 12.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (isSelected) {
            Box(modifier = Modifier.width(4.dp).height(40.dp).background(Color(0xFF4F46E5)))
            Spacer(modifier = Modifier.width(12.dp))
        }
        Icon(
            Icons.Outlined.Description,
            contentDescription = "Document",
            tint = Color(0xFF666666),
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = source.name,
                color = Color(0xFFFFFFFF),
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = source.snippet,
                color = Color(0xFF666666),
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun ResultCard(result: ResearchResult, rank: Int) {
    Surface(
        color = Color(0xFF111111),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFF1E1E1E)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = Color(0xFF4F46E5),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier.padding(end = 8.dp)
                ) {
                    Text(
                        text = "#$rank",
                        color = Color(0xFFFFFFFF),
                        fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Text(
                    text = result.title,
                    color = Color(0xFFFFFFFF),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = result.snippet,
                color = Color(0xFF888888), // gray
                fontSize = 13.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                color = Color(0xFF00E599).copy(alpha = 0.15f),
                shape = RoundedCornerShape(50),
                border = BorderStroke(1.dp, Color(0xFF00E599).copy(alpha = 0.3f))
            ) {
                Text(
                    text = result.sourceName,
                    color = Color(0xFF00E599),
                    fontSize = 11.sp,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
fun EmptyStateView(onQuerySelected: (String) -> Unit) {
    val suggestions = listOf(
        "Summarize the key findings in recent uploads",
        "What are the main counter-arguments presented?",
        "Extract all statistical data from the reports"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.padding(24.dp)
    ) {
        Icon(
            Icons.Outlined.Search,
            contentDescription = null,
            tint = Color(0xFF666666),
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Research Mode",
            color = Color(0xFFFFFFFF),
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Ask questions about your indexed sources",
            color = Color(0xFF888888),
            fontSize = 14.sp
        )
        Spacer(modifier = Modifier.height(32.dp))
        
        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth(0.8f)
        ) {
            suggestions.forEach { suggestion ->
                Surface(
                    color = Color(0xFF111111),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0xFF222222)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onQuerySelected(suggestion) }
                ) {
                    Text(
                        text = suggestion,
                        color = Color(0xFFCCCCCC),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(12.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}
