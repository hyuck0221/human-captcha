import { useEffect, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { MatchRow, SessionBroadcast, MouseData, GameData } from '../types'

export interface UseSupabaseOptions {
  uuid: string
  language: string
  role: 'client' | 'validator'
  onMatchFound: (match: MatchRow) => void
  onMessage: (event: SessionBroadcast) => void
  onQueued?: () => void
}

export interface UseSupabaseReturn {
  sendMouse: (data: MouseData) => void
  sendGame: (data: GameData) => void
  sendDecision: (approved: boolean) => Promise<void>
  isConnected: boolean
}

export function useSupabase({
  uuid,
  language,
  role,
  onMatchFound,
  onMessage,
  onQueued,
}: UseSupabaseOptions): UseSupabaseReturn {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const matchRef = useRef<MatchRow | null>(null)
  const sessionEndedByDecisionRef = useRef(false)
  const queueJoinedAtRef = useRef<string | null>(null)
  const onMatchFoundRef = useRef(onMatchFound)
  const onMessageRef = useRef(onMessage)
  const onQueuedRef = useRef(onQueued)

  useEffect(() => { onMatchFoundRef.current = onMatchFound }, [onMatchFound])
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
  useEffect(() => { onQueuedRef.current = onQueued }, [onQueued])

  const enterSession = useCallback((match: MatchRow) => {
    matchRef.current = match
    sessionEndedByDecisionRef.current = false
    onMatchFoundRef.current(match)

    const channel = supabase.channel(`session:${match.id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: uuid },
      },
    })

    channel
      .on('broadcast', { event: 'mouse' }, ({ payload }) => {
        onMessageRef.current({ event: 'mouse', payload: payload as MouseData })
      })
      .on('broadcast', { event: 'game' }, ({ payload }) => {
        onMessageRef.current({ event: 'game', payload: payload as GameData })
      })
      .on('broadcast', { event: 'result' }, ({ payload }) => {
        // Mark session as ended by a decision so presence leave is ignored
        sessionEndedByDecisionRef.current = true
        onMessageRef.current({
          event: 'result',
          payload: payload as { result: 'SUCCESS' | 'RETRY' | 'FAILED_FINAL' },
        })
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        // Ignore presence leave when the session ended via a decision (not a real disconnect)
        if (key !== uuid && !sessionEndedByDecisionRef.current) {
          // Clean up partner's match state in DB (best-effort)
          supabase.rpc('handle_disconnect', { p_user_id: key })
          onMessageRef.current({ event: 'session_end', payload: { reason: 'disconnect' } })
        }
      })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ user_id: uuid })
      }
    })

    channelRef.current = channel
  }, [uuid])

  useEffect(() => {
    let changesChannel: RealtimeChannel | null = null
    let cancelled = false

    const init = async () => {
      // Join the queue — record joined_at so cleanup can do a conditional delete
      const joinedAt = new Date().toISOString()
      queueJoinedAtRef.current = joinedAt
      await supabase.from('queued_participants').upsert(
        { user_id: uuid, role, language, joined_at: joinedAt },
        { onConflict: 'user_id' }
      )

      if (cancelled) return
      onQueuedRef.current?.()

      // Try immediate match
      const { data: matchRows } = await supabase.rpc('try_match', {
        p_user_id: uuid,
        p_role: role,
      })

      if (cancelled) return

      if (matchRows && matchRows.length > 0) {
        enterSession(matchRows[0] as MatchRow)
        return
      }

      // No match yet — subscribe to matches table for this user
      changesChannel = supabase
        .channel(`queue:${uuid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: role === 'client'
              ? `client_id=eq.${uuid}`
              : `validator_id=eq.${uuid}`,
          },
          (payload) => {
            if (cancelled) return
            changesChannel?.unsubscribe()
            changesChannel = null
            enterSession(payload.new as MatchRow)
          }
        )
        .subscribe()
    }

    init()

    return () => {
      cancelled = true
      changesChannel?.unsubscribe()
      channelRef.current?.unsubscribe()
      channelRef.current = null
      // Conditionally remove from queue only if THIS exact join entry still exists.
      // Using joined_at prevents a stale async delete from removing a freshly re-joined entry
      // (race: cleanup fires after re-init has already upserted a new queue row).
      const myJoinedAt = queueJoinedAtRef.current
      if (myJoinedAt) {
        supabase.from('queued_participants')
          .delete()
          .eq('user_id', uuid)
          .eq('joined_at', myJoinedAt)
      }
    }
  }, [uuid, language, role, enterSession])

  const sendMouse = useCallback((data: MouseData) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'mouse',
      payload: data,
    })
  }, [])

  const sendGame = useCallback((data: GameData) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game',
      payload: data,
    })
  }, [])

  const sendDecision = useCallback(async (approved: boolean) => {
    const { data } = await supabase.rpc('record_decision', {
      p_validator_id: uuid,
      p_approved: approved,
    })

    if (!data) return

    const result = data as { result: 'SUCCESS' | 'RETRY' | 'FAILED_FINAL'; client_id: string }

    // Mark as ended by decision before any network ops (prevents false disconnect on this side)
    sessionEndedByDecisionRef.current = true

    // Broadcast result to client
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'result',
      payload: { result: result.result },
    })

    // Unsubscribe from session channel — session is over
    // (triggers presence leave on client side, but sessionEndedByDecisionRef guards against it)
    channelRef.current?.unsubscribe()
    channelRef.current = null
    matchRef.current = null

    // Notify validator page that the session ended (self: false skips self, so call directly)
    onMessageRef.current({ event: 'session_end', payload: { reason: 'decision' } })
  }, [uuid])

  return { sendMouse, sendGame, sendDecision, isConnected: true }
}

// UUID utilities (previously in useWebSocket.ts)
export function getOrCreateUuid(key: string): string {
  let id = localStorage.getItem(key)
  if (!id) {
    id = generateUUID()
    localStorage.setItem(key, id)
  }
  return id
}

function generateUUID(): string {
  let d = new Date().getTime()
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
