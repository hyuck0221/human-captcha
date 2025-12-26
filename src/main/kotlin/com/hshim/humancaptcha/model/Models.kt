package com.hshim.humancaptcha.model

import java.time.LocalDateTime
import java.util.concurrent.ConcurrentHashMap

data class MatchInfo(
    val clientId: String,
    val validatorId: String,
    val clientLanguage: String = "en",
    val validatorLanguage: String = "en",
    val startTime: LocalDateTime = LocalDateTime.now(),
    var status: MatchStatus = MatchStatus.IN_PROGRESS,
    val taskType: TaskType = TaskType.MOUSE_TRACKING
)

enum class MatchStatus {
    WAITING,
    IN_PROGRESS,
    SUCCESS,
    FAIL
}

enum class TaskType {
    MOUSE_TRACKING,
    RPS, // Rock Paper Scissors
    DRAWING,
    CHAT
}

data class ClientState(
    val sessionId: String,
    val language: String = "en",
    var failures: Int = 0,
    val matchedValidators: MutableSet<String> = ConcurrentHashMap.newKeySet(),
    var lastSeen: LocalDateTime = LocalDateTime.now()
)

data class MouseData(
    val x: Double,
    val y: Double,
    val cx: Double = -1.0, // Canvas relative X (0.0 - 1.0)
    val cy: Double = -1.0, // Canvas relative Y (0.0 - 1.0)
    val isDown: Boolean = false,
    val w: Int = 0,
    val h: Int = 0
)

data class GameData(
    val type: String, // "RPS", "DRAWING", "CHAT"
    val payload: String // JSON payload specific to game
)

data class Decision(
    val approved: Boolean
)
