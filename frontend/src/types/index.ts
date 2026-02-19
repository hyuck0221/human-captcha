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
