package com.example.archonnotesinkcanvas.ui.adaptive

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.archonnotesinkcanvas.theme.ArchonDesignTokens
import com.example.archonnotesinkcanvas.ui.components.ContextSidebarPane
import com.example.archonnotesinkcanvas.ui.components.GATED_CONTEXT_SIDEBAR_MODES
import com.example.archonnotesinkcanvas.ui.components.RightSidebarPane

data class Destination(
    val key: String,
    val icon: ImageVector,
    val label: String,
    val accentColor: Color = ArchonDesignTokens.AccentIndigo
)

// PC spec: 4 core modes in exact order
val destinations = listOf(
    Destination("chat", Icons.Outlined.Chat, "Chat", ArchonDesignTokens.AccentIndigo),
    Destination("council", Icons.Outlined.AccountBalance, "Council", ArchonDesignTokens.AccentRose),
    Destination("agents", Icons.Outlined.SmartToy, "Agents", ArchonDesignTokens.AccentEmerald),
    Destination("research", Icons.Outlined.Search, "Research", Color(0xFF8B5CF6)) // Soft Violet
)

@Composable
fun AdaptiveScaffold(
    windowSizeClass: WindowSizeClass,
    currentDestination: String,
    onNavigate: (String) -> Unit,
    contextSidebarOpen: Boolean,
    rightSidebarOpen: Boolean,
    isBackendConnected: Boolean,
    autopilotEnabled: Boolean = false,
    onToggleAutopilot: () -> Unit = {},
    temperature: Float,
    contextFiles: List<String>,
    activityLogs: List<String>,
    tokenUsage: Int,
    maxTokens: Int,
    onToggleContextSidebar: () -> Unit,
    onToggleRightSidebar: () -> Unit,
    onSetContextSidebarOpen: (Boolean) -> Unit,
    onSetRightSidebarOpen: (Boolean) -> Unit,
    onTemperatureChange: (Float) -> Unit,
    onAddContextFile: (String) -> Unit,
    onRemoveContextFile: (String) -> Unit,
    content: @Composable () -> Unit
) {
    val isContextGated = currentDestination in GATED_CONTEXT_SIDEBAR_MODES

    when (windowSizeClass.widthSizeClass) {
        WindowWidthSizeClass.Expanded -> {
            // Tier 1: Expanded (>= 840dp) - Persistent 4-zone shell
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .background(ArchonDesignTokens.AppBackground)
            ) {
                // Zone 2: Fixed 56dp NavRail
                NavRail(
                    currentDestination = currentDestination,
                    onNavigate = onNavigate,
                    isBackendConnected = isBackendConnected
                )

                // Zone 4 Left: Persistent 224dp Context Sidebar
                ContextSidebarPane(
                    currentDestination = currentDestination,
                    isOpen = contextSidebarOpen,
                    onClose = { onSetContextSidebarOpen(false) },
                    windowSizeClass = windowSizeClass
                )

                // Zone 3: Flex-1 Center Pane Workspace with 36dp TopBar
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .background(ArchonDesignTokens.AppBackground)
                ) {
                    // Zone 1: Fixed 36dp Height TopBar
                    CenterPaneTopBar(
                        currentDestination = currentDestination,
                        isContextGated = isContextGated,
                        contextSidebarOpen = contextSidebarOpen,
                        rightSidebarOpen = rightSidebarOpen,
                        isBackendConnected = isBackendConnected,
                        autopilotEnabled = autopilotEnabled,
                        onToggleAutopilot = onToggleAutopilot,
                        onToggleLeft = onToggleContextSidebar,
                        onToggleRight = onToggleRightSidebar
                    )

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                    ) {
                        content()
                    }
                }

                // Zone 4 Right: Persistent 256dp Right Inspector Sidebar
                RightSidebarPane(
                    isOpen = rightSidebarOpen,
                    onClose = { onSetRightSidebarOpen(false) },
                    windowSizeClass = windowSizeClass,
                    temperature = temperature,
                    onTemperatureChange = onTemperatureChange,
                    contextFiles = contextFiles,
                    activityLogs = activityLogs,
                    tokenUsage = tokenUsage,
                    maxTokens = maxTokens,
                    onAddFile = onAddContextFile,
                    onRemoveFile = onRemoveContextFile
                )
            }
        }

        WindowWidthSizeClass.Medium -> {
            // Tier 2: Medium (600-839dp) - Persistent 56dp NavRail + Center Pane flex-1 + Overlay sidebars
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .background(ArchonDesignTokens.AppBackground)
            ) {
                // Persistent 56dp NavRail
                NavRail(
                    currentDestination = currentDestination,
                    onNavigate = onNavigate,
                    isBackendConnected = isBackendConnected
                )

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .background(ArchonDesignTokens.AppBackground)
                ) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        CenterPaneTopBar(
                            currentDestination = currentDestination,
                            isContextGated = isContextGated,
                            contextSidebarOpen = contextSidebarOpen,
                            rightSidebarOpen = rightSidebarOpen,
                            isBackendConnected = isBackendConnected,
                            autopilotEnabled = autopilotEnabled,
                            onToggleAutopilot = onToggleAutopilot,
                            onToggleLeft = onToggleContextSidebar,
                            onToggleRight = onToggleRightSidebar
                        )

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                        ) {
                            content()
                        }
                    }

                    // Overlay Left Context Sidebar
                    ContextSidebarPane(
                        currentDestination = currentDestination,
                        isOpen = contextSidebarOpen,
                        onClose = { onSetContextSidebarOpen(false) },
                        windowSizeClass = windowSizeClass,
                        modifier = Modifier.align(Alignment.CenterStart)
                    )

                    // Overlay Right Inspector Sidebar
                    RightSidebarPane(
                        isOpen = rightSidebarOpen,
                        onClose = { onSetRightSidebarOpen(false) },
                        windowSizeClass = windowSizeClass,
                        temperature = temperature,
                        onTemperatureChange = onTemperatureChange,
                        contextFiles = contextFiles,
                        activityLogs = activityLogs,
                        tokenUsage = tokenUsage,
                        maxTokens = maxTokens,
                        onAddFile = onAddContextFile,
                        onRemoveFile = onRemoveContextFile,
                        modifier = Modifier.align(Alignment.CenterEnd)
                    )
                }
            }
        }

        else -> {
            // Tier 3: Compact (< 600dp) - Bottom Navigation + Overlay sidebars
            Scaffold(
                bottomBar = {
                    NavigationBar(
                        containerColor = ArchonDesignTokens.AppBackground
                    ) {
                        destinations.take(4).forEach { dest ->
                            val isSelected = currentDestination == dest.key
                            NavigationBarItem(
                                selected = isSelected,
                                onClick = { onNavigate(dest.key) },
                                icon = { Icon(dest.icon, contentDescription = dest.label) },
                                label = { Text(dest.label) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = dest.accentColor,
                                    unselectedIconColor = ArchonDesignTokens.TextSecondary,
                                    selectedTextColor = dest.accentColor,
                                    unselectedTextColor = ArchonDesignTokens.TextSecondary,
                                    indicatorColor = dest.accentColor.copy(alpha = 0.15f)
                                )
                            )
                        }
                        NavigationBarItem(
                            selected = currentDestination == "settings",
                            onClick = { onNavigate("settings") },
                            icon = { Icon(Icons.Outlined.Settings, contentDescription = "Settings") },
                            label = { Text("Settings") },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = ArchonDesignTokens.AccentIndigo,
                                unselectedIconColor = ArchonDesignTokens.TextSecondary,
                                selectedTextColor = ArchonDesignTokens.AccentIndigo,
                                unselectedTextColor = ArchonDesignTokens.TextSecondary,
                                indicatorColor = ArchonDesignTokens.AccentIndigo.copy(alpha = 0.15f)
                            )
                        )
                    }
                }
            ) { padding ->
                Box(
                    modifier = Modifier
                        .padding(padding)
                        .fillMaxSize()
                        .background(ArchonDesignTokens.AppBackground)
                ) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        CenterPaneTopBar(
                            currentDestination = currentDestination,
                            isContextGated = isContextGated,
                            contextSidebarOpen = contextSidebarOpen,
                            rightSidebarOpen = rightSidebarOpen,
                            isBackendConnected = isBackendConnected,
                            autopilotEnabled = autopilotEnabled,
                            onToggleAutopilot = onToggleAutopilot,
                            onToggleLeft = onToggleContextSidebar,
                            onToggleRight = onToggleRightSidebar
                        )

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                        ) {
                            content()
                        }
                    }

                    // Overlay Left Context Sidebar
                    ContextSidebarPane(
                        currentDestination = currentDestination,
                        isOpen = contextSidebarOpen,
                        onClose = { onSetContextSidebarOpen(false) },
                        windowSizeClass = windowSizeClass,
                        modifier = Modifier.align(Alignment.CenterStart)
                    )

                    // Overlay Right Inspector Sidebar
                    RightSidebarPane(
                        isOpen = rightSidebarOpen,
                        onClose = { onSetRightSidebarOpen(false) },
                        windowSizeClass = windowSizeClass,
                        temperature = temperature,
                        onTemperatureChange = onTemperatureChange,
                        contextFiles = contextFiles,
                        activityLogs = activityLogs,
                        tokenUsage = tokenUsage,
                        maxTokens = maxTokens,
                        onAddFile = onAddContextFile,
                        onRemoveFile = onRemoveContextFile,
                        modifier = Modifier.align(Alignment.CenterEnd)
                    )
                }
            }
        }
    }
}

