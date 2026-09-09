package com.example.archonnotesinkcanvas.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.archonnotesinkcanvas.data.local.ArchonDatabase
import com.example.archonnotesinkcanvas.data.local.entities.NotebookEntity
import com.example.archonnotesinkcanvas.data.local.entities.NotebookPageEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

// ── Data models ───────────────────────────────────────────────────────────────

data class AgentResponse(
    val role: String,
    val description: String,
    val accent: Color,
    val icon: ImageVector,
    val response: String,
    val isLoading: Boolean = false
)

/** Three-round debate round label */
enum class DebateRound(val label: String, val color: Color) {
    DRAFT("Round 1 · Draft", Color(0xFF4F46E5)),
    CRITIQUE("Round 2 · Critique", Color(0xFFF59E0B)),
    CONSENSUS("Round 3 · Consensus", Color(0xFF10B981))
}

data class CouncilVerdict(
    val recommendedApproach: String,
    val keyTradeoffs: List<String>,
    val nextSteps: List<String>
)

// ── Available model pool ──────────────────────────────────────────────────────

data class ModelOption(val id: String, val label: String, val accent: Color)

val allModels = listOf(
    ModelOption("gpt4o",      "GPT-4o",          Color(0xFF10B981)),
    ModelOption("gemini15",   "Gemini 1.5 Pro",  Color(0xFF4F46E5)),
    ModelOption("claude35",   "Claude 3.5",       Color(0xFFE11D48)),
    ModelOption("mistral",    "Mistral Large",    Color(0xFFF59E0B))
)

