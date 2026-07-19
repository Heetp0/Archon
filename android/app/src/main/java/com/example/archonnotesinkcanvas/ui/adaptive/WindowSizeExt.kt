package com.example.archonnotesinkcanvas.ui.adaptive

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass

/** True on tablets (medium/expanded width). False on phones (compact). */
val WindowSizeClass.isTablet: Boolean
    get() = widthSizeClass != WindowWidthSizeClass.Compact