/** Fixed 56dp Width Navigation Rail with Top Logo Mark, 7 Items, Per-mode Accent Pill & Status Dot */
@Composable
private fun NavRail(
    currentDestination: String,
    onNavigate: (String) -> Unit,
    isBackendConnected: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(56.dp)
            .fillMaxHeight()
            .background(ArchonDesignTokens.AppBackground)
            .drawBehind {
                // Right border #27272A (20%)
                drawLine(
                    color = ArchonDesignTokens.BorderCore.copy(alpha = 0.20f),
                    start = androidx.compose.ui.geometry.Offset(size.width, 0f),
                    end = androidx.compose.ui.geometry.Offset(size.width, size.height),
                    strokeWidth = 1.dp.toPx()
                )
            }
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top Logo Mark: Clicking navigates to dashboard (hidden from rail)
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(ArchonDesignTokens.AccentIndigo.copy(alpha = 0.10f))
                .border(
                    width = 1.dp,
                    color = ArchonDesignTokens.AccentIndigo.copy(alpha = 0.30f),
                    shape = RoundedCornerShape(12.dp)
                )
                .clickable { onNavigate("dashboard") },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Outlined.Terminal,
                contentDescription = "Archon Logo — tap for Dashboard",
                tint = ArchonDesignTokens.AccentIndigo,
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Divider (24dp x 1dp)
        Box(
            modifier = Modifier
                .width(24.dp)
                .height(1.dp)
                .background(ArchonDesignTokens.TextPrimary.copy(alpha = 0.05f))
        )

        Spacer(modifier = Modifier.height(12.dp))

        // 7 Navigation Items in exact order
        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.weight(1f)
        ) {
            destinations.forEach { dest ->
                val isSelected = currentDestination == dest.key

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // PC spec: far-left Soft Violet indicator strip for active mode
                    if (isSelected) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .width(2.dp)
                                .height(20.dp)
                                .background(
                                    color = Color(0xFF8B5CF6), // Soft Violet
                                    shape = RoundedCornerShape(10.dp)
                                )
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isSelected) dest.accentColor.copy(alpha = 0.10f)
                                else Color.Transparent
                            )
                            .then(
                                if (isSelected) {
                                    Modifier.border(
                                        width = 1.dp,
                                        color = dest.accentColor.copy(alpha = 0.40f),
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                } else Modifier
                            )
                            .clickable { onNavigate(dest.key) },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = dest.icon,
                            contentDescription = dest.label,
                            tint = if (isSelected) dest.accentColor else ArchonDesignTokens.TextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        // Bottom section: 6dp connection status dot directly above 40dp Settings gear button
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // 6dp connection status dot (#10B981 online, #E11D48 offline)
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(
                        color = if (isBackendConnected) ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.AccentRose,
                        shape = CircleShape
                    )
            )

            // 40dp Settings gear button
            val isSettingsSelected = currentDestination == "settings"
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (isSettingsSelected) ArchonDesignTokens.AccentIndigo.copy(alpha = 0.10f)
                        else Color.Transparent
                    )
                    .then(
                        if (isSettingsSelected) {
                            Modifier.border(
                                width = 1.dp,
                                color = ArchonDesignTokens.AccentIndigo.copy(alpha = 0.40f),
                                shape = RoundedCornerShape(12.dp)
                            )
                        } else Modifier
                    )
                    .clickable { onNavigate("settings") },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.Settings,
                    contentDescription = "Settings",
                    tint = if (isSettingsSelected) ArchonDesignTokens.AccentIndigo else ArchonDesignTokens.TextSecondary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

