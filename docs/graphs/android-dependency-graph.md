# Android Dependency Graph

```mermaid
graph TD
    com_example_archonnotesinkcanvas_ui_main_MainScreenTest["com.example.archonnotesinkcanvas.ui.main.MainScreenTest"]
    unknown_CanvasMotionPredictor["unknown.CanvasMotionPredictor"]
    com_archon_notes_canvas_InkCanvasComposable["com.archon.notes.canvas.InkCanvasComposable"]
    com_archon_notes_canvas_InkStrokeState["com.archon.notes.canvas.InkStrokeState"]
    unknown_LowLatencyRenderer["unknown.LowLatencyRenderer"]
    com_archon_notes_canvas_MyScriptOcrService["com.archon.notes.canvas.MyScriptOcrService"]
    com_archon_notes_canvas_PalmRejectionHelper["com.archon.notes.canvas.PalmRejectionHelper"]
    unknown_StrokeSerialization["unknown.StrokeSerialization"]
    com_archon_notes_canvas_TutorNetworkService["com.archon.notes.canvas.TutorNetworkService"]
    com_example_archonnotesinkcanvas_MainActivity["com.example.archonnotesinkcanvas.MainActivity"]
    com_example_archonnotesinkcanvas_Navigation["com.example.archonnotesinkcanvas.Navigation"]
    com_example_archonnotesinkcanvas_NavigationKeys["com.example.archonnotesinkcanvas.NavigationKeys"]
    com_example_archonnotesinkcanvas_data_DataRepository["com.example.archonnotesinkcanvas.data.DataRepository"]
    com_example_archonnotesinkcanvas_data_local_ArchonDatabase["com.example.archonnotesinkcanvas.data.local.ArchonDatabase"]
    unknown_MessageDao["unknown.MessageDao"]
    unknown_NotebookDao["unknown.NotebookDao"]
    com_example_archonnotesinkcanvas_data_local_dao_OCRDao["com.example.archonnotesinkcanvas.data.local.dao.OCRDao"]
    com_example_archonnotesinkcanvas_data_local_dao_PageDao["com.example.archonnotesinkcanvas.data.local.dao.PageDao"]
    unknown_QuizAttemptDao["unknown.QuizAttemptDao"]
    com_example_archonnotesinkcanvas_data_local_dao_QuizSessionDao["com.example.archonnotesinkcanvas.data.local.dao.QuizSessionDao"]
    com_example_archonnotesinkcanvas_data_local_dao_StrokeDao["com.example.archonnotesinkcanvas.data.local.dao.StrokeDao"]
    unknown_MessageEntity["unknown.MessageEntity"]
    unknown_NotebookEntity["unknown.NotebookEntity"]
    com_example_archonnotesinkcanvas_data_local_entities_NotebookPageEntity["com.example.archonnotesinkcanvas.data.local.entities.NotebookPageEntity"]
    com_example_archonnotesinkcanvas_data_local_entities_OCRTrainingCheckpointEntity["com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingCheckpointEntity"]
    com_example_archonnotesinkcanvas_data_local_entities_OCRTrainingSampleEntity["com.example.archonnotesinkcanvas.data.local.entities.OCRTrainingSampleEntity"]
    unknown_QuizAttemptEntity["unknown.QuizAttemptEntity"]
    com_example_archonnotesinkcanvas_data_local_entities_QuizResponseEntity["com.example.archonnotesinkcanvas.data.local.entities.QuizResponseEntity"]
    com_example_archonnotesinkcanvas_data_local_entities_QuizSessionEntity["com.example.archonnotesinkcanvas.data.local.entities.QuizSessionEntity"]
    com_example_archonnotesinkcanvas_data_local_entities_StrokeEntity["com.example.archonnotesinkcanvas.data.local.entities.StrokeEntity"]
    unknown_ArchonApiClient["unknown.ArchonApiClient"]
    com_example_archonnotesinkcanvas_data_remote_BackendConfigStore["com.example.archonnotesinkcanvas.data.remote.BackendConfigStore"]
    com_example_archonnotesinkcanvas_theme_Color["com.example.archonnotesinkcanvas.theme.Color"]
    com_example_archonnotesinkcanvas_theme_Theme["com.example.archonnotesinkcanvas.theme.Theme"]
    com_example_archonnotesinkcanvas_theme_Type["com.example.archonnotesinkcanvas.theme.Type"]
    com_example_archonnotesinkcanvas_ui_adaptive_AdaptiveScaffold["com.example.archonnotesinkcanvas.ui.adaptive.AdaptiveScaffold"]
    com_example_archonnotesinkcanvas_ui_adaptive_ArchonShellViewModel["com.example.archonnotesinkcanvas.ui.adaptive.ArchonShellViewModel"]
    com_example_archonnotesinkcanvas_ui_adaptive_DeviceLayout["com.example.archonnotesinkcanvas.ui.adaptive.DeviceLayout"]
    com_example_archonnotesinkcanvas_ui_adaptive_WindowSizeExt["com.example.archonnotesinkcanvas.ui.adaptive.WindowSizeExt"]
    com_example_archonnotesinkcanvas_ui_canvas_CanvasHost["com.example.archonnotesinkcanvas.ui.canvas.CanvasHost"] --> com_archon_notes_canvas_InkCanvas["com.archon.notes.canvas.InkCanvas"]
    com_example_archonnotesinkcanvas_ui_canvas_CanvasHost["com.example.archonnotesinkcanvas.ui.canvas.CanvasHost"] --> com_archon_notes_canvas_InkStrokeState["com.archon.notes.canvas.InkStrokeState"]
    com_example_archonnotesinkcanvas_ui_canvas_FloatingToolbar["com.example.archonnotesinkcanvas.ui.canvas.FloatingToolbar"]
    com_example_archonnotesinkcanvas_ui_canvas_PageThumbnailStrip["com.example.archonnotesinkcanvas.ui.canvas.PageThumbnailStrip"]
    com_example_archonnotesinkcanvas_ui_components_ContextSidebarPane["com.example.archonnotesinkcanvas.ui.components.ContextSidebarPane"]
    com_example_archonnotesinkcanvas_ui_components_OCRCorrectionDialog["com.example.archonnotesinkcanvas.ui.components.OCRCorrectionDialog"]
    com_example_archonnotesinkcanvas_ui_components_OCRTrainingDashboard["com.example.archonnotesinkcanvas.ui.components.OCRTrainingDashboard"]
    com_example_archonnotesinkcanvas_ui_components_PageNavigator["com.example.archonnotesinkcanvas.ui.components.PageNavigator"] --> com_archon_notes_canvas_StrokeSerialization["com.archon.notes.canvas.StrokeSerialization"]
    com_example_archonnotesinkcanvas_ui_components_PageTemplateDialog["com.example.archonnotesinkcanvas.ui.components.PageTemplateDialog"]
    com_example_archonnotesinkcanvas_ui_components_RightSidebarPane["com.example.archonnotesinkcanvas.ui.components.RightSidebarPane"]
    com_example_archonnotesinkcanvas_ui_components_SyncStatusBadge["com.example.archonnotesinkcanvas.ui.components.SyncStatusBadge"]
    com_example_archonnotesinkcanvas_ui_components_TemplateBackgroundCanvas["com.example.archonnotesinkcanvas.ui.components.TemplateBackgroundCanvas"]
    com_example_archonnotesinkcanvas_ui_main_AdaptiveDifficultyManager["com.example.archonnotesinkcanvas.ui.main.AdaptiveDifficultyManager"]
    com_example_archonnotesinkcanvas_ui_main_CheckpointSyncManager["com.example.archonnotesinkcanvas.ui.main.CheckpointSyncManager"]
    com_example_archonnotesinkcanvas_ui_main_MainScreen["com.example.archonnotesinkcanvas.ui.main.MainScreen"] --> com_archon_notes_canvas_InkCanvas["com.archon.notes.canvas.InkCanvas"]
    com_example_archonnotesinkcanvas_ui_main_MainScreen["com.example.archonnotesinkcanvas.ui.main.MainScreen"] --> com_archon_notes_canvas_InkStrokeState["com.archon.notes.canvas.InkStrokeState"]
    com_example_archonnotesinkcanvas_ui_main_MainScreen["com.example.archonnotesinkcanvas.ui.main.MainScreen"] --> com_archon_notes_canvas_MyScriptOcrService["com.archon.notes.canvas.MyScriptOcrService"]
    com_example_archonnotesinkcanvas_ui_main_MainScreen["com.example.archonnotesinkcanvas.ui.main.MainScreen"] --> com_archon_notes_canvas_OcrResultData["com.archon.notes.canvas.OcrResultData"]
    com_example_archonnotesinkcanvas_ui_main_MainScreen["com.example.archonnotesinkcanvas.ui.main.MainScreen"] --> com_archon_notes_canvas_OcrTokenData["com.archon.notes.canvas.OcrTokenData"]
    com_example_archonnotesinkcanvas_ui_main_MainScreen["com.example.archonnotesinkcanvas.ui.main.MainScreen"] --> com_archon_notes_canvas_StrokeSerialization["com.archon.notes.canvas.StrokeSerialization"]
    com_example_archonnotesinkcanvas_ui_main_MainScreenViewModel["com.example.archonnotesinkcanvas.ui.main.MainScreenViewModel"]
    com_example_archonnotesinkcanvas_ui_main_OCRInferenceEngine["com.example.archonnotesinkcanvas.ui.main.OCRInferenceEngine"]
    com_example_archonnotesinkcanvas_ui_main_OCRTrainingViewModel["com.example.archonnotesinkcanvas.ui.main.OCRTrainingViewModel"]
    com_example_archonnotesinkcanvas_ui_main_SpacedRepetitionCalculator["com.example.archonnotesinkcanvas.ui.main.SpacedRepetitionCalculator"]
    com_example_archonnotesinkcanvas_ui_main_TutorModeScreen["com.example.archonnotesinkcanvas.ui.main.TutorModeScreen"] --> com_archon_notes_canvas_InkCanvas["com.archon.notes.canvas.InkCanvas"]
    com_example_archonnotesinkcanvas_ui_main_TutorModeScreen["com.example.archonnotesinkcanvas.ui.main.TutorModeScreen"] --> com_archon_notes_canvas_InkStrokeState["com.archon.notes.canvas.InkStrokeState"]
    com_example_archonnotesinkcanvas_ui_main_TutorModeScreen["com.example.archonnotesinkcanvas.ui.main.TutorModeScreen"] --> com_archon_notes_canvas_MyScriptOcrService["com.archon.notes.canvas.MyScriptOcrService"]
    com_example_archonnotesinkcanvas_ui_main_TutorModeScreen["com.example.archonnotesinkcanvas.ui.main.TutorModeScreen"] --> com_archon_notes_canvas_QuizQuestion["com.archon.notes.canvas.QuizQuestion"]
    com_example_archonnotesinkcanvas_ui_main_TutorModeScreen["com.example.archonnotesinkcanvas.ui.main.TutorModeScreen"] --> com_archon_notes_canvas_StrokeSerialization["com.archon.notes.canvas.StrokeSerialization"]
    com_example_archonnotesinkcanvas_ui_main_TutorViewModel["com.example.archonnotesinkcanvas.ui.main.TutorViewModel"] --> com_archon_notes_canvas_QuizQuestion["com.archon.notes.canvas.QuizQuestion"]
    com_example_archonnotesinkcanvas_ui_main_TutorViewModel["com.example.archonnotesinkcanvas.ui.main.TutorViewModel"] --> com_archon_notes_canvas_TutorNetworkService["com.archon.notes.canvas.TutorNetworkService"]
    com_example_archonnotesinkcanvas_ui_screens_AgentsScreen["com.example.archonnotesinkcanvas.ui.screens.AgentsScreen"]
    com_example_archonnotesinkcanvas_ui_screens_ChatScreen["com.example.archonnotesinkcanvas.ui.screens.ChatScreen"]
    com_example_archonnotesinkcanvas_ui_screens_CouncilScreen["com.example.archonnotesinkcanvas.ui.screens.CouncilScreen"]
    com_example_archonnotesinkcanvas_ui_screens_DashboardScreen["com.example.archonnotesinkcanvas.ui.screens.DashboardScreen"]
    com_example_archonnotesinkcanvas_ui_screens_NotebookListScreen["com.example.archonnotesinkcanvas.ui.screens.NotebookListScreen"]
    com_example_archonnotesinkcanvas_ui_screens_NotebookRAGScreen["com.example.archonnotesinkcanvas.ui.screens.NotebookRAGScreen"]
    com_example_archonnotesinkcanvas_ui_screens_OnboardingScreen["com.example.archonnotesinkcanvas.ui.screens.OnboardingScreen"]
    com_example_archonnotesinkcanvas_ui_screens_ResearchScreen["com.example.archonnotesinkcanvas.ui.screens.ResearchScreen"]
    com_example_archonnotesinkcanvas_ui_screens_SettingsScreen["com.example.archonnotesinkcanvas.ui.screens.SettingsScreen"]
    com_example_archonnotesinkcanvas_ui_adaptive_AdaptiveScaffoldTest["com.example.archonnotesinkcanvas.ui.adaptive.AdaptiveScaffoldTest"]
    unknown_MainScreenViewModelTest["unknown.MainScreenViewModelTest"]
    com_example_archonnotesinkcanvas_ui_screens_DashboardScreenTest["com.example.archonnotesinkcanvas.ui.screens.DashboardScreenTest"]
```

