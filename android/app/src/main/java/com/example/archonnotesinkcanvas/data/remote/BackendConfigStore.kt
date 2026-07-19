package com.example.archonnotesinkcanvas.data.remote

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "archon_prefs")

class BackendConfigStore(private val context: Context) {
    private val BACKEND_URL = stringPreferencesKey("backend_url")
    private val ONBOARDING_DONE = booleanPreferencesKey("onboarding_done")

    val backendUrl: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[BACKEND_URL] ?: "http://192.168.1.10:8000"
    }

    val onboardingDone: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[ONBOARDING_DONE] ?: false
    }

    suspend fun setBackendUrl(url: String) {
        context.dataStore.edit { settings ->
            settings[BACKEND_URL] = url
        }
    }

    suspend fun setOnboardingDone(done: Boolean) {
        context.dataStore.edit { settings ->
            settings[ONBOARDING_DONE] = done
        }
    }

    suspend fun getBackendUrlSnapshot(): String {
        return context.dataStore.data.first()[BACKEND_URL] ?: "http://192.168.1.10:8000"
    }
}
