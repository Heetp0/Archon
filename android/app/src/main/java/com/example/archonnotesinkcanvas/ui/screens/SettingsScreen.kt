package com.example.archonnotesinkcanvas.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.archonnotesinkcanvas.data.remote.BackendConfigStore
import com.example.archonnotesinkcanvas.data.remote.ArchonApiClient
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.platform.LocalContext
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(windowSizeClass: WindowSizeClass) {
    val context = LocalContext.current
    val store = BackendConfigStore(context)
    val backendUrlState = store.backendUrl.collectAsState(initial = "http://192.168.1.10:8000")
    val scope = rememberCoroutineScope()

    var urlDraft by remember { mutableStateOf(backendUrlState.value) }
    var pingResult by remember { mutableStateOf<String?>(null) }
    var pinging by remember { mutableStateOf(false) }
    
    LaunchedEffect(backendUrlState.value) {
        urlDraft = backendUrlState.value
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(text = "Backend Server", style = MaterialTheme.typography.headlineSmall)

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = urlDraft,
            onValueChange = { urlDraft = it },
            label = { Text("URL") },
            modifier = Modifier.fillMaxWidth()
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
        ) {
            Button(
                onClick = {
                    scope.launch {
                        store.setBackendUrl(urlDraft)
                    }
                }
            ) {
                Text(text = "Save")
            }

            Spacer(modifier = Modifier.width(8.dp))

            Button(
                onClick = {
                    scope.launch {
                        pinging = true
                        pingResult = try {
                            if (ArchonApiClient.health()) "Connected" else "Unreachable"
                        } catch(e: Exception) {
                            "Unreachable"
                        }
                        pinging = false
                    }
                },
                enabled = !pinging
            ) {
                Text(text = "Test Connection")
            }

            if (pinging) {
                Spacer(modifier = Modifier.width(8.dp))
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        pingResult?.let { result ->
            when (result) {
                "Connected" -> Text(text = result, color = Color.Green)
                "Unreachable" -> Text(text = result, color = Color.Red)
                else -> {}
            }
        }
    }
}
