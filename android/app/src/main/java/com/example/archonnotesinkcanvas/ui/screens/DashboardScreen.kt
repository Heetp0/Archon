package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.archonnotesinkcanvas.theme.ArchonDesignTokens
import kotlinx.coroutines.delay
import java.util.Locale

// Data Models
data class DashboardStat(
    val id: String,
    val label: String,
    val value: String,
    val sub: String? = null,
    val icon: ImageVector,
    val accentColor: Color
)

data class AgentProcess(
    val id: String,
    val name: String,
    val action: String,
    val status: String // "running" | "idle"
)

data class ActivityLogEntry(
    val id: String,
    val timestamp: String,
    val text: String,
    val kind: String // "input" | "error" | "system" | "default"
)

data class MailDigestItem(
    val id: String,
    val sender: String,
    val subject: String,
    val preview: String,
    val date: String,
    val fullSummary: String,
    val unread: Boolean
)

data class TodoItem(
    val id: String,
    val text: String,
    val done: Boolean,
    val list: String
)

data class ActivityBucket(
    val day: String,
    val commands: Int,
    val tokens: Int
)

data class QuickActionItem(
    val key: String,
    val label: String,
    val description: String,
    val icon: ImageVector,
    val color: Color,
    val isCrownJewel: Boolean = false
)

data class CalendarEvent(
    val id: String,
    val title: String,
    val time: String,
    val location: String? = null,
    val color: Color = ArchonDesignTokens.AccentIndigo
)

// Default Parity Datasets
val defaultStats = listOf(
    DashboardStat("1", "Active Agents", "3 Active", "Running background processes", Icons.Outlined.Memory, ArchonDesignTokens.AccentIndigo),
    DashboardStat("2", "Tokens Used", "142.8k", "Est. cost $0.28", Icons.Outlined.Bolt, ArchonDesignTokens.AccentIndigo),
    DashboardStat("3", "Unread Mail", "4 Unread", "Synced via Gmail MCP", Icons.Outlined.Mail, ArchonDesignTokens.AccentEmerald),
    DashboardStat("4", "Tasks Pending", "5 Pending", "Google Keep · via MCP", Icons.Outlined.CheckBox, ArchonDesignTokens.AccentRose)
)

val defaultActivityData = listOf(
    ActivityBucket("Mon", 42, 18500),
    ActivityBucket("Tue", 68, 31200),
    ActivityBucket("Wed", 95, 48900),
    ActivityBucket("Thu", 54, 24100),
    ActivityBucket("Fri", 110, 56200),
    ActivityBucket("Sat", 32, 12800),
    ActivityBucket("Sun", 78, 39400)
)

val defaultAgents = listOf(
    AgentProcess("1", "Coder Agent #1", "Refactoring DashboardScreen.kt", "running"),
    AgentProcess("2", "Research Agent", "Gathering ArXiv papers on Multimodal RAG", "running"),
    AgentProcess("3", "Reviewer Agent", "Awaiting execution queue", "idle")
)

val defaultLogs = listOf(
    ActivityLogEntry("1", "21:05:12", "SYSTEM: Archon Daemon v2.4 online on port 8080", "system"),
    ActivityLogEntry("2", "21:06:01", "INPUT: > analyze frontend parity specs for android port", "input"),
    ActivityLogEntry("3", "21:06:05", "SYSTEM: Spawning Coder Agent #1 [PID: 4082]", "system"),
    ActivityLogEntry("4", "21:08:44", "SYSTEM: MyScript OCR engine initialized successfully", "system"),
    ActivityLogEntry("5", "21:09:12", "INPUT: > run test build assembleDebug", "input")
)

