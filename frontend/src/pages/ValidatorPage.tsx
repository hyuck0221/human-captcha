import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket, getOrCreateUuid } from '../hooks/useWebSocket'
import { getLanguage, t } from '../i18n/translations'
import type { Language, ValidatorPhase, MatchInfo, MouseData, GameData, TaskType } from '../types'

interface ChatMessage {
  sender: string
  text: string
  me: boolean
}

export default function ValidatorPage() {
  const navigate = useNavigate()
  const lang = getLanguage() as Language
  const uuid = getOrCreateUuid('h2h_captcha_uuid_validator')

  const [phase, setPhase] = useState<ValidatorPhase>('connecting')
  const [currentTask, setCurrentTask] = useState<TaskType>('MOUSE_TRACKING')
  const [clientLang, setClientLang] = useState('')
  const [clientRes, setClientRes] = useState('')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [showPointer, setShowPointer] = useState(false)
  const [rpsClientChoice, setRpsClientChoice] = useState('Waiting...')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatTyping, setChatTyping] = useState('')
  const [chatInput, setChatInput] = useState('')

  const mirrorCanvasRef = useRef<HTMLCanvasElement>(null)
  const screenMirrorRef = useRef<HTMLDivElement>(null)
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const sendRef = useRef<((dest: string, body: object) => void) | null>(null)
  const prevDrawPoint = useRef<{ x: number; y: number } | null>(null)

  const parseTask = (taskData: string): { taskName: TaskType; topic: string } => {
    if (taskData.startsWith('DRAWING:')) {
      return { taskName: 'DRAWING', topic: taskData.split(':')[1] ?? '' }
    }
    return { taskName: taskData as TaskType, topic: '' }
  }

  const applyTask = useCallback((taskData: string) => {
    const { taskName } = parseTask(taskData)
    setCurrentTask(taskName)
    prevDrawPoint.current = null
    if (taskName === 'DRAWING') {
      const canvas = mirrorCanvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    if (taskName === 'RPS') setRpsClientChoice('Waiting...')
    if (taskName === 'CHAT') setChatMessages([])
  }, [])

  const drawMouseOnMirror = useCallback((pos: MouseData) => {
    // Update client resolution info
    if (pos.w && pos.h) {
      setClientRes(`${pos.w} × ${pos.h}`)
    }

    // Update ghost pointer position (0-1 normalized → percentage)
    setMousePos({ x: pos.x, y: pos.y })
    setShowPointer(true)

    // Draw on mirror canvas
    if (currentTask === 'DRAWING' && pos.isDown && pos.cx >= 0 && pos.cx <= 1 && pos.cy >= 0 && pos.cy <= 1) {
      const canvas = mirrorCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tx = pos.cx * canvas.width
      const ty = pos.cy * canvas.height

      if (prevDrawPoint.current) {
        ctx.beginPath()
        ctx.moveTo(prevDrawPoint.current.x, prevDrawPoint.current.y)
        ctx.lineTo(tx, ty)
        ctx.strokeStyle = '#1a1a1a'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      prevDrawPoint.current = { x: tx, y: ty }
    } else {
      prevDrawPoint.current = null
    }
  }, [currentTask])

  const handleMessage = useCallback((body: string) => {
    try {
      const json = JSON.parse(body) as MatchInfo | MouseData | GameData
      if ('taskType' in json) {
        const match = json as MatchInfo
        setClientLang(t(lang, `lang_${match.clientLanguage ?? 'en'}` as Parameters<typeof t>[1]))
        setPhase('session')
        applyTask(match.taskType)
      } else if ('x' in json && 'y' in json && 'w' in json) {
        drawMouseOnMirror(json as MouseData)
      } else if ('type' in json) {
        const data = json as GameData
        if (data.type === 'RPS') {
          setRpsClientChoice(t(lang, 'client_choice') + t(lang, data.payload as Parameters<typeof t>[1]))
        } else if (data.type === 'CHAT') {
          setChatMessages((prev) => [...prev, { sender: 'Client', text: data.payload, me: false }])
          setChatTyping('')
        } else if (data.type === 'CHAT_TYPING') {
          setChatTyping(data.payload)
        }
      }
    } catch {
      // 텍스트 메시지 처리 (비-JSON)
      const text = body.trim()
      if (text === 'Session Ended' || text === 'Partner disconnected') {
        // 세션 종료 → 리로드 후 재접속 시 /app/join/validator로 큐에 재등록됨
        setPhase('waiting')
        setTimeout(() => location.reload(), 3000)
      }
      // 그 외 알 수 없는 메시지는 무시
    }
  }, [lang, applyTask, drawMouseOnMirror])

  const { send } = useWebSocket({
    uuid,
    language: lang,
    role: 'validator',
    onMessage: handleMessage,
    onConnect: () => setPhase('waiting'),
  })

  useEffect(() => { sendRef.current = send }, [send])

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight
    }
  }, [chatMessages])

  const changeTask = (taskName: string) => {
    let payload = taskName
    if (taskName === 'DRAWING') {
      const topic = prompt(t(lang, 'prompt_topic'), 'Apple')
      if (!topic) return
      payload = `DRAWING:${topic}`
    }
    send('/app/game', { type: 'TASK_CHANGE', payload })
    applyTask(payload)
  }

  const sendRpsChallenge = (move: string) => {
    send('/app/game', { type: 'RPS_CHALLENGE', payload: move })
    setRpsClientChoice(t(lang, 'challenge_sent') + t(lang, move as Parameters<typeof t>[1]))
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    send('/app/game', { type: 'CHAT', payload: chatInput })
    setChatMessages((prev) => [...prev, { sender: 'Me', text: chatInput, me: true }])
    setChatInput('')
  }

  const sendDecision = (approved: boolean) => {
    send('/app/decision', { approved })
    setPhase('waiting')
  }

  return (
    <div className="min-h-screen flex flex-col p-4 relative">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-100">{t(lang, 'validator_title')}</h1>
        </div>
        <ConnectionStatus phase={phase} lang={lang} />
      </div>

      {/* Connecting / Waiting */}
      {(phase === 'connecting' || phase === 'waiting') && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="glass-card p-12 text-center max-w-sm">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin" />
            </div>
            <p className="text-slate-400">
              {phase === 'connecting' ? t(lang, 'connecting') : t(lang, 'connected')}
            </p>
          </div>
        </div>
      )}

      {/* Main Session Interface */}
      {phase === 'session' && (
        <div className="flex-1 flex gap-4 max-w-7xl mx-auto w-full animate-fade-in">

          {/* Left: Client View */}
          <div className="flex-1 min-w-0">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Live Feed
                  {clientLang && <span className="ml-2 text-cyan-400 normal-case font-normal">({clientLang})</span>}
                </span>
              </div>
              {clientRes && (
                <span className="text-xs text-slate-600 font-mono">{clientRes}</span>
              )}
            </div>

            {/* Screen mirror container */}
            <div className="glass-card overflow-hidden" style={{ aspectRatio: '16/10' }}>
              <div
                ref={screenMirrorRef}
                className="relative w-full h-full bg-slate-950 flex items-center justify-center"
              >
                {/* Ghost Pointer */}
                {showPointer && (
                  <div
                    className="absolute w-4 h-4 pointer-events-none z-50"
                    style={{
                      left: `${mousePos.x * 100}%`,
                      top: `${mousePos.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="w-4 h-4 bg-red-500/80 rounded-full border-2 border-white shadow-lg" />
                  </div>
                )}

                {/* Task-specific mirror content */}
                {currentTask === 'MOUSE_TRACKING' && (
                  <div className="text-center select-none">
                    <div className="text-3xl mb-2 opacity-20">🖱️</div>
                    <p className="text-slate-700 text-xs">Mouse Tracking Active</p>
                  </div>
                )}

                {currentTask === 'DRAWING' && (
                  <div className="flex flex-col items-center justify-center h-full p-4">
                    <canvas
                      ref={mirrorCanvasRef}
                      width={400}
                      height={300}
                      className="rounded bg-white border border-slate-600 pointer-events-none"
                      style={{ maxWidth: '90%', maxHeight: '80%' }}
                    />
                  </div>
                )}

                {currentTask === 'RPS' && (
                  <div className="text-center select-none">
                    <div className="text-5xl mb-3 space-x-2">
                      <span className="opacity-30">✊</span>
                      <span className="opacity-30">✋</span>
                      <span className="opacity-30">✌️</span>
                    </div>
                    <p className="text-slate-400 text-sm">{rpsClientChoice}</p>
                  </div>
                )}

                {currentTask === 'CHAT' && (
                  <div className="w-full h-full p-4 flex flex-col gap-2">
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.me ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] px-2.5 py-1 rounded-lg text-xs ${
                            msg.me ? 'bg-violet-600/70 text-white' : 'bg-slate-700/70 text-cyan-300'
                          }`}>
                            <span className="opacity-60 mr-1">{msg.sender}:</span>{msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    {chatTyping && (
                      <div className="text-xs text-cyan-500/70 italic px-1">
                        Typing: {chatTyping}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Controls Panel */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3">

            {/* Task Control */}
            <div className="glass-card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {t(lang, 'task_control')}
              </h3>
              <div className="space-y-2">
                <TaskButton
                  label="✏️ Drawing"
                  active={currentTask === 'DRAWING'}
                  onClick={() => changeTask('DRAWING')}
                />
                <TaskButton
                  label="👊 Rock Paper Scissors"
                  active={currentTask === 'RPS'}
                  onClick={() => changeTask('RPS')}
                />
                <TaskButton
                  label="💬 Chat"
                  active={currentTask === 'CHAT'}
                  onClick={() => changeTask('CHAT')}
                />
              </div>
            </div>

            {/* RPS Controls */}
            {currentTask === 'RPS' && (
              <div className="glass-card p-4 animate-fade-in">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  {t(lang, 'challenge')}
                </p>
                <div className="flex gap-2 justify-center">
                  {[
                    { key: 'ROCK', emoji: '✊' },
                    { key: 'PAPER', emoji: '✋' },
                    { key: 'SCISSORS', emoji: '✌️' },
                  ].map(({ key, emoji }) => (
                    <button
                      key={key}
                      onClick={() => sendRpsChallenge(key)}
                      className="flex-1 py-3 text-2xl rounded-xl border border-slate-600 bg-slate-800
                                 hover:border-yellow-500/60 hover:bg-slate-700 transition-all duration-200
                                 hover:scale-105 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Controls */}
            {currentTask === 'CHAT' && (
              <div className="glass-card p-4 animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    placeholder={t(lang, 'chat_ph')}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    className="flex-1 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2
                               text-sm text-slate-200 placeholder-slate-500 outline-none
                               focus:border-violet-500/60 transition-colors"
                  />
                  <button onClick={sendChat} className="btn-primary px-4 py-2 text-sm">
                    {t(lang, 'send')}
                  </button>
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Decision Buttons */}
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
                Verdict
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => sendDecision(true)}
                  className="btn-success py-4 text-sm flex flex-col items-center gap-1"
                >
                  <span className="text-xl">✅</span>
                  {t(lang, 'approve')}
                </button>
                <button
                  onClick={() => sendDecision(false)}
                  className="btn-danger py-4 text-sm flex flex-col items-center gap-1"
                >
                  <span className="text-xl">🚫</span>
                  {t(lang, 'reject')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ConnectionStatus({ phase, lang }: { phase: ValidatorPhase; lang: Language }) {
  const configs: Record<ValidatorPhase, { color: string; dot: string; label: string }> = {
    connecting: { color: 'text-slate-400 bg-slate-800/60 border-slate-700/50', dot: 'bg-slate-400', label: t(lang, 'connecting') },
    waiting: { color: 'text-cyan-400 bg-cyan-900/30 border-cyan-700/40', dot: 'bg-cyan-400 animate-pulse', label: t(lang, 'connected') },
    session: { color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40', dot: 'bg-emerald-400 animate-pulse', label: t(lang, 'observing') },
  }
  const config = configs[phase]
  return (
    <span className={`status-badge border ${config.color}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

function TaskButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200
        border ${active
          ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
          : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 hover:border-slate-600/40'
        }`}
    >
      {label}
      {active && <span className="float-right text-violet-400">●</span>}
    </button>
  )
}
