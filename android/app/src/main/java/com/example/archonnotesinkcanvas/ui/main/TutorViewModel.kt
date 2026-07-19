package com.example.archonnotesinkcanvas.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.archon.notes.canvas.QuizQuestion
import com.archon.notes.canvas.TutorNetworkService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class TutorViewModel : ViewModel() {
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

    fun loadQuestions(notebookId: String = "default_notebook") {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val list = TutorNetworkService.getQuestions(notebookId)
                _questions.value = list
                _currentQuestionIndex.value = 0
                if (list.isNotEmpty()) {
                    initQuestionAttempt(notebookId, list[0].question_id)
                } else {
                    _status.value = "EMPTY"
                }
            } catch (e: Exception) {
                _status.value = "ERROR"
                _feedback.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun initQuestionAttempt(notebookId: String, questionId: String) {
        _isLoading.value = true
        try {
            val resp = TutorNetworkService.startAttempt(notebookId, questionId)
            _attemptId.value = resp.attempt_id
            _status.value = "IN_PROGRESS"
            _isCorrect.value = null
            _feedback.value = null
            _hintText.value = null
            _ocrText.value = ""
            _hintsRequested.value = 0
            _errorType.value = null
        } catch (e: Exception) {
            _status.value = "ERROR"
            _feedback.value = e.message
        } finally {
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
            _status.value = "COMPLETE"
        }
    }

    fun updateOcrText(text: String) {
        _ocrText.value = text
    }

    fun submitAnswer(latex: String, timeSpentSeconds: Int) {
        val currentAttemptId = _attemptId.value ?: return
        val currentQuestion = _questions.value.getOrNull(_currentQuestionIndex.value) ?: return
        
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
                _feedback.value = resp.feedback?.message ?: (if (resp.is_correct == true) "Correct!" else "Incorrect.")
                
                if (resp.is_correct == true) {
                    _status.value = "CORRECT"
                } else {
                    _status.value = "INCORRECT"
                }
            } catch (e: Exception) {
                _feedback.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun requestHint() {
        val currentAttemptId = _attemptId.value ?: return
        val currentQuestion = _questions.value.getOrNull(_currentQuestionIndex.value) ?: return
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
                _feedback.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun finalizeAttempt() {
        val currentAttemptId = _attemptId.value ?: return
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val resp = TutorNetworkService.finalizeAttempt(currentAttemptId)
                _qualityScore.value = resp.quality_score
                _nextReviewDays.value = resp.next_review_interval_days
                _status.value = "FINALIZED"
            } catch (e: Exception) {
                _feedback.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }
}
