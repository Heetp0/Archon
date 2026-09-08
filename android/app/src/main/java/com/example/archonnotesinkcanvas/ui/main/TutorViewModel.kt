package com.example.archonnotesinkcanvas.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.archon.notes.canvas.QuizQuestion
import com.archon.notes.canvas.TutorNetworkService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.File
import android.content.SharedPreferences
import android.util.Log

enum class TutorScreenState { DASHBOARD, QUIZ, SUMMARY }

data class TopicMastery(
    val topicId: String,
    val title: String,
    val masteryPercentage: Float, // 0.0 to 1.0
    val questionCount: Int,
    val lastPracticedDaysAgo: Int
)

class TutorViewModel : ViewModel() {
    private val _screenState = MutableStateFlow(TutorScreenState.DASHBOARD)
    val screenState: StateFlow<TutorScreenState> = _screenState

    private val _questions = MutableStateFlow<List<QuizQuestion>>(emptyList())
    val questions: StateFlow<List<QuizQuestion>> = _questions

    private val _currentQuestionIndex = MutableStateFlow(0)
    val currentQuestionIndex: StateFlow<Int> = _currentQuestionIndex

    private val _attemptId = MutableStateFlow<String?>(null)
    val attemptId: StateFlow<String?> = _attemptId

    private val _status = MutableStateFlow("IDLE")
    val status: StateFlow<String> = _status

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback

    private val _hintText = MutableStateFlow<String?>(null)
    val hintText: StateFlow<String?> = _hintText

    private val _ocrText = MutableStateFlow("")
    val ocrText: StateFlow<String> = _ocrText

    private val _ocrConfidence = MutableStateFlow<Float?>(null)
    val ocrConfidence: StateFlow<Float?> = _ocrConfidence

    private val _showDisagreementDialog = MutableStateFlow(false)
    val showDisagreementDialog: StateFlow<Boolean> = _showDisagreementDialog

    private val _myScriptResult = MutableStateFlow(Pair("", 0f))
    val myScriptResult: StateFlow<Pair<String, Float>> = _myScriptResult

    private val _customResult = MutableStateFlow(Pair("", 0f))
    val customResult: StateFlow<Pair<String, Float>> = _customResult

    private val _isCorrect = MutableStateFlow<Boolean?>(null)
    val isCorrect: StateFlow<Boolean?> = _isCorrect

    private val _hintsRequested = MutableStateFlow(0)
    val hintsRequested: StateFlow<Int> = _hintsRequested

    private val _qualityScore = MutableStateFlow(0)
    val qualityScore: StateFlow<Int> = _qualityScore

    private val _nextReviewDays = MutableStateFlow(0)
    val nextReviewDays: StateFlow<Int> = _nextReviewDays

    private val _errorType = MutableStateFlow<String?>(null)
    val errorType: StateFlow<String?> = _errorType

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _streakCount = MutableStateFlow(3)
    val streakCount: StateFlow<Int> = _streakCount

    private val _xpEarned = MutableStateFlow(120)
    val xpEarned: StateFlow<Int> = _xpEarned

    private val _confidenceLevel = MutableStateFlow("confident")
    val confidenceLevel: StateFlow<String> = _confidenceLevel

    private val _difficultyLevel = MutableStateFlow("medium")
    val difficultyLevel: StateFlow<String> = _difficultyLevel

    private val _correctCount = MutableStateFlow(0)
    val correctCount: StateFlow<Int> = _correctCount

    private val _totalAnswered = MutableStateFlow(0)
    val totalAnswered: StateFlow<Int> = _totalAnswered

    private val _topicMasteryList = MutableStateFlow(
        listOf(
            TopicMastery("thermo", "Thermodynamics & Heat", 0.85f, 12, 1),
            TopicMastery("orbital", "Orbital Mechanics & Kepler", 0.62f, 8, 2),
            TopicMastery("control", "Control Systems & Transfer Functions", 0.94f, 15, 0),
            TopicMastery("quantum", "Quantum State Vectors & Operators", 0.40f, 6, 4)
        )
    )
    val topicMasteryList: StateFlow<List<TopicMastery>> = _topicMasteryList

    fun openDashboard() {
        _screenState.value = TutorScreenState.DASHBOARD
    }

    fun startQuiz(notebookId: String = "default_notebook") {
        _screenState.value = TutorScreenState.QUIZ
        loadQuestions(notebookId)
    }

