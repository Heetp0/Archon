package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.*
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

import okhttp3.*
import org.json.JSONObject
import org.json.JSONArray
import com.example.archonnotesinkcanvas.data.remote.ArchonApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

enum class TaskStatus { RUNNING, DONE, FAILED }

data class AgentTask(
    val title: String,
    val description: String,
    val status: TaskStatus,
    val completedSteps: Int,
    val totalSteps: Int
)

enum class StepStatus { PENDING, RUNNING, DONE, FAILED }
enum class StepType { GENERAL, CODE, TEST, DEPLOY, ANALYSIS }

data class PlanStep(
    val id: Int,
    val title: String,
    val detail: String,
    val status: StepStatus,
    val type: StepType = StepType.GENERAL
)

data class GateApprovalData(
    val reqId: String,
    val action: String,
    val command: String,
    val solutionPreview: String,
    val retryCount: Int = 0
)

val defaultAgentTask = AgentTask(
    title = "Implement Settings Screen",
    description = "Create a settings screen with theme toggle and notification preferences. Connect to data store.",
    status = TaskStatus.RUNNING,
    completedSteps = 3,
    totalSteps = 7
)

val defaultSamplePlan = listOf(
    PlanStep(1, "Analyze requirements", "Reading project structure...", StepStatus.DONE, StepType.ANALYSIS),
    PlanStep(2, "Generate implementation", "Writing ChatScreen.kt...\nWriting CouncilScreen.kt...", StepStatus.DONE, StepType.CODE),
    PlanStep(3, "Run tests", "Executing unit tests for newly added screens", StepStatus.RUNNING, StepType.TEST),
    PlanStep(4, "Deploy to device", "adb install -r app-debug.apk", StepStatus.PENDING, StepType.DEPLOY)
)

val defaultDummyLogs = listOf(
    "[SYSTEM] Task initiated...",
    "[ANALYSIS] Reading project...",
    "[ANALYSIS] Found 42 files.",
    "[CODE] Generating ChatScreen.kt...",
    "[CODE] Generating CouncilScreen.kt...",
    "[TEST] Running tests on device emulator-5554...",
    "Running test: ChatScreenTest",
    "Running test: CouncilScreenTest"
)