/** Fixed 36dp Height Center Pane Top Bar — PC spec: System Bar with Autopilot + Telemetry */
@Composable
private fun CenterPaneTopBar(
    currentDestination: String,
    isContextGated: Boolean,
    contextSidebarOpen: Boolean,
    rightSidebarOpen: Boolean,
    isBackendConnected: Boolean,
    autopilotEnabled: Boolean = false,
    onToggleAutopilot: () -> Unit = {},
    onToggleLeft: () -> Unit,
    onToggleRight: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(36.dp)
            .background(ArchonDesignTokens.AppBackground)
            .drawBehind {
                // Bottom border #27272A (60%)
                drawLine(
                    color = ArchonDesignTokens.BorderCore.copy(alpha = 0.60f),
                    start = androidx.compose.ui.geometry.Offset(0f, size.height),
                    end = androidx.compose.ui.geometry.Offset(size.width, size.height),
                    strokeWidth = 1.dp.toPx()
                )
            }
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left section: caret toggle
            if (isContextGated) {
                IconButton(
                    onClick = onToggleLeft,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = if (contextSidebarOpen) Icons.Outlined.ChevronLeft else Icons.Outlined.ChevronRight,
                        contentDescription = "Toggle Left Context Sidebar",
                        tint = if (contextSidebarOpen) ArchonDesignTokens.AccentPrimary else ArchonDesignTokens.TextSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            } else {
                Spacer(modifier = Modifier.size(28.dp))
            }

            // Center: Mode Title + Autopilot Toggle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Status dot
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .background(
                            if (isBackendConnected) ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.AccentRose,
                            CircleShape
                        )
                )
                // Mode title
                Text(
                    text = "ARCHON // ${currentDestination.uppercase()}",
                    color = ArchonDesignTokens.TextPrimary,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 1.5.sp
                )

                Spacer(modifier = Modifier.width(8.dp))

                // Autopilot pill toggle (PC spec: pill-shaped slider labeled "AUTOPILOT")
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            if (autopilotEnabled) ArchonDesignTokens.AccentEmerald.copy(alpha = 0.20f)
                            else ArchonDesignTokens.BorderCore
                        )
                        .border(
                            width = 1.dp,
                            color = if (autopilotEnabled) ArchonDesignTokens.AccentEmerald.copy(alpha = 0.50f)
                            else ArchonDesignTokens.BorderCore.copy(alpha = 0.40f),
                            shape = RoundedCornerShape(10.dp)
                        )
                        .clickable { onToggleAutopilot() }
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "AUTOPILOT",
                        color = if (autopilotEnabled) ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.TextSecondary,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        letterSpacing = 1.sp
                    )
                }
            }

            // Right section: system metrics + caret toggle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // System telemetry (PC spec: monospace metrics)
                Text(
                    text = if (isBackendConnected) "ONLINE" else "STANDALONE",
                    color = if (isBackendConnected) ArchonDesignTokens.AccentEmerald else ArchonDesignTokens.AccentRose,
                    fontSize = 8.sp,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 0.5.sp
                )

                IconButton(
                    onClick = onToggleRight,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = if (rightSidebarOpen) Icons.Outlined.ChevronRight else Icons.Outlined.ChevronLeft,
                        contentDescription = "Toggle Right Inspector Sidebar",
                        tint = if (rightSidebarOpen) ArchonDesignTokens.AccentPrimary else ArchonDesignTokens.TextSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}
