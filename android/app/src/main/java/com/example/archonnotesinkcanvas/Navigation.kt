package com.example.archonnotesinkcanvas

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.archonnotesinkcanvas.data.remote.BackendConfigStore
import com.example.archonnotesinkcanvas.ui.adaptive.AdaptiveScaffold
import com.example.archonnotesinkcanvas.ui.adaptive.ArchonShellViewModel
import com.example.archonnotesinkcanvas.ui.screens.*
import com.example.archonnotesinkcanvas.ui.main.TutorModeScreen
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun PlaceholderScreen(label: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(label, style = MaterialTheme.typography.headlineMedium, color = Color(0xFFA0A0A0))
    }
}

@Composable
fun MainNavigation(windowSizeClass: WindowSizeClass) {
    val context = LocalContext.current
    val store = remember { BackendConfigStore(context) }
    val shellViewModel: ArchonShellViewModel = viewModel()

    val contextSidebarOpen by shellViewModel.contextSidebarOpen.collectAsState()
    val rightSidebarOpen by shellViewModel.rightSidebarOpen.collectAsState()
    val isBackendConnected by shellViewModel.isBackendConnected.collectAsState()
    val autopilotEnabled by shellViewModel.autopilotEnabled.collectAsState()
    val temperature by shellViewModel.temperature.collectAsState()
    val contextFiles by shellViewModel.contextFiles.collectAsState()
    val activityLogs by shellViewModel.activityLogs.collectAsState()
    val tokenUsage by shellViewModel.tokenUsage.collectAsState()
    val maxTokens by shellViewModel.maxTokens.collectAsState()

    // Settings modal overlay state (PC spec: Settings is a modal, not a page)
    var showSettingsModal by remember { mutableStateOf(false) }

    // Check onboarding synchronously on first composition (value already in DataStore)
    val onboardingDone = remember {
        runBlocking { store.onboardingDone.first() }
    }

    val backStack = rememberNavBackStack(if (onboardingDone) Chat else Onboarding)
    val currentKey = backStack.lastOrNull()
    val currentDestination = when (currentKey) {
        is Chat -> "chat"
        is Council -> "council"
        is Agents -> "agents"
        is Dashboard -> "dashboard"
        is NotebookRAG -> "notebook"
        is NotebookList -> "notes"
        is NotesMode -> "notes"
        is Tutor -> "tutor"
        is OCRModelTraining -> "ocr_model"
        is Research -> "research"
        is Obsidian -> "obsidian"
        is Directory -> "directory"
        is Settings -> "settings"
        else -> "chat"
    }

    // Wrap non-onboarding screens in AdaptiveScaffold
    if (currentKey is Onboarding) {
        NavDisplay(
            backStack = backStack,
            onBack = { backStack.removeLastOrNull() },
            entryProvider = entryProvider {
                entry<Onboarding> {
                    OnboardingScreen(onDone = {
                        runBlocking { store.setOnboardingDone(true) }
                        backStack.clear()
                        backStack.add(Chat)
                    })
                }
            }
        )
    } else {
        AdaptiveScaffold(
            windowSizeClass = windowSizeClass,
            currentDestination = currentDestination,
            onNavigate = { dest ->
                if (dest == "settings") {
                    // PC spec: Settings is a modal overlay, not a page
                    showSettingsModal = true
                    return@AdaptiveScaffold
                }
                val key: Any = when (dest) {
                    "chat" -> Chat
                    "council" -> Council
                    "agents" -> Agents
                    "dashboard" -> Dashboard
                    "notebook" -> NotebookRAG
                    "obsidian" -> NotesMode("demo-0")
                    "notes" -> NotesMode("demo-0")
                    "directory" -> Directory
                    "research" -> Research
                    else -> Chat
                }
                // Replace top-level destination (no deep stack accumulation)
                while (backStack.size > 1) backStack.removeLastOrNull()
                if (backStack.lastOrNull()?.javaClass != key.javaClass) {
                    backStack.add(key as androidx.navigation3.runtime.NavKey)
                }
                // Apply per-mode pane defaults (PC spec)
                shellViewModel.applyModeDefaults(dest)
            },
            contextSidebarOpen = contextSidebarOpen,
            rightSidebarOpen = rightSidebarOpen,
            isBackendConnected = isBackendConnected,
            autopilotEnabled = autopilotEnabled,
            onToggleAutopilot = { shellViewModel.toggleAutopilot() },
            temperature = temperature,
            contextFiles = contextFiles,
            activityLogs = activityLogs,
            tokenUsage = tokenUsage,
            maxTokens = maxTokens,
            onToggleContextSidebar = { shellViewModel.toggleContextSidebar() },
            onToggleRightSidebar = { shellViewModel.toggleRightSidebar() },
            onSetContextSidebarOpen = { shellViewModel.setContextSidebarOpen(it) },
            onSetRightSidebarOpen = { shellViewModel.setRightSidebarOpen(it) },
            onTemperatureChange = { shellViewModel.setTemperature(it) },
            onAddContextFile = { shellViewModel.addContextFile(it) },
            onRemoveContextFile = { shellViewModel.removeContextFile(it) }
        ) {
            NavDisplay(
                backStack = backStack,
                onBack = { backStack.removeLastOrNull() },
                entryProvider = entryProvider {
                    entry<Chat> { ChatScreen(windowSizeClass) }
                    entry<Council> { CouncilScreen(windowSizeClass) }
                    entry<Agents> { AgentsScreen(windowSizeClass) }
                    entry<Research> { ResearchScreen(windowSizeClass) }
                    entry<NotebookRAG> { NotebookRAGScreen(windowSizeClass) }
                    entry<NotebookList> {
                        NotebookListScreen(
                            windowSizeClass = windowSizeClass,
                            onNotebookOpen = { id -> backStack.add(NotesMode(id)) }
                        )
                    }
                    entry<Obsidian> {
                        NotebookListScreen(
                            windowSizeClass = windowSizeClass,
                            onNotebookOpen = { id -> backStack.add(NotesMode(id)) }
                        )
                    }
                    entry<Directory> {
                        PlaceholderScreen("Agents Directory")
                    }
                    entry<NotesMode> { key ->
                        com.example.archonnotesinkcanvas.ui.main.MainScreen(
                            notebookId = key.notebookId,
                            onItemClick = { backStack.add(it) },
                            modifier = Modifier.safeDrawingPadding()
                        )
                    }
                    entry<Tutor> {
                        TutorModeScreen(
                            onBackClick = { backStack.removeLastOrNull() },
                            modifier = Modifier.safeDrawingPadding()
                        )
                    }
                    entry<Dashboard> {
                        DashboardScreen(
                            windowSizeClass = windowSizeClass,
                            onNavigate = { dest ->
                                val key: Any = when (dest) {
                                    "chat" -> Chat
                                    "council" -> Council
                                    "agents" -> Agents
                                    "dashboard" -> Dashboard
                                    "notebook" -> NotebookRAG
                                    "notes" -> NotebookList
                                    "tutor" -> Tutor
                                    "ocr_model" -> OCRModelTraining
                                    "settings" -> Settings
                                    "research" -> Research
                                    "obsidian" -> Obsidian
                                    "directory" -> Directory
                                    else -> Chat
                                }
                                while (backStack.size > 1) backStack.removeLastOrNull()
                                if (backStack.lastOrNull()?.javaClass != key.javaClass) {
                                    backStack.add(key as androidx.navigation3.runtime.NavKey)
                                }
                            },
                            isBackendConnected = isBackendConnected
                        )
                    }
                    entry<Settings> { SettingsScreen(windowSizeClass) }
                    entry<OCRModelTraining> {
                        val ocrVm: com.example.archonnotesinkcanvas.ui.main.OCRTrainingViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
                        val totalSamples by ocrVm.totalSamples.collectAsState()
                        val certainSamples by ocrVm.certainUnusedSamples.collectAsState()
                        val activeCheckpoint by ocrVm.activeCheckpoint.collectAsState()
                        val recentSamples by ocrVm.recentSamples.collectAsState()

                        LaunchedEffect(Unit) { ocrVm.loadStats() }

                        com.example.archonnotesinkcanvas.ui.components.OCRTrainingDashboard(
                            totalSamples = totalSamples,
                            certainUnusedSamples = certainSamples,
                            activeCheckpoint = activeCheckpoint,
                            recentSamples = recentSamples,
                            onTriggerTraining = { ocrVm.triggerTraining() },
                            onBackClick = { backStack.removeLastOrNull() },
                            windowSizeClass = windowSizeClass,
                            modifier = Modifier.safeDrawingPadding()
                        )
                    }
                }
            )

            if (showSettingsModal) {
                SettingsModal(
                    windowSizeClass = windowSizeClass,
                    onDismiss = { showSettingsModal = false }
                )
            }
        }
    }
}