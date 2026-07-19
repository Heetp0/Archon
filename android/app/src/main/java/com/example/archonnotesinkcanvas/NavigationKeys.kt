package com.example.archonnotesinkcanvas

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable data object Onboarding : NavKey
@Serializable data object Chat : NavKey
@Serializable data object NotebookList : NavKey
@Serializable data class NotesMode(val notebookId: String) : NavKey
@Serializable data object Tutor : NavKey
@Serializable data object Dashboard : NavKey
@Serializable data object Settings : NavKey
// Keep Main for backward compat during migration
@Serializable data object Main : NavKey
