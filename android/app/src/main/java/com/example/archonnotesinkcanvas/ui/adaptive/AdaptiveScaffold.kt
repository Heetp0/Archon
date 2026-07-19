package com.example.archonnotesinkcanvas.ui.adaptive

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*

@Composable
fun AdaptiveScaffold(
    windowSizeClass: WindowSizeClass,
    currentDestination: String,
    onNavigate: (String) -> Unit,
    content: @Composable () -> Unit
) {
    if (windowSizeClass.isTablet) {
        TabletLayout(
            currentDestination = currentDestination,
            onNavigate = onNavigate,
            content = content
        )
    } else {
        PhoneLayout(
            currentDestination = currentDestination,
            onNavigate = onNavigate,
            content = content
        )
    }
}

@Composable
private fun TabletLayout(
    currentDestination: String,
    onNavigate: (String) -> Unit,
    content: @Composable () -> Unit
) {
    Row(
        Modifier.fillMaxSize()
    ) {
        NavigationRail {
            val destinations = listOf("chat", "notebooks", "tutor", "dashboard", "settings")
            val icons = listOf(Icons.Outlined.Chat, Icons.Outlined.MenuBook, Icons.Outlined.School, Icons.Outlined.Dashboard, Icons.Outlined.Settings)

            destinations.forEachIndexed { index, destination ->
                NavigationRailItem(
                    icon = {
                        Icon(icons[index], contentDescription = destination)
                    },
                    label = { Text(destination) },
                    selected = currentDestination == destination,
                    onClick = { onNavigate(destination) }
                )
            }
        }

        Box(modifier = Modifier.weight(1f)) {
            content()
        }
    }
}

@Composable
private fun PhoneLayout(
    currentDestination: String,
    onNavigate: (String) -> Unit,
    content: @Composable () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Box(modifier = Modifier.weight(1f)) {
            content()
        }

        NavigationBar {
            val destinations = listOf("chat", "notebooks", "tutor", "dashboard", "settings")
            val icons = listOf(Icons.Outlined.Chat, Icons.Outlined.MenuBook, Icons.Outlined.School, Icons.Outlined.Dashboard, Icons.Outlined.Settings)

            destinations.forEachIndexed { index, destination ->
                NavigationBarItem(
                    icon = {
                        Icon(icons[index], contentDescription = destination)
                    },
                    label = { Text(destination) },
                    selected = currentDestination == destination,
                    onClick = { onNavigate(destination) }
                )
            }
        }
    }
}
