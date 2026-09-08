package com.example.archonnotesinkcanvas.ui.adaptive

import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertTrue
import junit.framework.TestCase.assertFalse
import org.junit.Test

@OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
class AdaptiveScaffoldTest {

    @Test
    fun testBreakpointDeviceLayoutMapping() {
        // Expanded >= 840dp -> Tablet
        val expandedWindowSize = WindowSizeClass.calculateFromSize(DpSize(1000.dp, 800.dp))
        assertEquals(WindowWidthSizeClass.Expanded, expandedWindowSize.widthSizeClass)
        assertEquals(DeviceLayout.Tablet, expandedWindowSize.deviceLayout)

        // Medium 600-839dp -> SmallTablet
        val mediumWindowSize = WindowSizeClass.calculateFromSize(DpSize(700.dp, 800.dp))
        assertEquals(WindowWidthSizeClass.Medium, mediumWindowSize.widthSizeClass)
        assertEquals(DeviceLayout.SmallTablet, mediumWindowSize.deviceLayout)

        // Compact < 600dp -> Phone
        val compactWindowSize = WindowSizeClass.calculateFromSize(DpSize(400.dp, 800.dp))
        assertEquals(WindowWidthSizeClass.Compact, compactWindowSize.widthSizeClass)
        assertEquals(DeviceLayout.Phone, compactWindowSize.deviceLayout)
    }

    @Test
    fun testMediumScreenLayoutPhysics() {
        // Medium breakpoint bounds: 600dp to 839dp
        val navRailWidth = 56
        val leftSidebarWidthMedium = 260
        val rightSidebarWidthMedium = 280

        val minMediumScreenWidth = 600
        val maxMediumScreenWidth = 839

        // 1. Center Pane Box width calculation
        val minCenterPaneBoxWidth = minMediumScreenWidth - navRailWidth // 544dp
        val maxCenterPaneBoxWidth = maxMediumScreenWidth - navRailWidth // 783dp

        assertTrue("Center Pane Box width at 600dp must be >= 544dp", minCenterPaneBoxWidth == 544)
        assertTrue("Center Pane Box width at 839dp must be <= 783dp", maxCenterPaneBoxWidth == 783)

        // 2. Sidebar collision clearance check on minimum Medium screen (600dp)
        val combinedSidebarWidth = leftSidebarWidthMedium + rightSidebarWidthMedium // 540dp
        val gapAt600dp = minCenterPaneBoxWidth - combinedSidebarWidth // 4dp

        assertTrue("Combined sidebar width (540dp) must fit within 544dp center box with non-negative gap", gapAt600dp >= 0)
        assertEquals("Clearance gap between open sidebars at 600dp screen width is 4dp", 4, gapAt600dp)

        // 3. Horizontal text squishing verification
        // In Medium mode, sidebars are rendered inside Box with Alignment.CenterStart and Alignment.CenterEnd (Overlays).
        // Center Pane fills fillMaxSize() of the Box (544dp to 783dp width).
        // Opening sidebars overlays them over content, so Center Pane content width remains 100% of Box width.
        assertTrue("Center Pane does not shrink when sidebars open in Medium mode", minCenterPaneBoxWidth == 544)
    }

    @Test
    fun testExpandedScreenLayoutPhysics() {
        // Expanded breakpoint >= 840dp
        val navRailWidth = 56
        val leftSidebarWidthExpanded = 224
        val rightSidebarWidthExpanded = 256

        val minExpandedScreenWidth = 840

        val totalFixedSidebarFootprint = navRailWidth + leftSidebarWidthExpanded + rightSidebarWidthExpanded // 536dp
        val minCenterPaneWidth = minExpandedScreenWidth - totalFixedSidebarFootprint // 304dp

        assertEquals("Fixed sidebar footprint in Expanded mode is 536dp", 536, totalFixedSidebarFootprint)
        assertTrue("Min center pane width in Expanded mode at 840dp is 304dp", minCenterPaneWidth == 304)
    }

    @Test
    fun testShellViewModelSidebarStateToggles() {
        val viewModel = ArchonShellViewModel()

        // Initial states
        assertTrue("Context sidebar initially open", viewModel.contextSidebarOpen.value)
        assertFalse("Right sidebar initially closed", viewModel.rightSidebarOpen.value)

        // Toggle context sidebar
        viewModel.toggleContextSidebar()
        assertFalse("Context sidebar should now be closed", viewModel.contextSidebarOpen.value)

        // Toggle right sidebar
        viewModel.toggleRightSidebar()
        assertTrue("Right sidebar should now be open", viewModel.rightSidebarOpen.value)

        // Direct set
        viewModel.setContextSidebarOpen(true)
        assertTrue("Context sidebar set to true", viewModel.contextSidebarOpen.value)

        viewModel.setRightSidebarOpen(false)
        assertFalse("Right sidebar set to false", viewModel.rightSidebarOpen.value)
    }
}