val defaultMailItems = listOf(
    MailDigestItem(
        id = "m1",
        sender = "ArXiv Intelligence",
        subject = "Daily Digest: 5 new papers in On-Device Handwriting & Canvas AI",
        preview = "Highlights include MyScript stroke optimization, low-latency ink rendering, and quantized vision models.",
        date = "09:42 AM",
        fullSummary = "Subject: Daily Digest: 5 new papers in On-Device Handwriting & Canvas AI\nFrom: ArXiv Intelligence\n\nSummary:\n- Paper 1: Low-latency ink rendering techniques on mobile hardware\n- Paper 2: Quantized handwriting OCR models for edge TPU acceleration\n- Paper 3: Neural canvas architectures for multi-stroke recognition\n- Paper 4: Real-time stroke smoothing algorithms\n- Paper 5: Cross-platform digital ink serialization standards",
        unread = true
    ),
    MailDigestItem(
        id = "m2",
        sender = "GitHub Team",
        subject = "[Archon] Security Alert: 0 vulnerabilities found in recent commit",
        preview = "Automated static analysis complete. All security parameters passed verification.",
        date = "Yesterday",
        fullSummary = "Subject: Security Alert: 0 vulnerabilities found\nFrom: GitHub Team\n\nSummary:\n- Repository: Archon-main\n- Status: Passed\n- Scan depth: Full AST + Taint analysis\n- Zero vulnerabilities detected across Kotlin and Rust binaries.",
        unread = true
    ),
    MailDigestItem(
        id = "m3",
        sender = "Google Calendar",
        subject = "Reminder: Archon Arch Review & Sprint Demo @ 2:30 PM",
        preview = "Meeting details and video call link attached. Agenda includes Android parity port.",
        date = "Jul 24",
        fullSummary = "Subject: Archon Arch Review & Sprint Demo\nFrom: Google Calendar\n\nSummary:\n- Time: 2:30 PM - 3:30 PM\n- Attendees: Core Engineering Team\n- Agenda: Demo of Step 2 Dashboard Alignment, responsive layouts, and Crown Jewel navigation entry points.",
        unread = false
    ),
    MailDigestItem(
        id = "m4",
        sender = "MCP Gateway",
        subject = "Gmail & Keep MCP Server sync completed",
        preview = "Synchronized 14 inbox threads and 8 keep note cards in 320ms.",
        date = "Jul 23",
        fullSummary = "Subject: Gmail & Keep MCP Server sync completed\nFrom: MCP Gateway\n\nSummary:\n- Sync duration: 320ms\n- Gmail items processed: 14\n- Keep notes processed: 8\n- Status: All endpoints healthy.",
        unread = false
    )
)

val defaultTodoItems = listOf(
    TodoItem("t1", "Finalize Dashboard Jetpack Compose alignment & layout parity", false, "Work"),
    TodoItem("t2", "Test MyScript stylus ink canvas OCR sync pipeline", false, "Work"),
    TodoItem("t3", "Verify Tutor Mode spaced repetition & quiz engine", false, "Study"),
    TodoItem("t4", "Run assembleDebug Gradle verification build", true, "Dev"),
    TodoItem("t5", "Audit Archon design tokens & color contrast ratios", true, "Design")
)

val defaultEvents = listOf(
    CalendarEvent("e1", "Archon Architecture Review", "10:00 AM - 11:00 AM", "Room 4B / Google Meet", ArchonDesignTokens.AccentIndigo),
    CalendarEvent("e2", "Stylus Ink OCR Engine Benchmark", "02:30 PM - 03:30 PM", "Mobile Lab", ArchonDesignTokens.AccentPrimary),
    CalendarEvent("e3", "Tutor Mode Spaced Repetition Sync", "04:30 PM - 05:00 PM", "Async / Slack", ArchonDesignTokens.AccentEmerald)
)

val quickActions = listOf(
    QuickActionItem("chat", "New Chat", "Start standard LLM session", Icons.Outlined.Chat, ArchonDesignTokens.AccentIndigo),
    QuickActionItem("council", "Start Council", "Multi-agent debate & consensus", Icons.Outlined.AccountBalance, ArchonDesignTokens.AccentRose),
    QuickActionItem("research", "Deep Research", "Autonomous multi-source research", Icons.Outlined.Search, ArchonDesignTokens.AccentIndigo),
    QuickActionItem("agents", "Agent Runtime", "Manage active agent processes", Icons.Outlined.SmartToy, ArchonDesignTokens.AccentEmerald),
    QuickActionItem("notes", "Archon Notes & Canvas", "Stylus ink drawing & MyScript OCR", Icons.Outlined.Draw, ArchonDesignTokens.AccentPrimary, isCrownJewel = true),
    QuickActionItem("tutor", "Tutor Mode & OCR", "Adaptive study tutor & OCR training", Icons.Outlined.School, ArchonDesignTokens.AccentPrimary, isCrownJewel = true)
)