    fun loadQuestions(notebookId: String = "default_notebook") {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val list = TutorNetworkService.getQuestions(notebookId)
                if (list.isNotEmpty()) {
                    _questions.value = list
                } else {
                    _questions.value = getFallbackQuestions()
                }
            } catch (e: Exception) {
                // Fallback to offline questions so Tutor Mode is always interactive!
                _questions.value = getFallbackQuestions()
            } finally {
                _currentQuestionIndex.value = 0
                _correctCount.value = 0
                _totalAnswered.value = 0
                val activeList = _questions.value
                if (activeList.isNotEmpty()) {
                    initQuestionAttempt(notebookId, activeList[0].question_id)
                } else {
                    _status.value = "EMPTY"
                }
                _isLoading.value = false
            }
        }
    }

    private suspend fun initQuestionAttempt(notebookId: String, questionId: String) {
        _isLoading.value = true
        try {
            val resp = TutorNetworkService.startAttempt(notebookId, questionId)
            _attemptId.value = resp.attempt_id
        } catch (e: Exception) {
            _attemptId.value = "offline_attempt_${System.currentTimeMillis()}"
        } finally {
            _status.value = "IN_PROGRESS"
            _isCorrect.value = null
            _feedback.value = null
            _hintText.value = null
            _ocrText.value = "dE = dQ - dW"
            _hintsRequested.value = 0
            _errorType.value = null
            _isLoading.value = false
        }
    }

    fun nextQuestion(notebookId: String = "default_notebook") {
        val nextIdx = _currentQuestionIndex.value + 1
        if (nextIdx < _questions.value.size) {
            _currentQuestionIndex.value = nextIdx
            viewModelScope.launch {
                initQuestionAttempt(notebookId, _questions.value[nextIdx].question_id)
            }
        } else {
            _screenState.value = TutorScreenState.SUMMARY
            _status.value = "COMPLETE"
        }
    }

    fun updateOcrText(text: String, confidence: Float? = null) {
        _ocrText.value = text
        if (confidence != null) {
            _ocrConfidence.value = confidence
        }
    }

    fun triggerDisagreement(myScriptText: String, myScriptConf: Float, customText: String, customConf: Float) {
        _myScriptResult.value = Pair(myScriptText, myScriptConf)
        _customResult.value = Pair(customText, customConf)
        _showDisagreementDialog.value = true
    }

    fun recordUserFeedback(choice: String, correctText: String) {
        val conf = if (choice == "Use MyScript") _myScriptResult.value.second else _customResult.value.second
        updateOcrText(correctText, conf)
        _showDisagreementDialog.value = false
    }

    fun checkAndLoadCustomModel(modelsDir: File, prefs: SharedPreferences) {
        val latest = modelsDir.listFiles()?.filter { it.name.startsWith("handwriting_checkpoint") }
            ?.maxByOrNull { it.lastModified() }
        if (latest != null) {
            Log.d("TutorEnsemble", "Loading custom model: ${latest.name}")
            // Store path in SharedPreferences for the OCR engine to load
            prefs.edit().putString("custom_model_path", latest.absolutePath).apply()
        }
    }

    fun setConfidenceLevel(confidence: String) {
        _confidenceLevel.value = confidence
    }

    fun submitAnswer(latex: String, timeSpentSeconds: Int, confidence: String = _confidenceLevel.value) {
        val currentQuestion = _questions.value.getOrNull(_currentQuestionIndex.value) ?: return
        val currentAttemptId = _attemptId.value ?: "offline_attempt"
        _confidenceLevel.value = confidence

        viewModelScope.launch {
            _isLoading.value = true
            try {
                val resp = TutorNetworkService.submitAnswer(
                    attemptId = currentAttemptId,
                    questionId = currentQuestion.question_id,
                    latex = latex,
                    timeSpent = timeSpentSeconds
                )
                _isCorrect.value = resp.is_correct
                _errorType.value = resp.error_type
                _feedback.value = resp.feedback?.message ?: (if (resp.is_correct == true) "Excellent! Correct mathematical proof." else "Check sign orientation & units.")
            } catch (e: Exception) {
                // Offline verification fallback logic
                val isAnswerNotEmpty = latex.trim().isNotEmpty()
                _isCorrect.value = isAnswerNotEmpty
                _feedback.value = if (isAnswerNotEmpty) "Offline Check: Solution formatted cleanly! Review against expected formula: ${currentQuestion.expected_answer_latex}" else "Please write a non-empty mathematical derivation."
            } finally {
                val correct = _isCorrect.value == true
                _totalAnswered.value += 1

                // Run SM-2 Spaced Repetition calculation
                val sm2 = SpacedRepetitionCalculator.calculateNextReview(
                    isCorrect = correct,
                    confidence = confidence,
                    currentRepetitions = if (correct) 1 else 0
                )
                _nextReviewDays.value = sm2.intervalDays

                if (correct) {
                    _correctCount.value += 1
                    _status.value = "CORRECT"
                    val earned = when (confidence) {
                        "confident" -> 50
                        "unsure" -> 35
                        else -> 20
                    }
                    _xpEarned.value += earned
                    _streakCount.value += 1
                } else {
                    _status.value = "INCORRECT"
                    _streakCount.value = (streakCount.value - 1).coerceAtLeast(0)
                }

                // Adaptive difficulty shift
                val currentDiff = when (_difficultyLevel.value) {
                    "easy" -> AdaptiveDifficultyManager.Difficulty.EASY
                    "hard" -> AdaptiveDifficultyManager.Difficulty.HARD
                    else -> AdaptiveDifficultyManager.Difficulty.MEDIUM
                }
                val accuracyRatio = _correctCount.value.toFloat() / _totalAnswered.value.coerceAtLeast(1)
                val newDiff = AdaptiveDifficultyManager.getNextDifficulty(currentDiff, accuracyRatio, confidence)
                _difficultyLevel.value = newDiff.label

                _isLoading.value = false
            }
        }
    }

    fun requestHint() {
        val currentQuestion = _questions.value.getOrNull(_currentQuestionIndex.value) ?: return
        val currentAttemptId = _attemptId.value ?: "offline_attempt"
        val nextLevel = _hintsRequested.value + 1
        
        if (nextLevel > 3) return
        
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val resp = TutorNetworkService.getHint(
                    attemptId = currentAttemptId,
                    questionId = currentQuestion.question_id,
                    latex = _ocrText.value,
                    level = nextLevel,
                    errorType = _errorType.value
                )
                _hintText.value = resp.hint_text
                _hintsRequested.value = resp.hint_level
            } catch (e: Exception) {
                _hintsRequested.value = nextLevel
                _hintText.value = when (nextLevel) {
                    1 -> "Recall: ${currentQuestion.explanation.take(60)}..."
                    2 -> "Socratic Hint: Look at the expected terms in \\(${currentQuestion.expected_answer_latex}\\)."
                    else -> "Detailed Hint: ${currentQuestion.explanation}"
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun finalizeAttempt() {
        val currentAttemptId = _attemptId.value ?: "offline_attempt"
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val resp = TutorNetworkService.finalizeAttempt(currentAttemptId)
                _qualityScore.value = resp.quality_score
                _nextReviewDays.value = resp.next_review_interval_days
            } catch (e: Exception) {
                _qualityScore.value = 4
                _nextReviewDays.value = 3
            } finally {
                _status.value = "FINALIZED"
                _isLoading.value = false
            }
        }
    }

    private fun getFallbackQuestions(): List<QuizQuestion> {
        return listOf(
            QuizQuestion(
                question_id = "q_thermo_1",
                notebook_id = "default_notebook",
                topic = "Thermodynamics",
                difficulty = 2,
                question_text = "State the First Law of Thermodynamics for a closed system and write its differential energy balance equation.",
                question_latex = "dU = dQ - dW",
                expected_answer_latex = "dU = dQ - dW",
                explanation = "The first law states that the change in internal energy (dU) equals net heat added (dQ) minus work done by system (dW).",
                source = "Thermodynamics Chapter 2"
            ),
            QuizQuestion(
                question_id = "q_orbital_1",
                notebook_id = "default_notebook",
                topic = "Orbital Mechanics",
                difficulty = 3,
                question_text = "Derive Kepler's Third Law formula relating orbital period T to semi-major axis a for a circular orbit.",
                question_latex = "T^2 = \\frac{4\\pi^2}{\\mu} a^3",
                expected_answer_latex = "T^2 = \\frac{4\\pi^2}{\\mu} a^3",
                explanation = "Equate gravitational force F_g = G M m / a^2 to centripetal force F_c = m \\omega^2 a where \\omega = 2\\pi / T.",
                source = "Orbital Mechanics Chapter 4"
            ),
            QuizQuestion(
                question_id = "q_control_1",
                notebook_id = "default_notebook",
                topic = "Control Systems",
                difficulty = 1,
                question_text = "Find the transfer function H(s) of a single-pole low-pass RC filter with time constant \\tau = RC.",
                question_latex = "H(s) = \\frac{1}{\\tau s + 1}",
                expected_answer_latex = "H(s) = \\frac{1}{\\tau s + 1}",
                explanation = "Applying Laplace transform to V_in - V_out = RC (dV_out / dt) yields H(s) = V_out(s) / V_in(s) = 1 / (RC s + 1).",
                source = "Control Systems Chapter 1"
            )
        )
    }
}
