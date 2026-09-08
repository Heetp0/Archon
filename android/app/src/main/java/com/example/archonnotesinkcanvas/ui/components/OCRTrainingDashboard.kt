package com.example.archonnotesinkcanvas.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingCheckpointEntity
import com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingSampleEntity

private val SurfaceCard = Color(0xFF111111)
private val SurfaceCardBorder = Color(0xFF1E1E1E)
private val TextPrimary = Color(0xFFFFFFFF)
private val TextSecondary = Color(0xFF8A8A8A)
private val AccentGreen = Color(0xFF22C55E)
private val AccentAmber = Color(0xFFF59E0B)

@Composable
fun OCRTrainingDashboard(
    totalSamples: Int,
    certainUnusedSamples: Int,
    activeCheckpoint: OCRTrainingCheckpointEntity?,
    recentSamples: List<OCRTrainingSampleEntity>,
    onTriggerTraining: () -> Unit,
    onBackClick: () -> Unit,
    windowSizeClass: WindowSizeClass? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A0A))
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            IconButton(onClick = onBackClick) {
                Icon(Icons.Outlined.ArrowBack, contentDescription = "Back", tint = TextPrimary)
            }
            Column {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Outlined.Psychology, contentDescription = null, tint = AccentGreen, modifier = Modifier.size(24.dp))
                    Text("Personalized OCR AI Model Training", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
                Text("Fine-tune handwriting recognition to your personal handwriting style", fontSize = 12.sp, color = TextSecondary)
            }
        }

        // Progress Card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = SurfaceCard,
            border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Training Samples Threshold", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Collected Certain Samples", fontSize = 13.sp, color = TextSecondary)
                    Text("$certainUnusedSamples / 30 threshold", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = AccentGreen)
                }

                val progressRatio = (certainUnusedSamples.toFloat() / 30f).coerceAtMost(1f)
                LinearProgressIndicator(
                    progress = { progressRatio },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .clip(RoundedCornerShape(5.dp)),
                    color = AccentGreen,
                    trackColor = Color(0xFF222222)
                )

                // Stats summary row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatBox(
                        label = "Total Corrections",
                        value = "$totalSamples",
                        icon = Icons.Outlined.Create,
                        modifier = Modifier.weight(1f)
                    )
                    StatBox(
                        label = "Active Accuracy",
                        value = if (activeCheckpoint != null) "${(activeCheckpoint.validationAccuracy * 100).toInt()}%" else "Base (90%)",
                        icon = Icons.Outlined.TrendingUp,
                        modifier = Modifier.weight(1f)
                    )
                }

                if (certainUnusedSamples >= 30) {
                    Button(
                        onClick = onTriggerTraining,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentGreen),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = Color.Black)
                        Spacer(Modifier.width(8.dp))
                        Text("Train Model Now (LoRA Fine-Tune)", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                } else {
                    val remaining = 30 - certainUnusedSamples
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFF1A1A1A),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(Icons.Outlined.Lock, contentDescription = "Locked", tint = TextSecondary, modifier = Modifier.size(20.dp))
                            Text(
                                text = "Collect $remaining more corrections to unlock training",
                                fontSize = 13.sp,
                                color = TextSecondary,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        // Active Model Card
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = SurfaceCard,
            border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Active Inference Model", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                if (activeCheckpoint != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(activeCheckpoint.modelName, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = AccentGreen)
                            Text("Validation Accuracy: ${(activeCheckpoint.validationAccuracy * 100).toInt()}%", fontSize = 12.sp, color = TextSecondary)
                            Text("Trained on ${activeCheckpoint.samplesUsed} user samples", fontSize = 12.sp, color = TextSecondary)
                        }
                        Icon(Icons.Outlined.CheckCircle, contentDescription = "Active", tint = AccentGreen, modifier = Modifier.size(32.dp))
                    }
                } else {
                    Text("Currently using base MyScript / Tesseract engine. Collect 30+ corrections to trigger your first LoRA fine-tuning run.", fontSize = 13.sp, color = TextSecondary)
                }
            }
        }

        // Recent Samples Section
        if (recentSamples.isNotEmpty()) {
            Text("Recent Corrections", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                recentSamples.take(10).forEach { sample ->
                    OCRSampleRow(sample)
                }
            }
        }
    }
}

@Composable
private fun StatBox(
    label: String,
    value: String,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        color = Color(0xFF1A1A1A),
        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = label, tint = AccentGreen, modifier = Modifier.size(20.dp))
            Spacer(Modifier.height(4.dp))
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(label, fontSize = 11.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun OCRSampleRow(sample: OCRTrainingSampleEntity) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = SurfaceCard,
        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceCardBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "\"${sample.originalOCRText}\" → \"${sample.correctedText}\"",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(sample.handwritingType.uppercase(), fontSize = 10.sp, color = AccentAmber, fontWeight = FontWeight.Bold)
                    if (sample.userConfidence == "certain") {
                        Icon(Icons.Outlined.CheckCircle, contentDescription = "Certain", tint = AccentGreen, modifier = Modifier.size(12.dp))
                    }
                }
            }
            if (sample.usedInTraining) {
                Surface(shape = RoundedCornerShape(4.dp), color = AccentGreen.copy(alpha = 0.15f)) {
                    Text("Trained", fontSize = 10.sp, color = AccentGreen, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
            }
        }
    }
}
