import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase, getOrCreateUuid } from '../hooks/useSupabase'
import { getLanguage, t } from '../i18n/translations'
import type { Language, ClientPhase, MatchRow, SessionBroadcast } from '../types'

interface ChatMessage {
  sender: string
  text: string
  me: boolean
}

export default function ClientPage() {
  const navigate = useNavigate()
  const lang = getLanguage() as Language
  const uuid = getOrCreateUuid('h2h_captcha_uuid')

  const [phase, setPhase] = useState<ClientPhase>('connecting')
  const [drawTopic, setDrawTopic] = useState('')
  const [validatorLang, setValidatorLang] = useState('')
  const [rpsInstruction, setRpsInstruction] = useState('')
  const [rpsDisabled, setRpsDisabled] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastDrawPoint = useRef<{ x: number; y: number } | null>(null)
  const lastMouseSend = useRef(0)
  const chatBoxRef = useRef<HTMLDivElement>(null)

  const parseTask = (taskData: string): { taskName: string; topic: string } => {
    if (taskData.startsWith('DRAWING:')) {
      const parts = taskData.split(':')
      return { taskName: 'DRAWING', topic: parts[1] ?? '' }
    }
    return { taskName: taskData, topic: '' }
  }

  const applyTask = useCallback((taskData: string) => {
    const { taskName, topic } = parseTask(taskData)
    if (taskName === 'MOUSE_TRACKING') setPhase('mouse')
    else if (taskName === 'DRAWING') {
      setDrawTopic(topic)
      setPhase('drawing')
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    } else if (taskName === 'RPS') {
      setPhase('rps')
      setRpsInstruction(t(lang, 'rps_wait'))
      setRpsDisabled(true)
    } else if (taskName === 'CHAT') {
      setPhase('chat')
    }
  }, [lang])

  const handleMatchFound = useCallback((match: MatchRow) => {
    setValidatorLang(t(lang, `lang_${match.validator_language ?? 'en'}` as Parameters<typeof t>[1]))
    applyTask(match.task_type)
  }, [lang, applyTask])

  const handleMessage = useCallback((event: SessionBroadcast) => {
    if (event.event === 'game') {
      const data = event.payload
      if (data.type === 'TASK_CHANGE') {
        applyTask(data.payload)
      } else if (data.type === 'CHAT') {
        setChatMessages((prev) => [...prev, { sender: 'Validator', text: data.payload, me: false }])
      } else if (data.type === 'RPS_CHALLENGE') {
        const move = data.payload
        const translatedMove = t(lang, move as Parameters<typeof t>[1])
        setRpsInstruction(t(lang, 'rps_win', { move: translatedMove }))
        setRpsDisabled(false)
      }
    } else if (event.event === 'result') {
      const result = event.payload.result
      if (result === 'SUCCESS') {
        setPhase('success')
      } else if (result === 'RETRY') {
        setPhase('retry')
        setTimeout(() => location.reload(), 2000)
      } else if (result === 'FAILED_FINAL') {
        setPhase('denied')
      }
    } else if (event.event === 'session_end') {
      alert(t(lang, 'partner_dc'))
      location.reload()
    }
  }, [lang, applyTask])

  const { sendMouse, sendGame } = useSupabase({
    uuid,
    language: lang,
    role: 'client',
    onMatchFound: handleMatchFound,
    onMessage: handleMessage,
    onQueued: () => setPhase('waiting'),
  })

  const sendMouseRef = useRef(sendMouse)
  useEffect(() => { sendMouseRef.current = sendMouse }, [sendMouse])

  // Global mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastMouseSend.current < 33) return
      lastMouseSend.current = now

      const relX = e.clientX / window.innerWidth
      const relY = e.clientY / window.innerHeight

      let cx = -1
      let cy = -1
      const canvas = canvasRef.current
      if (canvas && canvas.offsetParent !== null) {
        const rect = canvas.getBoundingClientRect()
        cx = (e.clientX - rect.left) / rect.width
        cy = (e.clientY - rect.top) / rect.height
      }

      sendMouseRef.current({
        x: relX, y: relY,
        cx, cy,
        isDown: isDrawingRef.current,
        w: window.innerWidth,
        h: window.innerHeight,
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    lastDrawPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastDrawPoint.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(lastDrawPoint.current.x, lastDrawPoint.current.y)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastDrawPoint.current = { x, y }
  }, [])

  const handleCanvasMouseUp = useCallback(() => {
    isDrawingRef.current = false
    lastDrawPoint.current = null
  }, [])

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight
    }
  }, [chatMessages])

  const sendRps = (choice: string) => {
    sendGame({ type: 'RPS', payload: choice })
    setRpsInstruction(t(lang, 'rps_sent', { move: t(lang, choice as Parameters<typeof t>[1]) }))
    setRpsDisabled(true)
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    sendGame({ type: 'CHAT', payload: chatInput })
    setChatMessages((prev) => [...prev, { sender: 'Me', text: chatInput, me: true }])
    setChatInput('')
  }

  const sendTyping = (text: string) => {
    sendGame({ type: 'CHAT_TYPING', payload: text })
  }

  const isGamePhase = ['mouse', 'drawing', 'rps', 'chat'].includes(phase)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-100">
            {t(lang, 'client_title')}
          </h1>
          <div className="mt-2">
            <StatusBadge phase={phase} lang={lang} />
          </div>
        </div>

        {/* Connecting / Waiting state */}
        {(phase === 'connecting' || phase === 'waiting') && (
          <div className="glass-card p-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
            </div>
            <p className="text-slate-400 text-sm">
              {phase === 'connecting' ? t(lang, 'connecting') : t(lang, 'waiting')}
            </p>
          </div>
        )}

        {/* Game Container */}
        {isGamePhase && (
          <div className="glass-card p-6 animate-slide-up">
            {/* Mission badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-full text-violet-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                {t(lang, 'mission')}{phase.toUpperCase()}
              </span>
              {validatorLang && (
                <span className="text-xs text-slate-500">
                  {t(lang, 'partner_lang')}{validatorLang}
                </span>
              )}
            </div>

            {/* Mouse Tracking */}
            {phase === 'mouse' && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🖱️</div>
                <p className="text-slate-300">Move your mouse around the screen</p>
                <p className="text-slate-500 text-sm mt-1">The validator is observing your movements</p>
              </div>
            )}

            {/* Drawing */}
            {phase === 'drawing' && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-amber-400 font-semibold text-center">
                  {t(lang, 'draw_topic')}<span className="text-white">{drawTopic}</span>
                </p>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={300}
                  className="rounded-lg border-2 border-slate-600 bg-white cursor-crosshair w-full max-w-[400px]"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
                <p className="text-xs text-slate-500">Draw on the canvas above</p>
              </div>
            )}

            {/* RPS */}
            {phase === 'rps' && (
              <div className="text-center py-4">
                <p className="text-yellow-400 text-sm mb-6">{rpsInstruction}</p>
                <div className="flex justify-center gap-4">
                  {[
                    { key: 'ROCK', emoji: '✊' },
                    { key: 'PAPER', emoji: '✋' },
                    { key: 'SCISSORS', emoji: '✌️' },
                  ].map(({ key, emoji }) => (
                    <button
                      key={key}
                      onClick={() => sendRps(key)}
                      disabled={rpsDisabled}
                      className="w-20 h-20 text-4xl rounded-2xl border-2 border-slate-600 bg-slate-800
                                 hover:border-violet-500 hover:bg-slate-700 transition-all duration-200
                                 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                                 disabled:hover:scale-100 disabled:hover:border-slate-600"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat */}
            {phase === 'chat' && (
              <div className="flex flex-col gap-3">
                <div
                  ref={chatBoxRef}
                  className="h-56 overflow-y-auto rounded-xl bg-slate-900/60 border border-slate-700/50 p-3 space-y-2"
                >
                  {chatMessages.length === 0 && (
                    <p className="text-slate-600 text-xs text-center mt-4">No messages yet...</p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.me ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-1.5 rounded-xl text-sm ${
                        msg.me
                          ? 'bg-violet-600/70 text-white'
                          : 'bg-slate-700/70 text-cyan-300'
                      }`}>
                        <span className="text-xs opacity-60 mr-1">{msg.sender}:</span>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    placeholder={t(lang, 'chat_placeholder')}
                    onChange={(e) => { setChatInput(e.target.value); sendTyping(e.target.value) }}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    className="flex-1 bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5
                               text-sm text-slate-200 placeholder-slate-500 outline-none
                               focus:border-violet-500/60 transition-colors"
                  />
                  <button onClick={sendChat} className="btn-primary px-5 py-2.5 text-sm">
                    {t(lang, 'send')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result states */}
        {phase === 'success' && (
          <ResultOverlay
            success
            title={t(lang, 'verified')}
            icon="✅"
            onBack={() => navigate('/')}
          />
        )}
        {phase === 'denied' && (
          <ResultOverlay
            title={t(lang, 'denied')}
            icon="🚫"
            onBack={() => navigate('/')}
          />
        )}
        {phase === 'retry' && (
          <div className="glass-card p-10 text-center">
            <div className="text-4xl mb-4">🔄</div>
            <p className="text-yellow-400 font-semibold">{t(lang, 'retry')}</p>
          </div>
        )}

        {/* Back button */}
        {phase !== 'connecting' && phase !== 'waiting' && !['success', 'denied', 'retry'].includes(phase) && (
          <button onClick={() => navigate('/')} className="mt-4 w-full btn-secondary text-sm py-2.5">
            ← Back to Home
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ phase, lang }: { phase: ClientPhase; lang: Language }) {
  const configs: Partial<Record<ClientPhase, { color: string; dot: string; label: string }>> = {
    connecting: { color: 'text-slate-400 bg-slate-800/60 border-slate-700/50', dot: 'bg-slate-400', label: t(lang, 'connecting') },
    waiting: { color: 'text-cyan-400 bg-cyan-900/30 border-cyan-700/40', dot: 'bg-cyan-400 animate-pulse', label: t(lang, 'connected') },
    mouse: { color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40', dot: 'bg-emerald-400 animate-pulse', label: t(lang, 'matched') },
    drawing: { color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40', dot: 'bg-emerald-400 animate-pulse', label: t(lang, 'matched') },
    rps: { color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40', dot: 'bg-emerald-400 animate-pulse', label: t(lang, 'matched') },
    chat: { color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40', dot: 'bg-emerald-400 animate-pulse', label: t(lang, 'matched') },
  }
  const config = configs[phase]
  if (!config) return null
  return (
    <span className={`status-badge border ${config.color}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

function ResultOverlay({ success = false, title, icon, onBack }: {
  success?: boolean
  title: string
  icon: string
  onBack: () => void
}) {
  return (
    <div className={`glass-card p-12 text-center animate-slide-up border ${
      success ? 'border-emerald-500/30' : 'border-rose-500/30'
    }`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className={`text-2xl font-bold mb-2 ${success ? 'text-emerald-400' : 'text-rose-400'}`}>
        {title}
      </h2>
      <button onClick={onBack} className="mt-6 btn-secondary text-sm">
        ← Back to Home
      </button>
    </div>
  )
}