// ── Main composable ───────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CouncilScreen(windowSizeClass: WindowSizeClass) {
    val context = LocalContext.current
    val scope   = rememberCoroutineScope()
    val isExpanded = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Expanded

    var query by remember { mutableStateOf("") }
    var currentRound by remember { mutableStateOf<DebateRound?>(null) }
    var isRunning    by remember { mutableStateOf(false) }
    var hasRun       by remember { mutableStateOf(false) }

    // Model selector (2-4 models)
    val selectedModels = remember { mutableStateListOf("gpt4o", "gemini15", "claude35") }

    // Per-model, per-round responses: map of modelId -> map of round -> response text
    val responses = remember {
        mutableStateMapOf<String, MutableMap<DebateRound, String>>()
    }
    val loadingStates = remember {
        mutableStateMapOf<String, Boolean>()
    }

    var verdict by remember { mutableStateOf<CouncilVerdict?>(null) }
    var savingVerdict by remember { mutableStateOf(false) }

    // Agent personalities for icon + accent lookup
    val agentMeta: Map<String, Pair<ImageVector, Color>> = remember {
        mapOf(
            "gpt4o"    to (Icons.Outlined.Psychology    to Color(0xFF10B981)),
            "gemini15" to (Icons.Outlined.Hub           to Color(0xFF4F46E5)),
            "claude35" to (Icons.Outlined.EmojiEmotions to Color(0xFFE11D48)),
            "mistral"  to (Icons.Outlined.School        to Color(0xFFF59E0B))
        )
    }

    // Generate stub text for a given model + round
    fun stubResponse(modelId: String, round: DebateRound, topic: String): String = when (round) {
        DebateRound.DRAFT -> when (modelId) {
            "gpt4o"    -> "[$modelId Draft] From a systems-engineering lens, $topic demands a layered separation-of-concerns approach. The core mechanism should remain deterministic, with probabilistic components quarantined to well-defined interfaces."
            "gemini15" -> "[$modelId Draft] Multimodal context enrichment is key. $topic benefits from cross-domain knowledge fusion via structured retrieval, reducing hallucination risk by 40% in empirical benchmarks."
            "claude35" -> "[$modelId Draft] Constitutional alignment must be embedded at the specification layer, not bolted on. For $topic, define hard invariants upfront: safety bounds, fallback policies, and audit trails."
            else       -> "[$modelId Draft] Pragmatic efficiency over theoretical purity. $topic can be solved with existing primitives if we aggressively prune scope. YAGNI + KISS apply at every layer."
        }
        DebateRound.CRITIQUE -> when (modelId) {
            "gpt4o"    -> "[$modelId Critique] The gemini15 retrieval proposal introduces O(n²) index rebuild cost under hot-update workloads. Propose a delta-index strategy with lazy consolidation."
            "gemini15" -> "[$modelId Critique] GPT-4o's determinism constraint over-constrains the design. Probabilistic components behind typed interfaces are not a risk — they're the only scalable path."
            "claude35" -> "[$modelId Critique] Both prior proposals under-specify the failure mode taxonomy. What happens at the trust boundary when invariants are violated? The spec is silent."
            else       -> "[$modelId Critique] Over-engineering detected. The constitutional + retrieval stack adds 220ms p99 latency. A simpler rule-engine with cached embeddings closes 95% of the gap."
        }
        DebateRound.CONSENSUS -> when (modelId) {
            "gpt4o"    -> "[$modelId Consensus] Converge on typed probabilistic interfaces (gemini15) + constitutional invariants at spec time (claude35) + lazy delta-indexing (gpt4o). Dismiss scope creep."
            "gemini15" -> "[$modelId Consensus] Agreed on typed interfaces. Recommend hybrid: eager index for top-100 queries, lazy delta for the long tail. Latency target: <80ms p95."
            "claude35" -> "[$modelId Consensus] Alignment on failure taxonomy is achieved. Enumerate 5 invariant classes; each gets an automated circuit-breaker policy in the runtime."
            else       -> "[$modelId Consensus] Scope trimmed to MVP: rule-engine + delta-index + typed interfaces. Phased rollout with A/B telemetry to validate latency SLA."
        }
    }

    fun runRound(round: DebateRound) {
        currentRound = round
        selectedModels.forEach { modelId ->
            loadingStates[modelId] = true
            scope.launch {
                delay((800L..2000L).random())
                responses.getOrPut(modelId) { mutableMapOf() }[round] = stubResponse(modelId, round, query)
                loadingStates[modelId] = false
            }
        }
    }

    fun runCouncil() {
        if (query.isBlank() || selectedModels.size < 2) return
        hasRun  = true
        isRunning = true
        verdict = null
        responses.clear()
        loadingStates.clear()

        scope.launch {
            // Round 1: Drafts
            runRound(DebateRound.DRAFT)
            delay(2400)

            // Round 2: Critiques
            runRound(DebateRound.CRITIQUE)
            delay(2400)

            // Round 3: Consensus
            runRound(DebateRound.CONSENSUS)
            delay(2000)

            // Synthesize verdict
            verdict = CouncilVerdict(
                recommendedApproach = "Adopt typed-interface probabilistic components (R1 gemini15) with constitutional invariants at spec time (R1 claude35). Apply lazy delta-index with eager top-100 bucket (R3 gemini15). Scope constrained to MVP per R3 mistral.",
                keyTradeoffs = listOf(
                    "Typed interfaces add ~12ms overhead vs. raw probability — worth it for debuggability.",
                    "Delta-index lazy consolidation trades peak CPU burst for steady-state latency improvement.",
                    "Constitutional invariants at spec time increase upfront design cost by ~20% but eliminate runtime surprises."
                ),
                nextSteps = listOf(
                    "Define the 5 invariant classes with circuit-breaker policies.",
                    "Prototype delta-index with A/B telemetry targeting <80ms p95.",
                    "Ship typed-interface proof-of-concept to staging within 2 sprints."
                )
            )
            isRunning = false
            currentRound = DebateRound.CONSENSUS
        }
    }

    fun saveVerdictToNotebook() {
        val v = verdict ?: return
        savingVerdict = true
        scope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val db = ArchonDatabase.getInstance(context)
                    val notebookId = "nb_council_${System.currentTimeMillis()}"
                    val cleanTopic = query.take(40)
                    val nb = NotebookEntity(
                        notebookId = notebookId,
                        title = "Council Verdict: $cleanTopic",
                        createdAt = System.currentTimeMillis(),
                        updatedAt = System.currentTimeMillis()
                    )
                    db.notebookDao().upsert(nb)

                    val verdictMarkdown = buildString {
                        appendLine("# Council Verdict: $cleanTopic")
                        appendLine()
                        appendLine("## Recommended Approach")
                        appendLine(v.recommendedApproach)
                        appendLine()
                        appendLine("## Key Trade-offs")
                        v.keyTradeoffs.forEach { appendLine("- $it") }
                        appendLine()
                        appendLine("## Next Steps")
                        v.nextSteps.forEachIndexed { i, s -> appendLine("${i + 1}. $s") }
                    }

                    db.pageDao().insertPage(
                        NotebookPageEntity(
                            pageId     = "page_${UUID.randomUUID()}",
                            notebookId = notebookId,
                            pageNumber = 1,
                            strokeData = verdictMarkdown,
                            subject    = "Council",
                            topic      = cleanTopic
                        )
                    )
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Verdict saved to Notebook: $cleanTopic", Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Saved locally (Offline Mode)", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            savingVerdict = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050505))
    ) {
        // ── Header bar ────────────────────────────────────────────────────────
        CouncilHeader(
            query             = query,
            onQueryChange     = { query = it },
            onRun             = { runCouncil() },
            isRunning         = isRunning,
            currentRound      = currentRound,
            selectedModels    = selectedModels,
            onModelToggle     = { id ->
                if (selectedModels.contains(id)) {
                    if (selectedModels.size > 2) selectedModels.remove(id)
                } else {
                    if (selectedModels.size < 4) selectedModels.add(id)
                }
            }
        )

        // ── Body ──────────────────────────────────────────────────────────────
        if (isExpanded) {
            Row(modifier = Modifier.fillMaxSize()) {
                // Left: round panels
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .padding(horizontal = 12.dp),
                    contentPadding = PaddingValues(vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    DebateRound.entries.forEach { round ->
                        item(key = round.name) {
                            DebateRoundSection(
                                round          = round,
                                selectedModels = selectedModels,
                                responses      = responses,
                                loadingStates  = loadingStates,
                                agentMeta      = agentMeta,
                                isActive       = currentRound == round || (currentRound?.ordinal ?: -1) > round.ordinal
                            )
                        }
                    }
                }
                // Right: verdict panel
                Box(
                    modifier = Modifier
                        .width(340.dp)
                        .fillMaxHeight()
                        .padding(end = 12.dp, top = 12.dp, bottom = 12.dp)
                ) {
                    VerdictColumn(
                        verdict      = verdict,
                        isRunning    = isRunning,
                        saving       = savingVerdict,
                        onSave       = { saveVerdictToNotebook() }
                    )
                }
            }
        } else {
            LazyColumn(
                modifier          = Modifier.fillMaxSize(),
                contentPadding    = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                DebateRound.entries.forEach { round ->
                    item(key = round.name) {
                        DebateRoundSection(
                            round          = round,
                            selectedModels = selectedModels,
                            responses      = responses,
                            loadingStates  = loadingStates,
                            agentMeta      = agentMeta,
                            isActive       = currentRound == round || (currentRound?.ordinal ?: -1) > round.ordinal
                        )
                    }
                }
                item(key = "verdict") {
                    VerdictColumn(
                        verdict   = verdict,
                        isRunning = isRunning,
                        saving    = savingVerdict,
                        onSave    = { saveVerdictToNotebook() }
                    )
                }
            }
        }
    }
}

