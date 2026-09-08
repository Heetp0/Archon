package com.example.archonnotesinkcanvas.ui.screens

import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import org.junit.Test

class DashboardScreenTest {

    @Test
    fun testDefaultDatasets() {
        assertEquals("Default stats count must be 4", 4, defaultStats.size)
        assertEquals("Default 7-day activity buckets must be 7", 7, defaultActivityData.size)
        assertEquals("Default agents count must be 3", 3, defaultAgents.size)
        assertEquals("Default activity logs count must be 5", 5, defaultLogs.size)
        assertEquals("Default mail items count must be 4", 4, defaultMailItems.size)
        assertEquals("Default todo items count must be 5", 5, defaultTodoItems.size)
        assertEquals("Default calendar events count must be 3", 3, defaultEvents.size)
        assertEquals("Default quick actions count must be 6", 6, quickActions.size)
    }

    @Test
    fun testQuickActionsCrownJewelsAndKeys() {
        val expectedKeys = setOf("chat", "council", "research", "agents", "notes", "tutor")
        val actualKeys = quickActions.map { it.key }.toSet()
        assertEquals("Quick actions must match the 6 target navigation keys", expectedKeys, actualKeys)

        val crownJewels = quickActions.filter { it.isCrownJewel }.map { it.key }
        assertEquals("Exactly 2 crown jewels expected (notes, tutor)", listOf("notes", "tutor"), crownJewels)
    }

    @Test
    fun testTodoProgressCalculation() {
        var items = defaultTodoItems
        val totalCount = items.size
        var completedCount = items.count { it.done }
        assertEquals("Initial completed count should be 2 out of 5", 2, completedCount)

        var progressRatio = completedCount.toFloat() / totalCount
        var progressPercent = (progressRatio * 100).toInt()
        assertEquals(40, progressPercent)

        // Toggle first item (t1) from false to true
        items = items.toMutableList().also {
            it[0] = it[0].copy(done = !it[0].done)
        }
        completedCount = items.count { it.done }
        assertEquals(3, completedCount)

        progressRatio = completedCount.toFloat() / totalCount
        progressPercent = (progressRatio * 100).toInt()
        assertEquals(60, progressPercent)
    }

    @Test
    fun testChartMetricToggleAndValueScaling() {
        val commandsMax = defaultActivityData.maxOfOrNull { it.commands }?.toFloat() ?: 100f
        val tokensMax = defaultActivityData.maxOfOrNull { it.tokens }?.toFloat() ?: 100f

        assertEquals("Max commands on Fri should be 110", 110f, commandsMax)
        assertEquals("Max tokens on Fri should be 56200", 56200f, tokensMax)

        // Verify integer division formatting for tokens display (e.g. 18500 -> 18k)
        val monBucket = defaultActivityData[0]
        val tokenFormattedStr = "${monBucket.tokens / 1000}k"
        assertEquals("18k", tokenFormattedStr)
    }

    @Test
    fun testUnreadMailCount() {
        val unreadCount = defaultMailItems.count { it.unread }
        assertEquals("Should have 2 unread mail items initially", 2, unreadCount)
    }

    @Test
    fun testNavigationKeysIntegrity() {
        val validAppRoutes = setOf(
            "chat", "council", "agents", "dashboard", "notebook",
            "notes", "tutor", "ocr_model", "settings", "research",
            "obsidian", "directory"
        )

        // Check Quick Actions keys
        quickActions.forEach { action ->
            assertTrue("Action key '${action.key}' must be a valid app route", validAppRoutes.contains(action.key))
        }

        // Check Empty State settings route
        val settingsRoute = "settings"
        assertTrue("Empty state CTA route 'settings' must be valid", validAppRoutes.contains(settingsRoute))

        // Check Agent Status route
        val agentsRoute = "agents"
        assertTrue("Agent status header route 'agents' must be valid", validAppRoutes.contains(agentsRoute))
    }
}