@Composable
fun DashboardScreen(
    windowSizeClass: WindowSizeClass,
    onNavigate: (String) -> Unit = {},
    isBackendConnected: Boolean = true
) {
    val widthClass = windowSizeClass.widthSizeClass
    val isCompact = widthClass == WindowWidthSizeClass.Compact
    val isMedium = widthClass == WindowWidthSizeClass.Medium
    val isExpanded = widthClass == WindowWidthSizeClass.Expanded

    val stats = remember { defaultStats }
    val activityData = remember { defaultActivityData }
    val agents = remember { defaultAgents }
    val logs = remember { defaultLogs }
    val mailItems = remember { defaultMailItems }
    val todoItems = remember { defaultTodoItems }
    val events = remember { defaultEvents }
    val actions = remember { quickActions }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ArchonDesignTokens.AppBackground)
    ) {
        if (isExpanded) {
            // Multi-column Workspace Dashboard for Expanded (>= 840dp)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                DashboardHeader(isBackendConnected = isBackendConnected, onNavigate = onNavigate)

                // 4 Stat Cards in 1 Row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    stats.forEach { stat ->
                        DashboardStatCard(stat = stat, modifier = Modifier.weight(1f))
                    }
                }

                // Row 2: 7-Day Activity Bar Chart (weight 3f) + Schedule Calendar (weight 2f)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ActivityBarChartCard(activityData = activityData, modifier = Modifier.weight(3f))
                    CalendarWidgetCard(events = events, modifier = Modifier.weight(2f))
                }

                // Row 3: Agent Status & MCP (weight 2f) + Activity Feed (weight 3f)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    AgentStatusCard(agents = agents, onNavigate = onNavigate, modifier = Modifier.weight(2f))
                    ActivityFeedCard(logs = logs, onNavigate = onNavigate, modifier = Modifier.weight(3f))
                }

                // Row 4: Mail Digest (weight 1f) + To-Do List (weight 1f)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    MailDigestCard(mailItems = mailItems, onNavigate = onNavigate, modifier = Modifier.weight(1f))
                    TodoListCard(todoItems = todoItems, onNavigate = onNavigate, modifier = Modifier.weight(1f))
                }

                // Row 5: Quick Launch Grid (3 columns)
                QuickLaunchGrid(actions = actions, onNavigate = onNavigate, columnsCount = 3)
            }
        } else if (isMedium) {
            // 2-Column Responsive Layout for Medium (600dp..839dp)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                DashboardHeader(isBackendConnected = isBackendConnected, onNavigate = onNavigate)

                // 4 Stat Cards in 1 Row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    stats.forEach { stat ->
                        DashboardStatCard(stat = stat, modifier = Modifier.weight(1f))
                    }
                }

                // Activity & Calendar side by side
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ActivityBarChartCard(activityData = activityData, modifier = Modifier.weight(0.55f))
                    CalendarWidgetCard(events = events, modifier = Modifier.weight(0.45f))
                }

                // Agent Status & Activity Feed side by side
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    AgentStatusCard(agents = agents, onNavigate = onNavigate, modifier = Modifier.weight(0.45f))
                    ActivityFeedCard(logs = logs, onNavigate = onNavigate, modifier = Modifier.weight(0.55f))
                }

                // Mail Digest & To-Do List side by side
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    MailDigestCard(mailItems = mailItems, onNavigate = onNavigate, modifier = Modifier.weight(0.5f))
                    TodoListCard(todoItems = todoItems, onNavigate = onNavigate, modifier = Modifier.weight(0.5f))
                }

                // Quick Launch Grid (3 columns)
                QuickLaunchGrid(actions = actions, onNavigate = onNavigate, columnsCount = 3)
            }
        } else {
            // Single-Column Scrollable View for Compact (< 600dp)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                DashboardHeader(isBackendConnected = isBackendConnected, onNavigate = onNavigate)

                // 2x2 Stats Grid
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        DashboardStatCard(stat = stats[0], modifier = Modifier.weight(1f))
                        DashboardStatCard(stat = stats[1], modifier = Modifier.weight(1f))
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        DashboardStatCard(stat = stats[2], modifier = Modifier.weight(1f))
                        DashboardStatCard(stat = stats[3], modifier = Modifier.weight(1f))
                    }
                }

                ActivityBarChartCard(activityData = activityData)
                CalendarWidgetCard(events = events)
                AgentStatusCard(agents = agents, onNavigate = onNavigate)
                ActivityFeedCard(logs = logs, onNavigate = onNavigate)
                MailDigestCard(mailItems = mailItems, onNavigate = onNavigate)
                TodoListCard(todoItems = todoItems, onNavigate = onNavigate)

                // Quick Launch Grid (2 columns for Compact)
                QuickLaunchGrid(actions = actions, onNavigate = onNavigate, columnsCount = 2)
            }
        }
    }
}

