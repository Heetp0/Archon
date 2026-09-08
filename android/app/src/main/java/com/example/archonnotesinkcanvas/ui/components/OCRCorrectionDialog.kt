package com.example.archonnotesinkcanvas.ui.components

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val SurfaceCard = Color(0xFF141414)
private val TextPrimary = Color(0xFFFFFFFF)
private val TextSecondary = Color(0xFF8A8A8A)
private val AccentGreen = Color(0xFF22C55E)
private val AccentRed = Color(0xFFEF4444)
private val BorderColor = Color(0xFF262626)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OCRCorrectionDialog(
    originalText: String,
    confidence: Float,
    strokeImageBase64: String? = null,
    onSaveCorrection: (correctedText: String, userConfidence: String, handwritingType: String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var correctedText by remember { mutableStateOf(originalText) }
    var userConfidence by remember { mutableStateOf("certain") }
    var handwritingType by remember { mutableStateOf("print") }

    val decodedBitmap = remember(strokeImageBase64) {
        if (!strokeImageBase64.isNull_or_empty_custom()) {
            try {
                val bytes = Base64.decode(strokeImageBase64, Base64.DEFAULT)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            } catch (e: Exception) {
                null
            }
        } else null
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = modifier,
        containerColor = SurfaceCard,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Edit,
                    contentDescription = "Edit OCR",
                    tint = AccentGreen,
                    modifier = Modifier.size(22.dp)
                )
                Text(
                    text = "Refine Handwriting Recognition",
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Original OCR Recognition Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFF1E1E1E),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "OCR Recognized:",
                            fontSize = 11.sp,
                            color = TextSecondary,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "\"$originalText\"",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = if (confidence > 0.85f) AccentGreen.copy(alpha = 0.15f) else AccentRed.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = "${(confidence * 100).toInt()}% conf",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (confidence > 0.85f) AccentGreen else AccentRed,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }
                }

                // Stroke Preview if available
                decodedBitmap?.let { bmp ->
                    Image(
                        bitmap = bmp.asImageBitmap(),
                        contentDescription = "Handwritten stroke preview",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(80.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color.Black),
                        contentScale = ContentScale.Fit
                    )
                }

                // Editable Corrected Text Field
                OutlinedTextField(
                    value = correctedText,
                    onValueChange = { correctedText = it },
                    label = { Text("Corrected Text", color = TextSecondary) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentGreen,
                        unfocusedBorderColor = BorderColor,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    )
                )

                // Handwriting Style Chips
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Handwriting Style:", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("print" to "Print", "cursive" to "Cursive", "mixed" to "Mixed").forEach { (type, label) ->
                            FilterChip(
                                selected = handwritingType == type,
                                onClick = { handwritingType = type },
                                label = { Text(label, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AccentGreen.copy(alpha = 0.2f),
                                    selectedLabelColor = AccentGreen,
                                    labelColor = TextSecondary
                                )
                            )
                        }
                    }
                }

                // User Confidence Chips
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Correction Confidence:", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = userConfidence == "certain",
                            onClick = { userConfidence = "certain" },
                            label = { Text("Certain (Use in AI Training)", fontSize = 12.sp) },
                            leadingIcon = { Icon(Icons.Outlined.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AccentGreen.copy(alpha = 0.2f),
                                selectedLabelColor = AccentGreen,
                                labelColor = TextSecondary
                            )
                        )
                        FilterChip(
                            selected = userConfidence == "guess",
                            onClick = { userConfidence = "guess" },
                            label = { Text("Guess", fontSize = 12.sp) },
                            leadingIcon = { Icon(Icons.Outlined.HelpOutline, contentDescription = null, modifier = Modifier.size(16.dp)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFF333333),
                                selectedLabelColor = TextPrimary,
                                labelColor = TextSecondary
                            )
                        )
                    }
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (correctedText.isNotBlank()) {
                        onSaveCorrection(correctedText, userConfidence, handwritingType)
                        onDismiss()
                    }
                },
                enabled = correctedText.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = AccentGreen)
            ) {
                Icon(Icons.Outlined.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(4.dp))
                Text("Save Correction", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        }
    )
}

private fun String?.isNull_or_empty_custom(): Boolean = this == null || this.trim().isEmpty()
