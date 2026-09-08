package com.example.archonnotesinkcanvas.ui.adaptive

import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable

enum class DeviceLayout {
    Phone, SmallTablet, Tablet
}

val WindowSizeClass.deviceLayout: DeviceLayout
    get() = when (widthSizeClass) {
        WindowWidthSizeClass.Compact -> DeviceLayout.Phone
        WindowWidthSizeClass.Medium -> DeviceLayout.SmallTablet
        else -> DeviceLayout.Tablet
    }

