package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.archonnotesinkcanvas.data.local.ArchonDatabase
import com.example.archonnotesinkcanvas.ui.adaptive.isTablet

private data class StatItem(val label: String, val value: String)

@Composable
fun DashboardScreen(windowSizeClass: WindowSizeClass) {
    val context = LocalContext.current
    val db = remember { ArchonDatabase.getInstance(context) }

    var total by remember { mutableStateOf(0) }
    var correct by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        total = db.quizAttemptDao().totalCount()
        correct = db.quizAttemptDao().correctCount()
    }

    val accuracy = if (total > 0) "${correct * 100 / total}%" else "0%"
    val stats = listOf(
        StatItem("Questions", "$total"),
        StatItem("Correct", "$correct"),
        StatItem("Accuracy", accuracy)
    )

    if (windowSizeClass.isTablet) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            contentPadding = PaddingValues(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(stats) { stat ->
                StatCard(stat)
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(stats) { stat ->
                StatCard(stat, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun StatCard(stat: StatItem, modifier: Modifier = Modifier) {
    ElevatedCard(
        modifier = modifier.padding(8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stat.value,
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = stat.label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
