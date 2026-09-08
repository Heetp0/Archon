package com.example.archonnotesinkcanvas.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Smartphone
import androidx.compose.material.icons.outlined.StayCurrentLandscape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PageTemplateDialog(
    onDismiss: () -> Unit,
    onCreatePage: (orientation: String, template: String, color: String) -> Unit
) {
    var selectedOrientation by remember { mutableStateOf("portrait") }
    var selectedTemplate by remember { mutableStateOf("blank") }
    var selectedColor by remember { mutableStateOf("#FFFFFF") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF141414),
        titleContentColor = Color.White,
        textContentColor = Color.White,
        title = {
            Text("Create New Notebook Page", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // 1. Orientation Selector
                Column {
                    Text("Page Orientation", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            modifier = Modifier.heightIn(min = 48.dp),
                            selected = selectedOrientation == "portrait",
                            onClick = { selectedOrientation = "portrait" },
                            label = { Text("Portrait") },
                            leadingIcon = { Icon(Icons.Outlined.Smartphone, contentDescription = null, modifier = Modifier.size(16.dp)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFF22C55E),
                                selectedLabelColor = Color.Black,
                                selectedLeadingIconColor = Color.Black
                            )
                        )
                        FilterChip(
                            modifier = Modifier.heightIn(min = 48.dp),
                            selected = selectedOrientation == "landscape",
                            onClick = { selectedOrientation = "landscape" },
                            label = { Text("Landscape") },
                            leadingIcon = { Icon(Icons.Outlined.StayCurrentLandscape, contentDescription = null, modifier = Modifier.size(16.dp)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFF22C55E),
                                selectedLabelColor = Color.Black,
                                selectedLeadingIconColor = Color.Black
                            )
                        )
                    }
                }

                // 2. Template Selector
                Column {
                    Text("Page Template Layout", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
                    Spacer(modifier = Modifier.height(6.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            "blank" to "Blank Page",
                            "dot" to "Dot Grid",
                            "ruled" to "Ruled Lines",
                            "grid" to "Graph / Quad Grid",
                            "isometric" to "Isometric Grid (3D)",
                            "staff" to "Music Staff Paper",
                            "cornell" to "Cornell Notes"
                        ).forEach { (key, label) ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(min = 48.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { selectedTemplate = key },
                                color = if (selectedTemplate == key) Color(0xFF22C55E).copy(alpha = 0.15f) else Color(0xFF1E1E1E),
                                border = androidx.compose.foundation.BorderStroke(
                                    width = if (selectedTemplate == key) 2.dp else 1.dp,
                                    color = if (selectedTemplate == key) Color(0xFF22C55E) else Color(0xFF2E2E2E)
                                )
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Outlined.Description, contentDescription = null, tint = if (selectedTemplate == key) Color(0xFF22C55E) else Color.Gray, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(label, fontSize = 13.sp, color = Color.White, fontWeight = if (selectedTemplate == key) FontWeight.Bold else FontWeight.Normal)
                                }
                            }
                        }
                    }
                }

                // 3. Page Color Palette Selector
                Column {
                    Text("Page Background Color", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        listOf("#0A0A0A", "#121824", "#1A1614", "#FFFFFF").forEach { hex ->
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(
                                        Color(android.graphics.Color.parseColor(hex)),
                                        CircleShape
                                    )
                                    .border(
                                        width = if (selectedColor == hex) 3.dp else 1.dp,
                                        color = if (selectedColor == hex) Color(0xFF22C55E) else Color.Gray,
                                        shape = CircleShape
                                    )
                                    .clickable { selectedColor = hex }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreatePage(selectedOrientation, selectedTemplate, selectedColor) },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                modifier = Modifier.heightIn(min = 48.dp)
            ) {
                Text("Create Page", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                modifier = Modifier.heightIn(min = 48.dp)
            ) {
                Text("Cancel", color = Color.Gray)
            }
        }
    )
}
