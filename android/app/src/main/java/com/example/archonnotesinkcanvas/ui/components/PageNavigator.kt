package com.example.archonnotesinkcanvas.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.automirrored.outlined.ViewList
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import com.archon.notes.canvas.StrokeSerialization
import com.example.archonnotesinkcanvas.data.local.entities.NotebookPageEntity
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PageNavigator(
    pages: List<NotebookPageEntity>,
    currentPageId: String?,
    isExpanded: Boolean,
    onToggleExpand: () -> Unit,
    onPageSelected: (pageId: String) -> Unit,
    onPageDeleted: (pageId: String) -> Unit,
    onShowTemplateDialog: () -> Unit,
    onReorderPages: (fromIndex: Int, toIndex: Int) -> Unit = { _, _ -> },
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    val animatedWidth by animateDpAsState(
        targetValue = if (isExpanded) 230.dp else 68.dp,
        animationSpec = spring(stiffness = Spring.StiffnessLow),
        label = "sidebarWidth"
    )

    Surface(
        modifier = modifier
            .fillMaxHeight()
            .width(animatedWidth)
            .animateContentSize(animationSpec = spring()),
        color = Color(0xFF111111)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp)
        ) {
            // Top Bar: Title & Toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (isExpanded) {
                    Text(
                        text = "Pages (${pages.size})",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }

                IconButton(onClick = onToggleExpand) {
                    Icon(
                        imageVector = if (isExpanded) Icons.Outlined.ChevronLeft else Icons.Outlined.ChevronRight,
                        contentDescription = "Toggle Sidebar",
                        tint = Color(0xFF22C55E)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // FAB: "+ New Page"
            Button(
                onClick = onShowTemplateDialog,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(42.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 8.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Add,
                    contentDescription = "New Page",
                    tint = Color.Black
                )
                if (isExpanded) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "New Page",
                        color = Color.Black,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Search input when expanded
            if (isExpanded) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Filter pages...", fontSize = 12.sp, color = Color.Gray) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF22C55E),
                        unfocusedBorderColor = Color(0xFF222222),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp),
                    shape = RoundedCornerShape(8.dp)
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            // Pages List with Swipe-to-delete and Reorder
            val filteredPages = remember(pages, searchQuery) {
                if (searchQuery.isBlank()) pages
                else pages.filter {
                    it.subject.contains(searchQuery, ignoreCase = true) ||
                    it.topic.contains(searchQuery, ignoreCase = true) ||
                    "Page ${it.pageNumber}".contains(searchQuery, ignoreCase = true)
                }
            }

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                itemsIndexed(filteredPages, key = { _, page -> page.pageId }) { index, page ->
                    val dismissState = rememberSwipeToDismissBoxState(
                        confirmValueChange = { dismissValue ->
                            if (dismissValue == SwipeToDismissBoxValue.EndToStart || dismissValue == SwipeToDismissBoxValue.StartToEnd) {
                                onPageDeleted(page.pageId)
                                true
                            } else false
                        }
                    )

                    SwipeToDismissBox(
                        state = dismissState,
                        backgroundContent = {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color(0xFF7F1D1D), RoundedCornerShape(8.dp))
                                    .padding(horizontal = 12.dp),
                                contentAlignment = Alignment.CenterEnd
                            ) {
                                Icon(Icons.Outlined.Delete, contentDescription = "Delete Page", tint = Color.White)
                            }
                        }
                    ) {
                        PageThumbnailItem(
                            page = page,
                            index = index,
                            totalPages = filteredPages.size,
                            isSelected = page.pageId == currentPageId,
                            isExpanded = isExpanded,
                            onSelect = { onPageSelected(page.pageId) },
                            onDelete = { onPageDeleted(page.pageId) },
                            onMoveUp = { if (index > 0) onReorderPages(index, index - 1) },
                            onMoveDown = { if (index < filteredPages.size - 1) onReorderPages(index, index + 1) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PageThumbnailItem(
    page: NotebookPageEntity,
    index: Int,
    totalPages: Int,
    isSelected: Boolean,
    isExpanded: Boolean,
    onSelect: () -> Unit,
    onDelete: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onSelect),
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) Color(0xFF22C55E).copy(alpha = 0.15f) else Color(0xFF181818),
        border = androidx.compose.foundation.BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (isSelected) Color(0xFF22C55E) else Color(0xFF262626)
        )
    ) {
        if (isExpanded) {
            Column(modifier = Modifier.padding(8.dp)) {
                // Header: Page number, Sync dot, Reorder arrows & Menu
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "Page ${page.pageNumber}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    when (page.syncStatus) {
                                        "synced" -> Color(0xFF22C55E)
                                        "syncing" -> Color(0xFFEAB308)
                                        else -> Color(0xFFEF4444)
                                    },
                                    CircleShape
                                )
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Drag / Reorder affordance controls
                        if (index > 0) {
                            IconButton(onClick = onMoveUp, modifier = Modifier.size(20.dp)) {
                                Icon(Icons.Outlined.ArrowUpward, contentDescription = "Move Up", tint = Color.Gray, modifier = Modifier.size(13.dp))
                            }
                        }
                        if (index < totalPages - 1) {
                            IconButton(onClick = onMoveDown, modifier = Modifier.size(20.dp)) {
                                Icon(Icons.Outlined.ArrowDownward, contentDescription = "Move Down", tint = Color.Gray, modifier = Modifier.size(13.dp))
                            }
                        }
                        Box {
                            IconButton(onClick = { showMenu = true }, modifier = Modifier.size(20.dp)) {
                                Icon(Icons.Outlined.MoreVert, contentDescription = "Page Options", tint = Color.Gray, modifier = Modifier.size(14.dp))
                            }
                            DropdownMenu(
                                expanded = showMenu,
                                onDismissRequest = { showMenu = false },
                                modifier = Modifier.background(Color(0xFF1F1F1F))
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Delete Page", color = Color(0xFFEF4444), fontSize = 12.sp) },
                                    onClick = {
                                        showMenu = false
                                        onDelete()
                                    },
                                    leadingIcon = { Icon(Icons.Outlined.Delete, contentDescription = null, tint = Color(0xFFEF4444)) }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Miniature Real Page Thumbnail Box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(70.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .border(1.dp, Color(0xFF333333), RoundedCornerShape(4.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    PageThumbnailCanvas(
                        notebookId = page.notebookId,
                        pageId = page.pageId,
                        templateType = page.templateType,
                        pageColor = page.pageColor,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Orientation & Template Indicators
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(
                            imageVector = if (page.orientation == "portrait") Icons.Outlined.Smartphone else Icons.Outlined.StayCurrentLandscape,
                            contentDescription = page.orientation,
                            tint = Color.LightGray,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = page.orientation.replaceFirstChar { it.uppercase() },
                            fontSize = 10.sp,
                            color = Color.Gray
                        )
                    }

                    Text(
                        text = page.templateType.replaceFirstChar { it.uppercase() },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF22C55E)
                    )
                }
            }
        } else {
            // Collapsed View with Thumbnail & Page Number
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp, 48.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .border(1.dp, if (isSelected) Color(0xFF22C55E) else Color(0xFF333333), RoundedCornerShape(4.dp))
                ) {
                    PageThumbnailCanvas(
                        notebookId = page.notebookId,
                        pageId = page.pageId,
                        templateType = page.templateType,
                        pageColor = page.pageColor,
                        modifier = Modifier.fillMaxSize()
                    )
                }
                Text(
                    text = "P${page.pageNumber}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) Color(0xFF22C55E) else Color.White
                )
            }
        }
    }
}