// ── Header ─────────────────────────────────────────────────────────────────────

@Composable
private fun CouncilHeader(
    query          : String,
    onQueryChange  : (String) -> Unit,
    onRun          : () -> Unit,
    isRunning      : Boolean,
    currentRound   : DebateRound?,
    selectedModels : List<String>,
    onModelToggle  : (String) -> Unit
) {
    Surface(
        color  = Color(0xFF0A0A0C),
        border = BorderStroke(1.dp, Color(0xFF27272A)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Query row
            Row(
                modifier             = Modifier.fillMaxWidth(),
                verticalAlignment    = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value           = query,
                    onValueChange   = onQueryChange,
                    modifier        = Modifier.weight(1f),
                    placeholder     = {
                        Text(
                            "Multicast question to the council…",
                            color     = Color(0xFF71717A),
                            fontSize  = 13.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    },
                    leadingIcon = {
                        Icon(Icons.Outlined.Forum, contentDescription = null,
                            tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                    },
                    colors     = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor    = Color(0xFFF59E0B),
                        unfocusedBorderColor  = Color(0xFF27272A),
                        focusedContainerColor   = Color(0xFF121215),
                        unfocusedContainerColor = Color(0xFF121215),
                        focusedTextColor      = Color(0xFFE4E4E7),
                        unfocusedTextColor    = Color(0xFFE4E4E7)
                    ),
                    shape      = RoundedCornerShape(10.dp),
                    singleLine = true
                )

                Button(
                    onClick  = onRun,
                    enabled  = !isRunning && query.isNotBlank() && selectedModels.size >= 2,
                    colors   = ButtonDefaults.buttonColors(
                        containerColor         = Color(0xFFF59E0B),
                        contentColor           = Color.Black,
                        disabledContainerColor = Color(0xFF27272A)
                    ),
                    shape           = RoundedCornerShape(10.dp),
                    contentPadding  = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    if (isRunning) {
                        CircularProgressIndicator(
                            modifier   = Modifier.size(16.dp),
                            color      = Color.Black,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Row(
                            verticalAlignment    = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Outlined.AccountBalance, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("Debate", fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Model selector chips (2-4 models)
            Row(
                verticalAlignment    = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    "MODELS:",
                    color      = Color(0xFF71717A),
                    fontSize   = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                allModels.forEach { model ->
                    val selected = selectedModels.contains(model.id)
                    ModelChip(model = model, selected = selected, onToggle = { onModelToggle(model.id) })
                }
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text      = "${selectedModels.size}/4 selected",
                    color     = Color(0xFF52525B),
                    fontSize  = 10.sp,
                    fontFamily = FontFamily.Monospace
                )
            }

            // Active round progress indicator
            if (currentRound != null) {
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(DebateRound.entries) { round ->
                        val done = round.ordinal <= (currentRound?.ordinal ?: -1)
                        Surface(
                            color  = if (done) round.color.copy(alpha = 0.18f) else Color(0xFF141418),
                            shape  = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, if (done) round.color.copy(alpha = 0.6f) else Color(0xFF27272A))
                        ) {
                            Row(
                                modifier              = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment     = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                if (done) {
                                    Icon(Icons.Filled.Check, contentDescription = null,
                                        tint     = round.color,
                                        modifier = Modifier.size(10.dp))
                                }
                                Text(
                                    text      = round.label,
                                    color     = if (done) round.color else Color(0xFF71717A),
                                    fontSize  = 10.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Model chip ─────────────────────────────────────────────────────────────────

@Composable
private fun ModelChip(model: ModelOption, selected: Boolean, onToggle: () -> Unit) {
    Surface(
        color    = if (selected) model.accent.copy(alpha = 0.18f) else Color(0xFF141418),
        shape    = RoundedCornerShape(12.dp),
        border   = BorderStroke(1.dp, if (selected) model.accent.copy(alpha = 0.6f) else Color(0xFF27272A)),
        modifier = Modifier.clickable { onToggle() }
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(5.dp)
                    .clip(CircleShape)
                    .background(if (selected) model.accent else Color(0xFF52525B))
            )
            Text(
                text       = model.label,
                color      = if (selected) model.accent else Color(0xFF71717A),
                fontSize   = 10.sp,
                fontFamily = FontFamily.Monospace
            )
            if (selected) {
                Icon(Icons.Filled.Check, contentDescription = null,
                    tint     = model.accent,
                    modifier = Modifier.size(10.dp))
            }
        }
    }
}

// ── Debate round section ───────────────────────────────────────────────────────

@Composable
private fun DebateRoundSection(
    round          : DebateRound,
    selectedModels : List<String>,
    responses      : Map<String, Map<DebateRound, String>>,
    loadingStates  : Map<String, Boolean>,
    agentMeta      : Map<String, Pair<ImageVector, Color>>,
    isActive       : Boolean
) {
    Column {
        // Round header divider
        Row(
            verticalAlignment    = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier             = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(if (isActive) round.color else Color(0xFF3F3F46))
            )
            Text(
                text       = round.label.uppercase(),
                color      = if (isActive) round.color else Color(0xFF3F3F46),
                fontSize   = 10.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                letterSpacing = 1.sp
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(1.dp)
                    .background(if (isActive) round.color.copy(alpha = 0.3f) else Color(0xFF1E1E24))
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Critiques get a visual separator note
        if (round == DebateRound.CRITIQUE && isActive) {
            Surface(
                color    = Color(0xFFF59E0B).copy(alpha = 0.08f),
                shape    = RoundedCornerShape(6.dp),
                border   = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.25f)),
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            ) {
                Row(
                    modifier              = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment     = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Outlined.Forum, contentDescription = null,
                        tint = Color(0xFFF59E0B), modifier = Modifier.size(12.dp))
                    Text(
                        "Each model critiques the other Round 1 drafts — cross-challenge mode active.",
                        color     = Color(0xFFF59E0B),
                        fontSize  = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        // Model response cards
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            selectedModels.forEach { modelId ->
                val meta     = agentMeta[modelId] ?: (Icons.Outlined.Psychology to Color(0xFF818CF8))
                val icon     = meta.first
                val accent   = meta.second
                val text     = responses[modelId]?.get(round)
                val loading  = loadingStates[modelId] == true && text == null && isActive

                AnimatedVisibility(
                    visible = isActive,
                    enter   = fadeIn(tween(300)) + expandVertically(),
                    exit    = fadeOut() + shrinkVertically()
                ) {
                    AgentRoundCard(
                        modelId   = modelId,
                        round     = round,
                        icon      = icon,
                        accent    = accent,
                        text      = text,
                        isLoading = loading
                    )
                }
            }
        }
    }
}

// ── Per-model round card ───────────────────────────────────────────────────────

@Composable
private fun AgentRoundCard(
    modelId   : String,
    round     : DebateRound,
    icon      : ImageVector,
    accent    : Color,
    text      : String?,
    isLoading : Boolean
) {
    Surface(
        color  = Color(0xFF0E0E12),
        shape  = RoundedCornerShape(10.dp),
        border = BorderStroke(
            width = 1.dp,
            brush = if (text != null) Brush.horizontalGradient(listOf(accent.copy(alpha = 0.6f), Color(0xFF1E1E24)))
                    else              Brush.horizontalGradient(listOf(Color(0xFF1E1E24), Color(0xFF1E1E24)))
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment    = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier             = Modifier.fillMaxWidth()
            ) {
                Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(14.dp))
                Text(
                    text       = modelId.uppercase(),
                    color      = accent,
                    fontSize   = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Spacer(modifier = Modifier.weight(1f))
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier    = Modifier.size(11.dp),
                        strokeWidth = 2.dp,
                        color       = accent
                    )
                } else if (text != null) {
                    Surface(
                        color  = Color(0xFF10B981).copy(alpha = 0.15f),
                        shape  = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            "DONE",
                            color      = Color(0xFF10B981),
                            fontSize   = 8.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            modifier   = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            when {
                isLoading -> Text(
                    "Generating ${round.label.lowercase()} response…",
                    color     = Color(0xFF52525B),
                    fontSize  = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
                text != null -> Text(
                    text,
                    color      = Color(0xFFD4D4D8),
                    fontSize   = 11.5.sp,
                    fontFamily  = FontFamily.Monospace,
                    lineHeight  = 16.sp
                )
                else -> Text(
                    "Awaiting debate trigger…",
                    color      = Color(0xFF3F3F46),
                    fontSize   = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}

// ── Council Verdict card ───────────────────────────────────────────────────────

@Composable
private fun VerdictColumn(
    verdict   : CouncilVerdict?,
    isRunning : Boolean,
    saving    : Boolean,
    onSave    : () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Section label
        Row(
            verticalAlignment    = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(Icons.Outlined.Gavel, contentDescription = null,
                tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
            Text(
                "COUNCIL VERDICT",
                color      = Color(0xFF10B981),
                fontSize   = 11.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                letterSpacing = 1.sp
            )
        }

        if (isRunning && verdict == null) {
            Surface(
                color    = Color(0xFF0E1410),
                shape    = RoundedCornerShape(12.dp),
                border   = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.25f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier              = Modifier.padding(16.dp),
                    verticalAlignment     = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    CircularProgressIndicator(
                        modifier    = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color       = Color(0xFF10B981)
                    )
                    Text(
                        "Synthesizing 3-round debate into consensus verdict…",
                        color      = Color(0xFF71717A),
                        fontSize   = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        lineHeight = 15.sp
                    )
                }
            }
        } else if (verdict == null) {
            Surface(
                color    = Color(0xFF0A0A0C),
                shape    = RoundedCornerShape(12.dp),
                border   = BorderStroke(1.dp, Color(0xFF1E1E24)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(modifier = Modifier.padding(24.dp), contentAlignment = Alignment.Center) {
                    Text(
                        "Verdict appears after all 3 debate rounds complete.",
                        color      = Color(0xFF3F3F46),
                        fontSize   = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        lineHeight = 15.sp
                    )
                }
            }
        } else {
            // Verdict card
            Surface(
                color    = Color(0xFF081510),
                shape    = RoundedCornerShape(12.dp),
                border   = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.45f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Recommended Approach
                    VerdictSection(
                        icon  = Icons.Outlined.Lightbulb,
                        color = Color(0xFF10B981),
                        title = "Recommended Approach"
                    ) {
                        Text(
                            verdict.recommendedApproach,
                            color      = Color(0xFFD4D4D8),
                            fontSize   = 11.5.sp,
                            fontFamily = FontFamily.Monospace,
                            lineHeight = 16.sp
                        )
                    }

                    HorizontalDivider(
                        color     = Color(0xFF27272A),
                        modifier  = Modifier.padding(vertical = 10.dp)
                    )

                    // Key Trade-offs
                    VerdictSection(
                        icon  = Icons.Outlined.CompareArrows,
                        color = Color(0xFFF59E0B),
                        title = "Key Trade-offs"
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            verdict.keyTradeoffs.forEach { tradeoff ->
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment     = Alignment.Top
                                ) {
                                    Text("•", color = Color(0xFFF59E0B), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                    Text(
                                        tradeoff,
                                        color      = Color(0xFFA1A1AA),
                                        fontSize   = 11.sp,
                                        fontFamily = FontFamily.Monospace,
                                        lineHeight = 15.sp
                                    )
                                }
                            }
                        }
                    }

                    HorizontalDivider(
                        color    = Color(0xFF27272A),
                        modifier = Modifier.padding(vertical = 10.dp)
                    )

                    // Next Steps
                    VerdictSection(
                        icon  = Icons.Outlined.ArrowForward,
                        color = Color(0xFF4F46E5),
                        title = "Next Steps"
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            verdict.nextSteps.forEachIndexed { i, step ->
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment     = Alignment.Top
                                ) {
                                    Surface(
                                        color  = Color(0xFF4F46E5).copy(alpha = 0.2f),
                                        shape  = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            "${i + 1}",
                                            color      = Color(0xFF818CF8),
                                            fontSize   = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace,
                                            modifier   = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                        )
                                    }
                                    Text(
                                        step,
                                        color      = Color(0xFFA1A1AA),
                                        fontSize   = 11.sp,
                                        fontFamily = FontFamily.Monospace,
                                        lineHeight = 15.sp
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Save to Notebook
                    Button(
                        onClick  = onSave,
                        enabled  = !saving,
                        modifier = Modifier.fillMaxWidth(),
                        colors   = ButtonDefaults.buttonColors(
                            containerColor         = Color(0xFF0F4023),
                            contentColor           = Color(0xFF10B981),
                            disabledContainerColor = Color(0xFF141418)
                        ),
                        shape           = RoundedCornerShape(8.dp),
                        border          = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.4f)),
                        contentPadding  = PaddingValues(vertical = 10.dp)
                    ) {
                        if (saving) {
                            CircularProgressIndicator(
                                modifier    = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color       = Color(0xFF10B981)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Saving…", fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                        } else {
                            Icon(Icons.Outlined.BookmarkAdd, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Save Verdict to Notebook", fontFamily = FontFamily.Monospace, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VerdictSection(
    icon  : ImageVector,
    color : Color,
    title : String,
    content: @Composable () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            verticalAlignment    = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(12.dp))
            Text(
                title.uppercase(),
                color      = color,
                fontSize   = 9.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                letterSpacing = 0.8.sp
            )
        }
        content()
    }
}

// ── Unused legacy composables preserved for call-site compatibility ────────────

@Composable
fun PreQueryAgentCard(agent: AgentResponse, modifier: Modifier = Modifier) {
    ElevatedCard(
        modifier = modifier.padding(8.dp),
        colors   = CardDefaults.elevatedCardColors(containerColor = Color(0xFF111111)),
        shape    = RoundedCornerShape(12.dp)
    ) {
        Box(modifier = Modifier.border(1.dp, Color(0xFF27272A), RoundedCornerShape(12.dp))) {
            Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
                Icon(imageVector = agent.icon, contentDescription = null, tint = agent.accent, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = agent.role, fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 15.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = agent.description, fontSize = 13.sp, color = Color(0xFFA1A1AA))
            }
        }
    }
}

@Composable
fun PostQueryAgentCard(agent: AgentResponse, modifier: Modifier = Modifier) {
    ElevatedCard(
        modifier = modifier.padding(8.dp),
        colors   = CardDefaults.elevatedCardColors(containerColor = Color(0xFF111111)),
        shape    = RoundedCornerShape(12.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
            Box(modifier = Modifier.fillMaxHeight().width(4.dp).background(agent.accent))
            Column(modifier = Modifier.padding(16.dp).weight(1f)) {
                Row(
                    verticalAlignment    = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier             = Modifier.fillMaxWidth()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = agent.icon, contentDescription = null, tint = agent.accent, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = agent.role, fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 15.sp)
                    }
                    if (agent.isLoading) {
                        CircularProgressIndicator(color = agent.accent, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Box(modifier = Modifier.background(Color(0xFF10B981).copy(alpha = 0.2f), RoundedCornerShape(12.dp)).padding(horizontal = 8.dp, vertical = 2.dp)) {
                            Text("DONE", color = Color(0xFF10B981), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                if (agent.isLoading) {
                    Text(text = "Thinking…", color = Color(0xFFA1A1AA), fontSize = 14.sp)
                } else if (agent.response.isNotEmpty()) {
                    Text(text = agent.response, color = Color.White, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
fun SynthesisCard(agent: AgentResponse, modifier: Modifier = Modifier) {
    ElevatedCard(
        modifier = modifier.padding(8.dp).fillMaxWidth(),
        colors   = CardDefaults.elevatedCardColors(containerColor = Color(0xFF0A1628)),
        shape    = RoundedCornerShape(12.dp)
    ) {
        Box(modifier = Modifier.border(1.dp, Color(0xFF00E599), RoundedCornerShape(12.dp))) {
            Column(modifier = Modifier.padding(16.dp).fillMaxWidth()) {
                Text(text = "SYNTHESIS", color = Color(0xFF00E599), fontSize = 11.sp, fontFamily = FontFamily.Monospace, letterSpacing = 2.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = agent.response, color = Color.White, fontSize = 14.sp)
            }
        }
    }
}
