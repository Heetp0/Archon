package com.example.archonnotesinkcanvas.ui.canvas

import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.archon.notes.canvas.InkCanvas
import com.archon.notes.canvas.InkStrokeState

@Composable
fun CanvasHost(
    notebookId: String,
    modifier: Modifier = Modifier
) {
    var currentPage by remember { mutableStateOf(1) }
    var pages by remember { mutableStateOf(listOf(1)) }
    var showThumbnails by remember { mutableStateOf(false) }
    
    // We assume isDrawing gets updated somehow by InkCanvas or remains false if not hooked up yet
    var isDrawing by remember { mutableStateOf(false) }
    
    var selectedTool by remember { mutableStateOf("pen") }
    var selectedColor by remember { mutableStateOf(Color.Black) }
    var strokeWidth by remember { mutableStateOf(5f) }
    
    val inkStrokeState = remember { InkStrokeState() }

    Box(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectVerticalDragGestures { _, dragAmount ->
                    if (dragAmount < -10) {
                        showThumbnails = true
                    } else if (dragAmount > 10) {
                        showThumbnails = false
                    }
                }
            }
    ) {
        // The ink canvas fills the whole Box
        InkCanvas(
            state = inkStrokeState,
            modifier = Modifier.fillMaxSize(),
            onStrokeAdded = { 
                isDrawing = false 
            },
            currentTool = selectedTool,
            currentColor = selectedColor,
            currentStrokeWidth = strokeWidth
        )
        
        // Floating toolbar overlaid
        FloatingToolbar(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + (if (showThumbnails) 90.dp else 16.dp)),
            autoHideSignal = isDrawing,
            onToolSelected = { selectedTool = it },
            onColorSelected = { selectedColor = it },
            onStrokeWidthSelected = { strokeWidth = it },
            onUndo = { inkStrokeState.undo() },
            onRedo = { inkStrokeState.redo() }
        )
        
        // Thumbnail strip at bottom
        PageThumbnailStrip(
            visible = showThumbnails,
            pages = pages,
            currentPage = currentPage,
            onPageSelected = { currentPage = it },
            onAddPage = { 
                val newPages = pages + (pages.size + 1)
                pages = newPages
                currentPage = newPages.last()
            },
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