@Composable
fun DashboardHeader(
    isBackendConnected: Boolean,
    onNavigate: (String) -> Unit
) {
    var uptimeSeconds by remember { mutableLongStateOf(15155L) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000L)
            uptimeSeconds++
        }
    }

    val hours = uptimeSeconds / 3600
    val minutes = (uptimeSeconds % 3600) / 60
    val seconds = uptimeSeconds % 60
    val uptimeFormatted = String.format(Locale.US, "%02d:%02d:%02d", hours, minutes, seconds)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "Archon",
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
                color = ArchonDesignTokens.TextPrimary,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "AI Operating System · Command Center",
                fontSize = 12.sp,
                color = ArchonDesignTokens.TextSecondary
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Daemon status pill
            val statusColor = if (isBackendConnected) ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.AccentRose
            val statusIcon = if (isBackendConnected) Icons.Outlined.Wifi else Icons.Outlined.WifiOff
            val statusText = if (isBackendConnected) "Daemon Online" else "Daemon Offline"

            Surface(
                color = statusColor.copy(alpha = 0.12f),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, statusColor.copy(alpha = 0.35f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = statusIcon,
                        contentDescription = null,
                        tint = statusColor,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = statusText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = statusColor
                    )
                }
            }

            // Uptime badge
            Surface(
                color = ArchonDesignTokens.PanelBackground,
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.4f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Timer,
                        contentDescription = null,
                        tint = ArchonDesignTokens.TextSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = uptimeFormatted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.TextPrimary,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}

