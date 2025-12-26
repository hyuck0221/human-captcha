package com.hshim.humancaptcha.service

import com.hshim.humancaptcha.model.ClientState
import com.hshim.humancaptcha.model.MatchInfo
import com.hshim.humancaptcha.model.MatchStatus
import com.hshim.humancaptcha.model.TaskType
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue

@Service
class MatchingService(
    private val template: SimpMessagingTemplate
) {

    // Waiting queue for clients (sessionIds)
    private val clientQueue = ConcurrentLinkedQueue<String>()

    // Active matches: key could be either clientId or validatorId for quick lookup
    private val activeMatches = ConcurrentHashMap<String, MatchInfo>()

    // Client state tracking (failures, blacklist)
    private val clientStates = ConcurrentHashMap<String, ClientState>()

    // Validator availability
    private val validatorQueue = ConcurrentLinkedQueue<String>()
    // Temporary storage for validator language since we don't have ValidatorState
    private val validatorLanguages = ConcurrentHashMap<String, String>()


    fun registerClient(sessionId: String, language: String) {
        println("Registering Client: $sessionId ($language)")
        val state = clientStates.computeIfAbsent(sessionId) { ClientState(it, language) }
        state.lastSeen = LocalDateTime.now() // Update activity

        // Add to queue if not already matching or in queue
        if (!clientQueue.contains(sessionId) && !activeMatches.containsKey(sessionId)) {
            clientQueue.add(sessionId)
            println("Client added to queue. Size: ${clientQueue.size}")
        } else {
            println("Client already in queue or matching.")
        }
        tryMatch()
    }

    fun registerValidator(sessionId: String, language: String) {
        println("Registering Validator: $sessionId ($language)")
        validatorLanguages[sessionId] = language
        if (!validatorQueue.contains(sessionId) && !activeMatches.containsKey(sessionId)) {
            validatorQueue.add(sessionId)
            println("Validator added to queue. Size: ${validatorQueue.size}")
        } else {
            println("Validator already in queue or matching.")
        }
        tryMatch()
    }

    @Synchronized
    private fun tryMatch() {
        println("tryMatch: Clients=${clientQueue.size}, Validators=${validatorQueue.size}")
        val clientIterator = clientQueue.iterator()
        
        while (clientIterator.hasNext()) {
            val clientId = clientIterator.next()
            val clientState = clientStates[clientId] ?: continue
            
            if (activeMatches.containsKey(clientId)) {
                clientIterator.remove()
                continue
            }

            // Find a suitable validator
            val validatorIterator = validatorQueue.iterator()
            var matchedValidatorId: String? = null
            
            while (validatorIterator.hasNext()) {
                val validatorId = validatorIterator.next()
                if (!clientState.matchedValidators.contains(validatorId)) {
                    matchedValidatorId = validatorId
                    break
                } else {
                    println("Skipping blacklisted validator $validatorId for client $clientId")
                }
            }
            
            if (matchedValidatorId != null) {
                // Remove both from queues
                clientIterator.remove()
                validatorQueue.remove(matchedValidatorId)
                
                // Default Task: Mouse Tracking
                val task = TaskType.MOUSE_TRACKING
                val vLang = validatorLanguages[matchedValidatorId] ?: "en"

                // Create Match
                val match = MatchInfo(
                    clientId = clientId, 
                    validatorId = matchedValidatorId, 
                    clientLanguage = clientState.language,
                    validatorLanguage = vLang,
                    taskType = task
                )
                activeMatches[clientId] = match
                activeMatches[matchedValidatorId] = match
                
                // ADD TO BLACKLIST
                clientState.matchedValidators.add(matchedValidatorId)
                
                println("SUCCESSFUL MATCH: $clientId <-> $matchedValidatorId (Blacklist size: ${clientState.matchedValidators.size})")

                // Notify users
                template.convertAndSend("/topic/private.$clientId", match)
                template.convertAndSend("/topic/private.$matchedValidatorId", match)
            } else {
                if (validatorQueue.isNotEmpty()) {
                    println("No suitable validator for client $clientId among ${validatorQueue.size} available.")
                }
            }
        }
    }
    
    fun getMatch(sessionId: String): MatchInfo? {
        return activeMatches[sessionId]
    }
    
    fun removeSession(sessionId: String) {
        clientQueue.remove(sessionId)
        validatorQueue.remove(sessionId)
        validatorLanguages.remove(sessionId)
        
        // DO NOT remove from client states here!
        // We want to keep the failures and matchedValidators for when they reconnect.

        val match = activeMatches.remove(sessionId)
        if (match != null) {
            // End the match for the other party too
            val otherId = if (match.clientId == sessionId) match.validatorId else match.clientId
            activeMatches.remove(otherId)
            
            // Notify other party of disconnect
            template.convertAndSend("/topic/private.$otherId", "Partner disconnected")
        }
    }
    
    fun recordFailure(clientId: String) {
        val state = clientStates[clientId] ?: return
        state.failures++
        
        val match = activeMatches.remove(clientId)
        if (match != null) {
            activeMatches.remove(match.validatorId)
            // Notify validator job done
            template.convertAndSend("/topic/private.${match.validatorId}", "Session Ended")
            
            // Re-queue validator with preserved language
            val vLang = validatorLanguages[match.validatorId] ?: "en"
            registerValidator(match.validatorId, vLang)
        }

        if (state.failures >= 3) {
            // Final failure logic
            template.convertAndSend("/topic/private.$clientId", "FAILED_FINAL")
        } else {
            // Re-queue client with preserved language
            template.convertAndSend("/topic/private.$clientId", "RETRY")
            // registerClient will be called again when page reloads and sends join request
        }
    }

    fun recordSuccess(clientId: String) {
        val match = activeMatches.remove(clientId)
        if (match != null) {
            activeMatches.remove(match.validatorId)
            template.convertAndSend("/topic/private.${match.validatorId}", "SUCCESS")
            
            // Re-queue validator
            val vLang = validatorLanguages[match.validatorId] ?: "en"
            registerValidator(match.validatorId, vLang)
        }
        
        clientStates.remove(clientId) // Identity cleared only on SUCCESS
        template.convertAndSend("/topic/private.$clientId", "SUCCESS")
    }

    @Scheduled(fixedRate = 30000)
    fun cleanupStaleMatches() {
        val now = LocalDateTime.now()
        
        // Cleanup active matches
        val matchesToRemove = mutableSetOf<String>()
        activeMatches.forEach { (id, match) ->
            if (match.startTime.isBefore(now.minusMinutes(5))) {
                matchesToRemove.add(match.clientId)
                matchesToRemove.add(match.validatorId)
            }
        }
        matchesToRemove.forEach { removeSession(it) }

        // Cleanup old client states (blacklist/failure history) after 30 mins of inactivity
        clientStates.entries.removeIf { it.value.lastSeen.isBefore(now.minusMinutes(30)) }
    }
}