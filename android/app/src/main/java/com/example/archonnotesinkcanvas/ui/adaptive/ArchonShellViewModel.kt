package com.example.archonnotesinkcanvas.ui.adaptive

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.archonnotesinkcanvas.data.remote.ArchonApiClient
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class ArchonShellViewModel : ViewModel() {

    private val _contextSidebarOpen = MutableStateFlow(true)
    val contextSidebarOpen: StateFlow<Boolean> = _contextSidebarOpen.asStateFlow()

    private val _rightSidebarOpen = MutableStateFlow(false)
    val rightSidebarOpen: StateFlow<Boolean> = _rightSidebarOpen.asStateFlow()

    private val _isBackendConnected = MutableStateFlow(false)
    val isBackendConnected: StateFlow<Boolean> = _isBackendConnected.asStateFlow()

    // Autopilot toggle (PC spec: System Bar pill switch)
    private val _autopilotEnabled = MutableStateFlow(false)
    val autopilotEnabled: StateFlow<Boolean> = _autopilotEnabled.asStateFlow()

    // Current destination for mode-aware pane defaults
    private val _currentDestination = MutableStateFlow("chat")
    val currentDestination: StateFlow<String> = _currentDestination.asStateFlow()

    fun toggleAutopilot() {
        _autopilotEnabled.value = !_autopilotEnabled.value
    }

    /** Apply per-mode pane defaults from the PC spec */
    fun applyModeDefaults(destination: String) {
        _currentDestination.value = destination
        when (destination) {
            "chat", "council" -> {
                _contextSidebarOpen.value = true   // Left: History
                _rightSidebarOpen.value = false     // Right: collapsed
            }
            "agents" -> {
                _contextSidebarOpen.value = true   // Left: Vault
                _rightSidebarOpen.value = false     // Right: collapsed
            }
            "research" -> {
                _contextSidebarOpen.value = true   // Left: Source Ledger
                _rightSidebarOpen.value = true      // Right: Grounded Chat
            }
            else -> {
                _contextSidebarOpen.value = true
                _rightSidebarOpen.value = false
            }
        }
    }

    private val _temperature = MutableStateFlow(0.7f)
    val temperature: StateFlow<Float> = _temperature.asStateFlow()

    private val _contextFiles = MutableStateFlow(
        listOf(
            "notebook_1_notes.bin",
            "archon_architecture.pdf",
            "ocr_checkpoint_v2.json"
        )
    )
    val contextFiles: StateFlow<List<String>> = _contextFiles.asStateFlow()

    private val _activityLogs = MutableStateFlow(
        listOf(
            "System initialized",
            "Backend health check ok",
            "Ready for queries"
        )
    )
    val activityLogs: StateFlow<List<String>> = _activityLogs.asStateFlow()

    private val _tokenUsage = MutableStateFlow(4210)
    val tokenUsage: StateFlow<Int> = _tokenUsage.asStateFlow()

    private val _maxTokens = MutableStateFlow(16384)
    val maxTokens: StateFlow<Int> = _maxTokens.asStateFlow()

    init {
        startHealthCheckLoop()
    }

    fun toggleContextSidebar() {
        _contextSidebarOpen.value = !_contextSidebarOpen.value
    }

    fun setContextSidebarOpen(open: Boolean) {
        _contextSidebarOpen.value = open
    }

    fun toggleRightSidebar() {
        _rightSidebarOpen.value = !_rightSidebarOpen.value
    }

    fun setRightSidebarOpen(open: Boolean) {
        _rightSidebarOpen.value = open
    }

    fun setTemperature(temp: Float) {
        _temperature.value = temp.coerceIn(0.0f, 1.0f)
    }

    fun addContextFile(fileName: String) {
        if (fileName.isNotBlank() && !contextFiles.value.contains(fileName)) {
            _contextFiles.value = _contextFiles.value + fileName
            addActivityLog("Added context file: $fileName")
        }
    }

    fun removeContextFile(fileName: String) {
        _contextFiles.value = _contextFiles.value - fileName
        addActivityLog("Removed context file: $fileName")
    }

    fun addActivityLog(log: String) {
        val timestampedLog = "[${System.currentTimeMillis() % 100000}] $log"
        _activityLogs.value = listOf(timestampedLog) + _activityLogs.value.take(49)
    }

    fun checkBackendHealth() {
        viewModelScope.launch {
            try {
                val healthy = ArchonApiClient.health()
                _isBackendConnected.value = healthy
            } catch (e: Exception) {
                _isBackendConnected.value = false
            }
        }
    }

    private fun startHealthCheckLoop() {
        viewModelScope.launch {
            while (isActive) {
                try {
                    val healthy = ArchonApiClient.health()
                    _isBackendConnected.value = healthy
                } catch (e: Exception) {
                    _isBackendConnected.value = false
                }
                delay(15000) // check health every 15 sec
            }
        }
    }
}
