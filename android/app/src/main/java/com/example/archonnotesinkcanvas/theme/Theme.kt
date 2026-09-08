package com.example.archonnotesinkcanvas.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = ArchonDesignTokens.AccentPrimary,
    onPrimary = Color.White,
    background = Color(0xFF000000),
    onBackground = Color.White,
    surface = Color(0xFF0A0A0A),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF111111),
    onSurfaceVariant = Color(0xFFAAAAAA),
    outline = Color(0xFF222222),
    error = Color.Black,
    secondary = Color(0xFF111111),
    onSecondary = Color.White,
    tertiary = Color(0xFF333333),
    onTertiary = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = ArchonDesignTokens.AccentPrimary,
    onPrimary = Color.White,
    background = ArchonDesignTokens.AppBackground,
    onBackground = ArchonDesignTokens.TextPrimary,
    surface = ArchonDesignTokens.PanelBackground,
    onSurface = ArchonDesignTokens.TextPrimary,
    surfaceVariant = ArchonDesignTokens.CardBackground,
    onSurfaceVariant = ArchonDesignTokens.TextSecondary,
    outline = ArchonDesignTokens.BorderCore,
    error = ArchonDesignTokens.AccentPrimary,
    secondary = ArchonDesignTokens.PanelBackground,
    onSecondary = ArchonDesignTokens.TextPrimary,
    tertiary = ArchonDesignTokens.AccentSecondary,
    onTertiary = Color.White
)

@Composable
fun ArchonNotesInkCanvasTheme(
    darkTheme: Boolean = true,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = DarkColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
