package com.example.archonnotesinkcanvas

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.ui.Modifier
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.archonnotesinkcanvas.data.remote.BackendConfigStore
import com.example.archonnotesinkcanvas.ui.adaptive.AdaptiveScaffold
import com.example.archonnotesinkcanvas.ui.screens.*
import com.example.archonnotesinkcanvas.ui.main.TutorModeScreen
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import androidx.compose.ui.platform.LocalContext

@Composable
fun MainNavigation(windowSizeClass: WindowSizeClass) {
    val context = LocalContext.current
    val store = remember { BackendConfigStore(context) }

    // Check onboarding synchronously on first composition (value already in DataStore)
    val onboardingDone = remember {
        runBlocking { store.onboardingDone.first() }
    }

    val backStack = rememberNavBackStack(if (onboardingDone) Chat else Onboarding)
    val currentKey = backStack.lastOrNull()
    val currentDestination = when (currentKey) {
        is Chat -> "chat"
        is NotebookList -> "notebooks"
        is NotesMode -> "notebooks"
        is Tutor -> "tutor"
        is Dashboard -> "dashboard"
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
                val key: Any = when (dest) {
                    "chat" -> Chat
                    "notebooks" -> NotebookList
                    "tutor" -> Tutor
                    "dashboard" -> Dashboard
                    "settings" -> Settings
                    else -> Chat
                }
                // Replace top-level destination (no deep stack accumulation)
                while (backStack.size > 1) backStack.removeLastOrNull()
                if (backStack.lastOrNull()?.javaClass != key.javaClass) {
                    backStack.add(key as androidx.navigation3.runtime.NavKey)
                }
            }
        ) {
            NavDisplay(
                backStack = backStack,
                onBack = { backStack.removeLastOrNull() },
                entryProvider = entryProvider {
                    entry<Chat> { ChatScreen(windowSizeClass) }
                    entry<NotebookList> {
                        NotebookListScreen(
                            windowSizeClass = windowSizeClass,
                            onNotebookOpen = { id -> backStack.add(NotesMode(id)) }
                        )
                    }
                    entry<NotesMode> { key ->
                        com.example.archonnotesinkcanvas.ui.main.MainScreen(
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
                    entry<Dashboard> { DashboardScreen(windowSizeClass) }
                    entry<Settings> { SettingsScreen(windowSizeClass) }
                }
            )
        }
    }
}