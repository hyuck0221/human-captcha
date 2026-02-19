export interface MatchInfo {
  taskType: string
  validatorLanguage?: string
  clientLanguage?: string
}

export interface MouseData {
  x: number
  y: number
  cx: number
  cy: number
  isDown: boolean
  w: number
  h: number
}

export interface GameData {
  type: string
  payload: string
}

export interface JoinRequest {
  uuid: string
  language: string
}

export interface Decision {
  approved: boolean
}

export type Language = 'en' | 'ko' | 'ja' | 'zh' | 'fr'

export type ClientPhase =
  | 'connecting'
  | 'waiting'
  | 'mouse'
  | 'drawing'
  | 'rps'
  | 'chat'
  | 'success'
  | 'denied'
  | 'retry'

export type ValidatorPhase = 'connecting' | 'waiting' | 'session'

export type TaskType = 'MOUSE_TRACKING' | 'DRAWING' | 'RPS' | 'CHAT'

// Supabase: matches table row shape
export interface MatchRow {
  id: string
  client_id: string
  validator_id: string
  client_language: string
  validator_language: string
  task_type: TaskType
  status: string
  started_at: string
  ended_at: string | null
}

// Supabase: typed broadcast events on session:{match_id} channel
export type SessionBroadcast =
  | { event: 'mouse'; payload: MouseData }
  | { event: 'game'; payload: GameData }
  | { event: 'result'; payload: { result: 'SUCCESS' | 'RETRY' | 'FAILED_FINAL' } }
  | { event: 'session_end'; payload: { reason: 'decision' | 'disconnect' } }
