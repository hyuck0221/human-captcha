package com.hshim.humancaptcha.controller

import com.hshim.humancaptcha.model.Decision
import com.hshim.humancaptcha.model.GameData
import com.hshim.humancaptcha.model.JoinRequest
import com.hshim.humancaptcha.model.MouseData
import com.hshim.humancaptcha.service.MatchingService
import org.springframework.context.event.EventListener
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller
import org.springframework.web.socket.messaging.SessionDisconnectEvent
import java.util.concurrent.ConcurrentHashMap

@Controller
class CaptchaWebSocketController(
    private val matchingService: MatchingService,
    private val template: SimpMessagingTemplate
) {

    // Map WebSocket Session ID -> User UUID (Client/Validator ID)
    private val sessionToUuid = ConcurrentHashMap<String, String>()

    @MessageMapping("/join/client")
    fun joinClient(@Payload request: JoinRequest, headerAccessor: org.springframework.messaging.simp.SimpMessageHeaderAccessor) {
        val sessionId = headerAccessor.sessionId ?: return
        val uuid = request.uuid
        sessionToUuid[sessionId] = uuid
        matchingService.registerClient(uuid, request.language)
    }

    @MessageMapping("/join/validator")
    fun joinValidator(@Payload request: JoinRequest, headerAccessor: org.springframework.messaging.simp.SimpMessageHeaderAccessor) {
        val sessionId = headerAccessor.sessionId ?: return
        val uuid = request.uuid
        sessionToUuid[sessionId] = uuid
        matchingService.registerValidator(uuid, request.language)
    }

    @MessageMapping("/mouse")
    fun handleMouse(@Payload data: MouseData, headerAccessor: org.springframework.messaging.simp.SimpMessageHeaderAccessor) {
        val sessionId = headerAccessor.sessionId ?: return
        val uuid = sessionToUuid[sessionId] ?: return
        
        val match = matchingService.getMatch(uuid) ?: return
        
        // Only client sends mouse data to validator
        if (match.clientId == uuid) {
            template.convertAndSend("/topic/private.${match.validatorId}", data)
        }
    }
    
    @MessageMapping("/game")
    fun handleGame(@Payload data: GameData, headerAccessor: org.springframework.messaging.simp.SimpMessageHeaderAccessor) {
        val sessionId = headerAccessor.sessionId ?: return
        val uuid = sessionToUuid[sessionId] ?: return
        
        val match = matchingService.getMatch(uuid) ?: return
        
        // Relay to the other party
        val otherId = if (match.clientId == uuid) match.validatorId else match.clientId
        template.convertAndSend("/topic/private.$otherId", data)
    }

    @MessageMapping("/decision")
    fun handleDecision(@Payload decision: Decision, headerAccessor: org.springframework.messaging.simp.SimpMessageHeaderAccessor) {
        val sessionId = headerAccessor.sessionId ?: return
        val uuid = sessionToUuid[sessionId] ?: return
        
        val match = matchingService.getMatch(uuid) ?: return
        
        // Only validator makes decision
        if (match.validatorId == uuid) {
            if (decision.approved) {
                matchingService.recordSuccess(match.clientId)
            } else {
                matchingService.recordFailure(match.clientId)
            }
        }
    }
    
    @EventListener
    fun handleDisconnect(event: SessionDisconnectEvent) {
        val sessionId = event.sessionId
        val uuid = sessionToUuid.remove(sessionId)
        if (uuid != null) {
            matchingService.removeSession(uuid)
        }
    }
}
