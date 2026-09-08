package com.example.archonnotesinkcanvas

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable data object Onboarding : NavKey
@Serializable data object Chat : NavKey
@Serializable data object Council : NavKey
@Serializable data object Agents : NavKey
@Serializable data object NotebookList : NavKey
@Serializable data class NotesMode(val notebookId: String) : NavKey
@Serializable data object NotebookRAG : NavKey
@Serializable data object Research : NavKey
@Serializable data object Tutor : NavKey
@Serializable data object Dashboard : NavKey
@Serializable data object Settings : NavKey
@Serializable data object OCRModelTraining : NavKey
@Serializable data object Obsidian : NavKey
@Serializable data object Directory : NavKey
@Serializable data object Main : NavKey