## Analysis

### Major Dependency Clusters
1. **Canvas & Ink Subsystem (`com.archon.notes.canvas`)**: This is the core domain cluster providing specialized views and state (`InkCanvas`, `InkStrokeState`, `MyScriptOcrService`). It is heavily consumed by the UI layer.
2. **Main UI Screens (`ui.main.MainScreen`, `TutorModeScreen`)**: The primary composition layer. These screens integrate the `canvas` components directly to build the core application experience.
3. **Data Layer (`data.local.dao`, `data.local.entities`)**: A dense cluster of Room database components (`PageDao`, `StrokeDao`, `QuizSessionDao`) managing the persistence of notebooks, strokes, and OCR training data.
4. **Adaptive Layout (`ui.adaptive`)**: Handles foldable/tablet screen configurations (`AdaptiveScaffold`, `DeviceLayout`, `WindowSizeExt`).

### Circular or Problematic Imports
- **No strict circular imports detected** at the package/class level.
- **Problematic Coupling:** The UI components (`MainScreen`, `TutorModeScreen`) directly import backend services like `MyScriptOcrService` and `TutorNetworkService`. This violates clean architecture principles by tightly coupling the View layer to Data/Network services.
- **Missing Packages:** Some core utilities like `CanvasMotionPredictor`, `LowLatencyRenderer`, and `StrokeSerialization` are mapped to an `unknown` package, indicating missing package declarations in the source `.kt` files.

### Recommendations
1. **Implement Clean Architecture / MVVM:** Abstract `MyScriptOcrService` and `TutorNetworkService` behind repositories. Inject them into ViewModels rather than having UI components (Composables) directly import and instantiate them.
2. **Fix Missing Package Declarations:** Review files like `LowLatencyRenderer.kt` and `CanvasMotionPredictor.kt` and add proper `package com.archon.notes.canvas` declarations.
3. **Decouple Canvas Engine:** Ensure that `InkCanvas` and `StrokeSerialization` only depend on abstract state interfaces rather than concrete UI models, allowing the canvas engine to be independently testable.