@Composable
fun AgentsScreen(windowSizeClass: WindowSizeClass) {
    var selectedView by remember { mutableStateOf("dashboard") } // "dashboard" | "terminal"

    // Live state with defaults for graceful fallback
    var currentTask by remember { mutableStateOf(defaultAgentTask) }
    val planSteps = remember { mutableStateListOf<PlanStep>().apply { addAll(defaultSamplePlan) } }
    val liveLogs = remember { mutableStateListOf<String>().apply { addAll(defaultDummyLogs) } }

    var activeGate by remember { mutableStateOf<GateApprovalData?>(null) }
    var webSocketRef by remember { mutableStateOf<WebSocket?>(null) }

    // WebSocket connection to ws://.../ws
    LaunchedEffect(Unit) {
        val baseUrl = try {
            ArchonApiClient.getBaseUrl()
        } catch (e: Exception) {
            "http://10.0.2.2:8000"
        }

        val wsUrl = if (baseUrl.startsWith("https://")) {
            baseUrl.replaceFirst("https://", "wss://") + "/ws"
        } else {
            baseUrl.replaceFirst("http://", "ws://") + "/ws"
        }

        val client = OkHttpClient.Builder().build()
        val request = Request.Builder().url(wsUrl).build()

        val listener = object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: okhttp3.Response) {
                webSocketRef = webSocket
                liveLogs.add("[WS] Connected to Archon Agent Daemon")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val root = JSONObject(text)
                    val reqId = root.optString("id", "")
                    val event = root.optString("event", "")
                    val payload = root.optJSONObject("payload")

                    when (event) {
                        "plan_steps" -> {
                            val stepsArray = payload?.optJSONArray("steps")
                            if (stepsArray != null) {
                                val newSteps = mutableListOf<PlanStep>()
                                for (i in 0 until stepsArray.length()) {
                                    val s = stepsArray.getJSONObject(i)
                                    val id = s.optInt("id", i + 1)
                                    val title = s.optString("title", "Step $id")
                                    val criteria = s.optString("acceptance_criteria", "")
                                    newSteps.add(
                                        PlanStep(
                                            id = id,
                                            title = title,
                                            detail = criteria,
                                            status = if (i == 0) StepStatus.RUNNING else StepStatus.PENDING,
                                            type = if (title.contains("code", true) || title.contains("implement", true)) StepType.CODE
                                            else if (title.contains("test", true)) StepType.TEST
                                            else if (title.contains("scan", true) || title.contains("analyze", true)) StepType.ANALYSIS
                                            else StepType.GENERAL
                                        )
                                    )
                                }
                                if (newSteps.isNotEmpty()) {
                                    planSteps.clear()
                                    planSteps.addAll(newSteps)
                                    currentTask = currentTask.copy(
                                        status = TaskStatus.RUNNING,
                                        completedSteps = 0,
                                        totalSteps = newSteps.size
                                    )
                                    liveLogs.add("[PLAN] Received ${newSteps.size} plan steps from Planner")
                                }
                            }
                        }
                        "tool_call" -> {
                            val tool = payload?.optString("tool", "")
                            val status = payload?.optString("status", "")
                            val input = payload?.optString("input", "")
                            liveLogs.add("[TOOL] $tool ($status): $input")
                        }
                        "gate" -> {
                            val action = payload?.optString("action", "execute_code")
                            val command = payload?.optString("command", "")
                            val solutionPreview = payload?.optString("solution_preview", "")
                            val retryCount = payload?.optInt("retry_count", 0) ?: 0
                            activeGate = GateApprovalData(
                                reqId = reqId,
                                action = action ?: "execute_code",
                                command = command ?: "",
                                solutionPreview = solutionPreview ?: "",
                                retryCount = retryCount
                            )
                            liveLogs.add("[GATE] Awaiting approval for action: $action")
                        }
                        "retry" -> {
                            val attempt = payload?.optInt("attempt", 1) ?: 1
                            val max = payload?.optInt("max", 3) ?: 3
                            val reason = payload?.optString("reason", "") ?: ""
                            liveLogs.add("[RETRY] Attempt $attempt/$max: $reason")
                        }
                        "session_metadata" -> {
                            val verdict = payload?.optString("verdict", "") ?: ""
                            val status = payload?.optString("status", "completed")
                            val isPass = verdict.contains("PASS", ignoreCase = true)
                            currentTask = currentTask.copy(
                                status = if (isPass) TaskStatus.DONE else TaskStatus.FAILED,
                                completedSteps = currentTask.totalSteps
                            )
                            liveLogs.add("[SESSION] Complete. Verdict: $verdict ($status)")
                        }
                        "status" -> {
                            val statusText = payload?.optString("status", "")
                            if (!statusText.isNullOrBlank()) {
                                liveLogs.add("[STATUS] $statusText")
                            }
                        }
                        "token" -> {
                            val content = payload?.optString("content", "")
                            if (!content.isNullOrBlank()) {
                                liveLogs.add(content.trimEnd())
                            }
                        }
                        "error" -> {
                            val err = payload?.optString("error", "Unknown error")
                            liveLogs.add("[ERROR] $err")
                        }
                        "done" -> {
                            liveLogs.add("[DONE] Execution finished.")
                        }
                    }
                } catch (e: Exception) {
                    // Ignore parse issues
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: okhttp3.Response?) {
                liveLogs.add("[WS] Disconnected (using cached/default fallback state)")
            }
        }

        val ws = client.newWebSocket(request, listener)
        webSocketRef = ws
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050505))
    ) {
        // Master View-Toggle (PC spec: [Agentic Dashboard | OpenCode Terminal])
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0A0A0C))
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.Center
        ) {
            Row(
                modifier = Modifier
                    .width(320.dp)
                    .height(30.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0xFF141416))
                    .border(1.dp, Color(0xFF27272A), RoundedCornerShape(6.dp))
                    .padding(2.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(4.dp))
                        .background(if (selectedView == "dashboard") Color(0xFF18181B) else Color.Transparent)
                        .clickable { selectedView = "dashboard" },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Agentic Dashboard",
                        color = if (selectedView == "dashboard") Color(0xFFE4E4E7) else Color(0xFFA1A1AA),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(4.dp))
                        .background(if (selectedView == "terminal") Color(0xFF18181B) else Color.Transparent)
                        .clickable { selectedView = "terminal" },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "OpenCode Terminal",
                        color = if (selectedView == "terminal") Color(0xFF10B981) else Color(0xFFA1A1AA),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        HorizontalDivider(color = Color(0xFF27272A))

        // Main Workspace Canvas
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            if (selectedView == "dashboard") {
                Column(modifier = Modifier.fillMaxSize()) {
                    TaskHeaderCard(currentTask)
                    StepList(planSteps, modifier = Modifier.weight(1f))
                }
            } else {
                // OpenCode Terminal (PC spec: 100% full-width command line interface, JetBrains Mono, green core@local:~$ prompt)
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF050505))
                        .padding(12.dp)
                ) {
                    Column {
                        Text(
                            "core@local:~$ archon-agent --run pipeline.py",
                            color = Color(0xFF10B981),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            items(liveLogs) { log ->
                                Text(
                                    log,
                                    color = if (log.contains("ERROR")) Color(0xFFE11D48) else if (log.contains("[GATE]")) Color(0xFFF59E0B) else Color(0xFFE4E4E7),
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Approval Gate Dialog rendering dangerous command details and solution_preview
    activeGate?.let { gate ->
        AlertDialog(
            onDismissRequest = { /* Require explicit approve or deny */ },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.Warning,
                        contentDescription = null,
                        tint = Color(0xFFE11D48),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Security Sandbox Approval Required",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "The agent requested to execute code in the workspace:",
                        color = Color(0xFFA1A1AA),
                        fontSize = 13.sp
                    )

                    Surface(
                        color = Color(0xFF18181B),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color(0xFF3F3F46)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text(
                                text = "Action: ${gate.action}",
                                color = Color(0xFFF59E0B),
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Command: ${gate.command}",
                                color = Color(0xFFE4E4E7),
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    if (gate.solutionPreview.isNotBlank()) {
                        Text(
                            text = "Solution Preview (solution.py):",
                            color = Color(0xFFE4E4E7),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                        Surface(
                            color = Color(0xFF0D0D10),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Color(0xFF27272A)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 200.dp)
                        ) {
                            Text(
                                text = gate.solutionPreview,
                                color = Color(0xFF34D399),
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val confirmPayload = JSONObject().apply {
                            put("id", gate.reqId)
                            put("type", "confirm")
                            put("payload", JSONObject().apply {
                                put("decision", "approve")
                            })
                        }
                        webSocketRef?.send(confirmPayload.toString())
                        liveLogs.add("[GATE] Approved by user.")
                        activeGate = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text("Approve & Run", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = {
                        val cancelPayload = JSONObject().apply {
                            put("id", gate.reqId)
                            put("type", "cancel")
                            put("payload", JSONObject().apply {
                                put("decision", "deny")
                            })
                        }
                        webSocketRef?.send(cancelPayload.toString())
                        liveLogs.add("[GATE] Denied by user.")
                        activeGate = null
                    },
                    border = BorderStroke(1.dp, Color(0xFFE11D48)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFE11D48)),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text("Deny")
                }
            },
            containerColor = Color(0xFF141416),
            shape = RoundedCornerShape(12.dp)
        )
    }
}

@Composable
fun TaskHeaderCard(task: AgentTask) {
    Surface(
        color = Color(0xFF111111),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFF27272A)),
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = task.title,
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = task.description,
                        color = Color(0xFFA1A1AA),
                        fontSize = 13.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                // Status badge
                Surface(
                    color = when (task.status) {
                        TaskStatus.RUNNING -> Color(0xFF4F46E5).copy(alpha = 0.2f)
                        TaskStatus.DONE -> Color(0xFF10B981).copy(alpha = 0.2f)
                        TaskStatus.FAILED -> Color(0xFFE11D48).copy(alpha = 0.2f)
                    },
                    shape = RoundedCornerShape(50),
                    border = BorderStroke(1.dp, when (task.status) {
                        TaskStatus.RUNNING -> Color(0xFF4F46E5)
                        TaskStatus.DONE -> Color(0xFF10B981)
                        TaskStatus.FAILED -> Color(0xFFE11D48)
                    })
                ) {
                    Text(
                        text = task.status.name,
                        color = when (task.status) {
                            TaskStatus.RUNNING -> Color(0xFF818CF8)
                            TaskStatus.DONE -> Color(0xFF34D399)
                            TaskStatus.FAILED -> Color(0xFFFB7185)
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                LinearProgressIndicator(
                    progress = { task.completedSteps.toFloat() / task.totalSteps },
                    modifier = Modifier.weight(1f).height(4.dp),
                    color = Color(0xFF00E599),
                    trackColor = Color(0xFF27272A),
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "${task.completedSteps} / ${task.totalSteps} steps",
                    color = Color(0xFFA1A1AA),
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}

@Composable
fun StepList(steps: List<PlanStep>, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
    ) {
        itemsIndexed(steps) { index, step ->
            StepItem(step, isLast = index == steps.lastIndex)
        }
    }
}

@Composable
fun StepItem(step: PlanStep, isLast: Boolean) {
    var expanded by remember { mutableStateOf(step.status == StepStatus.RUNNING) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(40.dp)
        ) {
            val iconTint = when (step.status) {
                StepStatus.DONE -> Color(0xFF10B981)
                StepStatus.FAILED -> Color(0xFFE11D48)
                else -> when (step.type) {
                    StepType.CODE -> Color(0xFF4F46E5)
                    StepType.TEST -> Color(0xFF10B981)
                    StepType.DEPLOY -> Color(0xFF00E599)
                    StepType.ANALYSIS -> Color(0xFFF59E0B)
                    StepType.GENERAL -> Color(0xFFA1A1AA)
                }
            }
            
            val iconImage = when (step.status) {
                StepStatus.DONE -> Icons.Outlined.CheckCircle
                StepStatus.FAILED -> Icons.Outlined.Error
                else -> when (step.type) {
                    StepType.CODE -> Icons.Outlined.Code
                    StepType.TEST -> Icons.Outlined.Science
                    StepType.DEPLOY -> Icons.Outlined.RocketLaunch
                    StepType.ANALYSIS -> Icons.Outlined.Analytics
                    StepType.GENERAL -> Icons.Outlined.Code
                }
            }

            Box(
                modifier = Modifier
                    .size(24.dp)
                    .background(Color.Transparent),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = iconImage,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(24.dp) // Requested: 24dp colored icon on left
                )
            }

            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .fillMaxHeight()
                        .background(Color(0xFF27272A))
                )
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(bottom = 24.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minHeight = 48.dp)
                    .clickable { expanded = !expanded }
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = step.title,
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.weight(1f)
                )
                
                Box(modifier = Modifier.size(24.dp), contentAlignment = Alignment.Center) {
                    when (step.status) {
                        StepStatus.PENDING -> Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color(0xFF52525B), shape = RoundedCornerShape(50))
                        )
                        StepStatus.RUNNING -> CircularProgressIndicator(
                            color = Color(0xFF4F46E5),
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(16.dp)
                        )
                        StepStatus.DONE -> Icon(
                            Icons.Outlined.Check,
                            contentDescription = "Done",
                            tint = Color(0xFF10B981),
                            modifier = Modifier.size(16.dp)
                        )
                        StepStatus.FAILED -> Icon(
                            Icons.Outlined.Close,
                            contentDescription = "Failed",
                            tint = Color(0xFFE11D48),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
            
            AnimatedVisibility(visible = expanded) {
                Surface(
                    color = Color(0xFF0A0A0A),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                ) {
                    Text(
                        text = step.detail,
                        color = Color(0xFFA1A1AA),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun LiveLogFeed(logs: List<String>, isCollapsible: Boolean, modifier: Modifier = Modifier) {
    var expanded by remember { mutableStateOf(true) }
    
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color(0xFF050505))
            .border(1.dp, Color(0xFF27272A), RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 48.dp)
                .run {
                    if (isCollapsible) clickable { expanded = !expanded } else this
                }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "LIVE OUTPUT",
                color = Color(0xFF00E599),
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace
            )
            if (isCollapsible) {
                Icon(
                    imageVector = if (expanded) Icons.Outlined.ExpandMore else Icons.Outlined.ExpandLess,
                    contentDescription = null,
                    tint = Color(0xFF00E599),
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        
        AnimatedVisibility(visible = expanded || !isCollapsible) {
            val listState = rememberLazyListState()
            LaunchedEffect(logs.size) {
                if (logs.isNotEmpty()) {
                    listState.animateScrollToItem(logs.lastIndex)
                }
            }
            
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 100.dp, max = 250.dp)
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 16.dp)
            ) {
                items(logs) { log ->
                    Text(
                        text = log,
                        color = Color(0xFF00E599),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun LiveLogFeedExpanded(logs: List<String>) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 48.dp)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "LIVE OUTPUT",
                color = Color(0xFF00E599),
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace
            )
        }
        
        val listState = rememberLazyListState()
        LaunchedEffect(logs.size) {
            if (logs.isNotEmpty()) {
                listState.animateScrollToItem(logs.lastIndex)
            }
        }
        
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
                .padding(bottom = 16.dp)
        ) {
            items(logs) { log ->
                Text(
                    text = log,
                    color = Color(0xFF00E599),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.padding(vertical = 2.dp)
                )
            }
        }
    }
}

@Composable
fun EmptyState() {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Outlined.SmartToy,
            contentDescription = null,
            tint = Color(0xFF4F46E5),
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "No Active Task",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Create a task in the Council or Chat to begin agent execution",
            color = Color(0xFFA1A1AA),
            fontSize = 14.sp,
            modifier = Modifier.padding(horizontal = 32.dp),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(32.dp))
        Row(horizontalArrangement = Arrangement.Center) {
            Button(
                onClick = { },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
                modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("New Task", color = Color.White)
            }
            Spacer(modifier = Modifier.width(16.dp))
            OutlinedButton(
                onClick = { },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFF27272A)),
                modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("View History")
            }
        }
    }
}
