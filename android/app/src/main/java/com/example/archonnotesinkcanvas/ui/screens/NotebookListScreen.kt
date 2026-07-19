package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.foundation.clickable
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
import com.example.archonnotesinkcanvas.data.local.entities.NotebookEntity
import com.example.archonnotesinkcanvas.ui.adaptive.isTablet
import kotlinx.coroutines.launch

@Composable
fun NotebookListScreen(
    windowSizeClass: WindowSizeClass,
    onNotebookOpen: (String) -> Unit
) {
    val context = LocalContext.current
    val db = remember { ArchonDatabase.getInstance(context) }
    val notebooks by db.notebookDao().getAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    // Seed sample data on first launch
    LaunchedEffect(notebooks) {
        if (notebooks.isEmpty()) {
            scope.launch {
                listOf("Thermodynamics", "Orbital Mechanics", "Control Systems").forEachIndexed { i, title ->
                    db.notebookDao().upsert(NotebookEntity(notebookId = "demo-$i", title = title))
                }
            }
        }
    }

    if (windowSizeClass.isTablet) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            contentPadding = PaddingValues(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(notebooks) { nb ->
                NotebookCard(nb, onNotebookOpen)
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(notebooks) { nb ->
                NotebookCard(nb, onNotebookOpen)
            }
        }
    }
}

@Composable
private fun NotebookCard(
    notebook: NotebookEntity,
    onNotebookOpen: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .padding(8.dp)
            .fillMaxWidth()
            .clickable { onNotebookOpen(notebook.notebookId) }
    ) {
        Text(
            text = notebook.title,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(16.dp)
        )
    }
}