@Composable
private fun PageThumbnailCanvas(
    notebookId: String,
    pageId: String,
    templateType: String,
    pageColor: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val strokeRenderer = remember { CanvasStrokeRenderer.create() }

    val strokes = remember(notebookId, pageId) {
        try {
            val file = File(context.filesDir, "strokes/$notebookId/$pageId.bin")
            if (file.exists()) {
                StrokeSerialization.deserialize(file.readBytes())
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    val parsedBgColor = remember(pageColor) {
        try {
            Color(android.graphics.Color.parseColor(pageColor))
        } catch (e: Exception) {
            Color.White
        }
    }

    val patternColor = remember(parsedBgColor) {
        val luminance = (0.299f * parsedBgColor.red + 0.587f * parsedBgColor.green + 0.114f * parsedBgColor.blue)
        if (luminance < 0.5f) Color(0x44FFFFFF) else Color(0x33000000)
    }

    Canvas(modifier = modifier) {
        // 1. Draw page background
        drawRect(color = parsedBgColor)

        // 2. Draw template pattern
        when (templateType.lowercase()) {
            "dot" -> {
                val step = 10.dp.toPx()
                var x = step
                while (x < size.width) {
                    var y = step
                    while (y < size.height) {
                        drawCircle(color = patternColor, radius = 0.8.dp.toPx(), center = Offset(x, y))
                        y += step
                    }
                    x += step
                }
            }
            "ruled" -> {
                val step = 12.dp.toPx()
                var y = step
                while (y < size.height) {
                    drawLine(color = patternColor, start = Offset(0f, y), end = Offset(size.width, y), strokeWidth = 0.6.dp.toPx())
                    y += step
                }
            }
            "cornell" -> {
                val cueX = size.width * 0.3f
                val summaryY = size.height * 0.75f
                drawLine(color = patternColor, start = Offset(cueX, 0f), end = Offset(cueX, summaryY), strokeWidth = 0.8.dp.toPx())
                drawLine(color = patternColor, start = Offset(0f, summaryY), end = Offset(size.width, summaryY), strokeWidth = 0.8.dp.toPx())
            }
        }

        // 3. Draw real strokes onto thumbnail canvas
        if (strokes.isNotEmpty()) {
            drawIntoCanvas { canvas ->
                val nativeCanvas = canvas.nativeCanvas
                val matrix = android.graphics.Matrix()
                val scaleX = if (size.width > 0) size.width / 1000f else 0.1f
                val scaleY = if (size.height > 0) size.height / 1400f else 0.1f
                matrix.setScale(scaleX, scaleY)
                strokes.forEach { stroke ->
                    strokeRenderer.draw(nativeCanvas, stroke, matrix)
                }
            }
        }
    }
}
