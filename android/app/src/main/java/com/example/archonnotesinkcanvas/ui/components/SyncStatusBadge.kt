package com.example.archonnotesinkcanvas.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SyncStatusBadge(
    syncStatus: String,
    ocrPendingCount: Int = 0,
    onResolveClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = when (syncStatus) {
            "synced" -> Color(0xFF0D2818)
            "syncing" -> Color(0xFF2A240E)
            else -> Color(0xFF2D1212)
        },
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = when (syncStatus) {
                "synced" -> Color(0xFF22C55E)
                "syncing" -> Color(0xFFEAB308)
                else -> Color(0xFFDC2626)
            }
        )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            when (syncStatus) {
                "synced" -> {
                    Icon(
                        imageVector = Icons.Outlined.CheckCircle,
                        contentDescription = "Synced",
                        tint = Color(0xFF22C55E),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = if (ocrPendingCount > 0) "$ocrPendingCount OCRing..." else "Synced",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF22C55E)
                    )
                }
                "syncing" -> {
                    CircularProgressIndicator(
                        modifier = Modifier.size(12.dp),
                        color = Color(0xFFEAB308),
                        strokeWidth = 1.5.dp
                    )
                    Text(
                        text = "Syncing...",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFEAB308)
                    )
                }
                else -> {
                    Icon(
                        imageVector = Icons.Outlined.Warning,
                        contentDescription = "Sync Conflict",
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "Sync Conflict",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFEF4444)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Surface(
                        onClick = onResolveClick,
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF3D1A1A)
                    ) {
                        Text(
                            text = "Resolve ->",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFF87171),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}