@Composable
fun DashboardStatCard(
    stat: DashboardStat,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = ArchonDesignTokens.PanelBackground
        ),
        border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(stat.accentColor.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = stat.icon,
                        contentDescription = null,
                        tint = stat.accentColor,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Column {
                Text(
                    text = stat.value,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = ArchonDesignTokens.TextPrimary,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = stat.label,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = ArchonDesignTokens.TextSecondary
                )
                if (stat.sub != null) {
                    Text(
                        text = stat.sub,
                        fontSize = 10.sp,
                        color = ArchonDesignTokens.TextMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
fun ActivityBarChartCard(
    activityData: List<ActivityBucket>,
    modifier: Modifier = Modifier
) {
    var selectedMetric by remember { mutableStateOf("COMMANDS") }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = ArchonDesignTokens.PanelBackground
        ),
        border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.BarChart,
                        contentDescription = null,
                        tint = ArchonDesignTokens.AccentPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "7-DAY ACTIVITY",
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.TextPrimary,
                        fontSize = 14.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                // Toggle Pill Group
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(ArchonDesignTokens.AppBackground)
                        .border(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                        .padding(2.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    listOf("COMMANDS", "TOKENS").forEach { metric ->
                        val selected = selectedMetric == metric
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (selected) ArchonDesignTokens.PanelBackground else Color.Transparent)
                                .clickable { selectedMetric = metric }
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = metric,
                                fontSize = 10.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                color = if (selected) ArchonDesignTokens.AccentPrimary else ArchonDesignTokens.TextSecondary
                            )
                        }
                    }
                }
            }

            val maxValue = activityData.maxOfOrNull {
                if (selectedMetric == "COMMANDS") it.commands else it.tokens
            }?.toFloat() ?: 100f

            val hasData = activityData.any { (if (selectedMetric == "COMMANDS") it.commands else it.tokens) > 0 }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
            ) {
                if (!hasData) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No activity data — connect daemon to track usage",
                            fontSize = 12.sp,
                            color = ArchonDesignTokens.TextMuted
                        )
                    }
                } else {
                    val barColor = if (selectedMetric == "COMMANDS") ArchonDesignTokens.AccentPrimary else ArchonDesignTokens.AccentIndigo

                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val canvasWidth = size.width
                        val canvasHeight = size.height

                        val paddingX = 16.dp.toPx()
                        val paddingTop = 20.dp.toPx()
                        val paddingBottom = 24.dp.toPx()

                        val usableWidth = canvasWidth - (paddingX * 2)
                        val usableHeight = canvasHeight - paddingTop - paddingBottom

                        // Dashed gridlines
                        val dashPathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                        val gridLines = 3
                        for (i in 0..gridLines) {
                            val y = paddingTop + (usableHeight / gridLines) * i
                            drawLine(
                                color = Color(0xFF27272A).copy(alpha = 0.5f),
                                start = Offset(paddingX, y),
                                end = Offset(canvasWidth - paddingX, y),
                                strokeWidth = 1.dp.toPx(),
                                pathEffect = dashPathEffect
                            )
                        }

                        // Bars
                        val step = usableWidth / activityData.size
                        val barWidth = (step * 0.45f).coerceAtMost(32.dp.toPx())

                        activityData.forEachIndexed { index, bucket ->
                            val value = if (selectedMetric == "COMMANDS") bucket.commands else bucket.tokens
                            val normValue = (value.toFloat() / maxValue).coerceIn(0.05f, 1.0f)
                            val barHeight = usableHeight * normValue

                            val x = paddingX + index * step + (step - barWidth) / 2
                            val y = paddingTop + usableHeight - barHeight

                            drawRoundRect(
                                color = barColor,
                                topLeft = Offset(x, y),
                                size = Size(barWidth, barHeight),
                                cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx())
                            )
                        }
                    }
                }
            }

            // Days labels row below canvas
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                activityData.forEach { bucket ->
                    val valStr = if (selectedMetric == "COMMANDS") "${bucket.commands}" else "${bucket.tokens / 1000}k"
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = bucket.day,
                            fontSize = 11.sp,
                            color = ArchonDesignTokens.TextSecondary
                        )
                        Text(
                            text = valStr,
                            fontSize = 10.sp,
                            color = ArchonDesignTokens.AccentPrimary,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CalendarWidgetCard(
    events: List<CalendarEvent>,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = ArchonDesignTokens.PanelBackground
        ),
        border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CalendarToday,
                        contentDescription = null,
                        tint = ArchonDesignTokens.AccentIndigo,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "SCHEDULE & CALENDAR",
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.TextPrimary,
                        fontSize = 14.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Surface(
                    color = ArchonDesignTokens.AccentIndigo.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = "Google Calendar · MCP",
                        fontSize = 10.sp,
                        color = ArchonDesignTokens.AccentIndigo,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            if (events.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No upcoming events scheduled",
                        fontSize = 12.sp,
                        color = ArchonDesignTokens.TextMuted
                    )
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    events.forEach { event ->
                        Surface(
                            color = ArchonDesignTokens.AppBackground,
                            border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .width(4.dp)
                                        .height(32.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(event.color)
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = event.title,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = ArchonDesignTokens.TextPrimary
                                    )
                                    Text(
                                        text = event.time + (event.location?.let { " • $it" } ?: ""),
                                        fontSize = 11.sp,
                                        color = ArchonDesignTokens.TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AgentStatusCard(
    agents: List<AgentProcess>,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = ArchonDesignTokens.PanelBackground
        ),
        border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.SmartToy,
                        contentDescription = null,
                        tint = ArchonDesignTokens.AccentEmerald,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "AGENT STATUS",
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.TextPrimary,
                        fontSize = 14.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Text(
                    text = "Open Runtime →",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = ArchonDesignTokens.AccentEmerald,
                    modifier = Modifier.clickable { onNavigate("agents") }
                )
            }

            if (agents.isEmpty()) {
                Surface(
                    color = ArchonDesignTokens.AppBackground,
                    border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No agents active. Send a command to spin them up.",
                            fontSize = 12.sp,
                            color = ArchonDesignTokens.TextMuted
                        )
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    agents.forEach { agent ->
                        Surface(
                            color = ArchonDesignTokens.AppBackground,
                            border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    val statusDotColor = if (agent.status == "running") ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.TextMuted
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(statusDotColor)
                                    )
                                    Column {
                                        Text(
                                            text = agent.name,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = ArchonDesignTokens.TextPrimary
                                        )
                                        Text(
                                            text = agent.action,
                                            fontSize = 11.sp,
                                            color = ArchonDesignTokens.TextSecondary,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }

                                Surface(
                                    color = if (agent.status == "running") ArchonDesignTokens.AccentEmerald.copy(alpha = 0.12f) else ArchonDesignTokens.BorderCore,
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text(
                                        text = agent.status,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (agent.status == "running") ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.TextSecondary,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Footer Banner: MCP Servers status
            Surface(
                color = ArchonDesignTokens.AppBackground,
                border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "MCP SERVERS:",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ArchonDesignTokens.TextMuted,
                            fontFamily = FontFamily.Monospace
                        )
                        listOf("Gmail", "Keep", "Obsidian", "GitHub").forEach { server ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(5.dp)
                                        .clip(CircleShape)
                                        .background(ArchonDesignTokens.AccentEmerald)
                                )
                                Text(
                                    text = server,
                                    fontSize = 10.sp,
                                    color = ArchonDesignTokens.TextSecondary
                                )
                            }
                        }
                    }

                    Text(
                        text = "Configure →",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.AccentIndigo,
                        modifier = Modifier.clickable { onNavigate("settings") }
                    )
                }
            }
        }
    }
}

@Composable
fun ActivityFeedCard(
    logs: List<ActivityLogEntry>,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = ArchonDesignTokens.PanelBackground
        ),
        border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Terminal,
                        contentDescription = null,
                        tint = ArchonDesignTokens.AccentIndigo,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "ACTIVITY FEED",
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.TextPrimary,
                        fontSize = 14.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Text(
                    text = "Open Terminal →",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = ArchonDesignTokens.AccentIndigo,
                    modifier = Modifier.clickable { onNavigate("chat") }
                )
            }

            // Terminal box
            Surface(
                color = ArchonDesignTokens.AppBackground,
                border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.4f)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
            ) {
                if (logs.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No activity yet. Start a session to see logs.",
                            fontSize = 12.sp,
                            color = ArchonDesignTokens.TextMuted
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        logs.forEach { entry ->
                            val textColor = when (entry.kind) {
                                "input" -> ArchonDesignTokens.AccentEmerald
                                "error" -> ArchonDesignTokens.AccentRose
                                "system" -> ArchonDesignTokens.AccentIndigo
                                else -> ArchonDesignTokens.TextSecondary
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Text(
                                    text = "[${entry.timestamp}]",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = ArchonDesignTokens.TextMuted
                                )
                                Text(
                                    text = entry.text,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = textColor
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
fun MailDigestCard(
    mailItems: List<MailDigestItem>,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedMail by remember { mutableStateOf<MailDigestItem?>(null) }
    val unreadCount = mailItems.count { it.unread }

    if (selectedMail != null) {
        MailDetailDialog(
            mail = selectedMail!!,
            onDismiss = { selectedMail = null }
        )
    }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = ArchonDesignTokens.PanelBackground
        ),
        border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Mail,
                        contentDescription = null,
                        tint = ArchonDesignTokens.AccentEmerald,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "MAIL DIGEST",
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.TextPrimary,
                        fontSize = 14.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    if (unreadCount > 0) {
                        Surface(
                            color = ArchonDesignTokens.AccentEmerald.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = "$unreadCount unread",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = ArchonDesignTokens.AccentEmerald,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.clickable { /* sync action */ }
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Sync,
                        contentDescription = null,
                        tint = ArchonDesignTokens.TextSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "Sync",
                        fontSize = 11.sp,
                        color = ArchonDesignTokens.TextSecondary
                    )
                }
            }

            if (mailItems.isEmpty()) {
                Surface(
                    color = ArchonDesignTokens.AppBackground,
                    border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Inbox,
                            contentDescription = null,
                            tint = ArchonDesignTokens.TextMuted,
                            modifier = Modifier.size(32.dp)
                        )
                        Text(
                            text = "No mail synced yet",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = ArchonDesignTokens.TextPrimary
                        )
                        Text(
                            text = "Configure Gmail MCP in Settings to sync inbox summary",
                            fontSize = 11.sp,
                            color = ArchonDesignTokens.TextSecondary
                        )
                        TextButton(onClick = { onNavigate("settings") }) {
                            Text(
                                text = "Configure MCP →",
                                fontSize = 11.sp,
                                color = ArchonDesignTokens.AccentEmerald
                            )
                        }
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    mailItems.take(4).forEach { item ->
                        Surface(
                            color = ArchonDesignTokens.AppBackground,
                            border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedMail = item }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(if (item.unread) ArchonDesignTokens.AccentEmerald else Color.Transparent)
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = item.sender,
                                            fontSize = 12.sp,
                                            fontWeight = if (item.unread) FontWeight.Bold else FontWeight.Medium,
                                            color = ArchonDesignTokens.TextPrimary,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Text(
                                            text = item.date,
                                            fontSize = 10.sp,
                                            color = ArchonDesignTokens.TextMuted
                                        )
                                    }
                                    Text(
                                        text = item.subject,
                                        fontSize = 12.sp,
                                        fontWeight = if (item.unread) FontWeight.SemiBold else FontWeight.Normal,
                                        color = ArchonDesignTokens.TextPrimary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = item.preview,
                                        fontSize = 11.sp,
                                        color = ArchonDesignTokens.TextSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                Icon(
                                    imageVector = Icons.Outlined.ChevronRight,
                                    contentDescription = null,
                                    tint = ArchonDesignTokens.TextMuted,
                                    modifier = Modifier.size(16.dp)
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
fun MailDetailDialog(
    mail: MailDigestItem,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            color = ArchonDesignTokens.PanelBackground,
            border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Mail,
                            contentDescription = null,
                            tint = ArchonDesignTokens.AccentEmerald,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "GMAIL DIGEST SUMMARY",
                            fontWeight = FontWeight.Bold,
                            color = ArchonDesignTokens.TextPrimary,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                        Icon(
                            imageVector = Icons.Outlined.Close,
                            contentDescription = "Close",
                            tint = ArchonDesignTokens.TextSecondary
                        )
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = mail.subject,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.TextPrimary
                    )
                    Text(
                        text = "From: ${mail.sender} • ${mail.date}",
                        fontSize = 12.sp,
                        color = ArchonDesignTokens.TextSecondary
                    )
                }

                Surface(
                    color = ArchonDesignTokens.AppBackground,
                    border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = mail.fullSummary,
                        fontSize = 12.sp,
                        color = ArchonDesignTokens.TextPrimary,
                        modifier = Modifier.padding(14.dp),
                        fontFamily = FontFamily.Monospace
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Close", color = ArchonDesignTokens.TextSecondary)
                    }
                }
            }
        }
    }
}

@Composable
fun TodoListCard(
    todoItems: List<TodoItem>,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var itemsList by remember { mutableStateOf(todoItems) }

    val completedCount = itemsList.count { it.done }
    val totalCount = itemsList.size
    val progressRatio = if (totalCount > 0) completedCount.toFloat() / totalCount else 0f
    val progressPercent = (progressRatio * 100).toInt()

    Card(
        colors = CardDefaults.cardColors(
            containerColor = ArchonDesignTokens.PanelBackground
        ),
        border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CheckBox,
                        contentDescription = null,
                        tint = ArchonDesignTokens.AccentRose,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "TO-DO LIST",
                        fontWeight = FontWeight.Bold,
                        color = ArchonDesignTokens.TextPrimary,
                        fontSize = 14.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    Surface(
                        color = ArchonDesignTokens.AccentRose.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = "${totalCount - completedCount} open",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ArchonDesignTokens.AccentRose,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Text(
                    text = "Google Keep · MCP",
                    fontSize = 10.sp,
                    color = ArchonDesignTokens.TextMuted
                )
            }

            if (itemsList.isEmpty()) {
                Surface(
                    color = ArchonDesignTokens.AppBackground,
                    border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.CheckCircle,
                            contentDescription = null,
                            tint = ArchonDesignTokens.TextMuted,
                            modifier = Modifier.size(32.dp)
                        )
                        Text(
                            text = "No tasks synced yet",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = ArchonDesignTokens.TextPrimary
                        )
                        Text(
                            text = "Configure Keep MCP in Settings to sync to-do list",
                            fontSize = 11.sp,
                            color = ArchonDesignTokens.TextSecondary
                        )
                        TextButton(onClick = { onNavigate("settings") }) {
                            Text(
                                text = "Configure MCP →",
                                fontSize = 11.sp,
                                color = ArchonDesignTokens.AccentRose
                            )
                        }
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    itemsList.forEachIndexed { index, item ->
                        Surface(
                            color = ArchonDesignTokens.AppBackground,
                            border = BorderStroke(1.dp, ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    itemsList = itemsList.toMutableList().also {
                                        it[index] = item.copy(done = !item.done)
                                    }
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Checkbox(
                                    checked = item.done,
                                    onCheckedChange = { checked ->
                                        itemsList = itemsList.toMutableList().also {
                                            it[index] = item.copy(done = checked)
                                        }
                                    },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = ArchonDesignTokens.AccentRose,
                                        uncheckedColor = ArchonDesignTokens.TextSecondary,
                                        checkmarkColor = Color.White
                                    )
                                )
                                Text(
                                    text = item.text,
                                    fontSize = 12.sp,
                                    color = if (item.done) ArchonDesignTokens.TextMuted else ArchonDesignTokens.TextPrimary,
                                    textDecoration = if (item.done) TextDecoration.LineThrough else TextDecoration.None,
                                    modifier = Modifier.weight(1f)
                                )
                                Surface(
                                    color = ArchonDesignTokens.BorderCore.copy(alpha = 0.4f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = item.list,
                                        fontSize = 9.sp,
                                        color = ArchonDesignTokens.TextSecondary,
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                // Progress Bar at bottom
                Column(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Completion Progress",
                            fontSize = 11.sp,
                            color = ArchonDesignTokens.TextSecondary
                        )
                        Text(
                            text = "$completedCount of $totalCount complete ($progressPercent%)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = ArchonDesignTokens.AccentRose
                        )
                    }

                    LinearProgressIndicator(
                        progress = { progressRatio },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = ArchonDesignTokens.AccentRose,
                        trackColor = ArchonDesignTokens.AppBackground
                    )
                }
            }
        }
    }
}

@Composable
fun QuickLaunchGrid(
    actions: List<QuickActionItem>,
    onNavigate: (String) -> Unit,
    columnsCount: Int,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Column {
            Text(
                text = "QUICK LAUNCH",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = ArchonDesignTokens.TextPrimary,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "Workspace launchpads & crown jewels",
                fontSize = 11.sp,
                color = ArchonDesignTokens.TextSecondary
            )
        }

        val rows = actions.chunked(columnsCount)
        rows.forEach { rowActions ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                rowActions.forEach { action ->
                    QuickActionCard(
                        action = action,
                        onNavigate = onNavigate,
                        modifier = Modifier.weight(1f)
                    )
                }
                if (rowActions.size < columnsCount) {
                    repeat(columnsCount - rowActions.size) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun QuickActionCard(
    action: QuickActionItem,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val borderColor = if (action.isCrownJewel) ArchonDesignTokens.AccentPrimary.copy(alpha = 0.5f) else ArchonDesignTokens.BorderCore.copy(alpha = 0.3f)
    val containerBg = ArchonDesignTokens.PanelBackground

    Card(
        colors = CardDefaults.cardColors(containerColor = containerBg),
        border = BorderStroke(1.dp, borderColor),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier.clickable { onNavigate(action.key) }
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(action.color.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = action.icon,
                        contentDescription = null,
                        tint = action.color,
                        modifier = Modifier.size(20.dp)
                    )
                }

                if (action.isCrownJewel) {
                    Surface(
                        color = ArchonDesignTokens.AccentPrimary,
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = "CROWN JEWEL",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.Black,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Column {
                Text(
                    text = action.label,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = ArchonDesignTokens.TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = action.description,
                    fontSize = 11.sp,
                    color = ArchonDesignTokens.TextSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
