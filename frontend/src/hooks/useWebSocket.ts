import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

interface UseWebSocketOptions {
  uuid: string
  language: string
  role: 'client' | 'validator'
  onMessage: (body: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useWebSocket({
  uuid,
  language,
  role,
  onMessage,
  onConnect,
  onDisconnect,
}: UseWebSocketOptions) {
  const stompRef = useRef<Client | null>(null)
  const onMessageRef = useRef(onMessage)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)

  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
  useEffect(() => { onConnectRef.current = onConnect }, [onConnect])
  useEffect(() => { onDisconnectRef.current = onDisconnect }, [onDisconnect])

  useEffect(() => {
    const stomp = new Client({
      webSocketFactory: () => new SockJS('/ws-captcha') as unknown as WebSocket,
      reconnectDelay: 3000,
      onConnect: () => {
        stomp.subscribe(`/topic/private.${uuid}`, (msg) => {
          onMessageRef.current(msg.body)
        })
        stomp.publish({
          destination: `/app/join/${role}`,
          body: JSON.stringify({ uuid, language }),
        })
        onConnectRef.current?.()
      },
      onDisconnect: () => {
        onDisconnectRef.current?.()
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame)
      },
    })

    stomp.activate()
    stompRef.current = stomp

    return () => {
      stomp.deactivate()
    }
  }, [uuid, language, role])

  const send = useCallback((destination: string, body: object) => {
    stompRef.current?.publish({
      destination,
      body: JSON.stringify(body),
    })
  }, [])

  return { send }
}

// UUID utilities
export function getOrCreateUuid(key: string): string {
  let uuid = localStorage.getItem(key)
  if (!uuid) {
    uuid = generateUUID()
    localStorage.setItem(key, uuid)
  }
  return uuid
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
