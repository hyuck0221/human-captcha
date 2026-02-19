import type { Language } from '../types'

interface Translations {
  // Home
  home_title: string
  home_subtitle: string
  btn_client: string
  btn_validator: string
  // Client
  client_title: string
  connecting: string
  connected: string
  waiting: string
  matched: string
  mission: string
  partner_lang: string
  draw_topic: string
  rps_wait: string
  rps_win: string
  rps_sent: string
  chat_placeholder: string
  send: string
  verified: string
  denied: string
  partner_dc: string
  retry: string
  // Validator
  validator_title: string
  observing: string
  task_control: string
  approve: string
  reject: string
  challenge: string
  chat_ph: string
  client_choice: string
  challenge_sent: string
  session_ended: string
  prompt_topic: string
  // Languages
  lang_en: string
  lang_ko: string
  lang_ja: string
  lang_zh: string
  lang_fr: string
  // RPS
  ROCK: string
  PAPER: string
  SCISSORS: string
}

const dict: Record<Language, Translations> = {
  en: {
    home_title: 'Human-to-Human Captcha',
    home_subtitle: 'Real-time verification by humans, for humans.',
    btn_client: 'I am a User',
    btn_validator: 'I am a Validator',
    client_title: 'Are you Human?',
    connecting: 'Connecting...',
    connected: 'Connected. Waiting for queue...',
    waiting: 'Waiting for a validator...',
    matched: 'Matched!',
    mission: 'Mission: ',
    partner_lang: 'Validator Language: ',
    draw_topic: 'Please draw: ',
    rps_wait: "Waiting for opponent's move...",
    rps_win: 'Opponent chose {move}. You must WIN!',
    rps_sent: 'Sent {move}. Waiting...',
    chat_placeholder: 'Type here...',
    send: 'Send',
    verified: 'Verified Human!',
    denied: 'Access Denied.',
    partner_dc: 'Partner disconnected.',
    retry: 'Retrying...',
    validator_title: 'Validator Console',
    observing: 'Observing Client...',
    task_control: 'Task Control',
    approve: 'Approve',
    reject: 'Reject',
    challenge: 'Challenge Client:',
    chat_ph: 'Say something...',
    client_choice: 'Client Chose: ',
    challenge_sent: 'Challenge Sent: ',
    session_ended: 'Session Ended: ',
    prompt_topic: 'Enter a topic for drawing (e.g., Apple, Car):',
    lang_en: 'English',
    lang_ko: 'Korean',
    lang_ja: 'Japanese',
    lang_zh: 'Chinese',
    lang_fr: 'French',
    ROCK: 'Rock',
    PAPER: 'Paper',
    SCISSORS: 'Scissors',
  },
  ko: {
    home_title: 'H2H 캡차 시스템',
    home_subtitle: '로봇이 아닌, 실제 사람이 검증하는 보안 솔루션',
    btn_client: '사용자로 참여 (인증하기)',
    btn_validator: '검증자로 참여 (감시하기)',
    client_title: '당신은 사람입니까?',
    connecting: '연결 중...',
    connected: '연결됨. 대기열 진입...',
    waiting: '검증자를 기다리는 중...',
    matched: '매칭 완료!',
    mission: '미션: ',
    partner_lang: '검증자 언어: ',
    draw_topic: '그려주세요: ',
    rps_wait: '상대방의 선택을 기다리는 중...',
    rps_win: '상대가 {move}를 냈습니다. 이겨보세요!',
    rps_sent: '{move} 제출. 대기 중...',
    chat_placeholder: '입력하세요...',
    send: '전송',
    verified: '인증 성공!',
    denied: '접속 거부.',
    partner_dc: '상대방 연결 끊김.',
    retry: '재시도 중...',
    validator_title: '검증자 콘솔',
    observing: '사용자 관찰 중...',
    task_control: '작업 제어',
    approve: '승인 (사람)',
    reject: '거절 (로봇)',
    challenge: '가위바위보 내기:',
    chat_ph: '메시지 입력...',
    client_choice: '사용자 선택: ',
    challenge_sent: '제출함: ',
    session_ended: '세션 종료: ',
    prompt_topic: '그리기 주제어를 입력하세요 (예: 사과, 자동차):',
    lang_en: '영어',
    lang_ko: '한국어',
    lang_ja: '일본어',
    lang_zh: '중국어',
    lang_fr: '프랑스어',
    ROCK: '바위',
    PAPER: '보',
    SCISSORS: '가위',
  },
  ja: {
    home_title: 'H2H キャプチャ',
    home_subtitle: '機械ではなく、人が直接検証するセキュリティ',
    btn_client: 'ユーザーとして参加',
    btn_validator: '検証者として参加',
    client_title: 'あなたは人間ですか？',
    connecting: '接続中...',
    connected: '接続済み。待機中...',
    waiting: '検証者を待っています...',
    matched: 'マッチしました！',
    mission: 'ミッション: ',
    partner_lang: '検証者の言語: ',
    draw_topic: '描いてください: ',
    rps_wait: '相手の手を待っています...',
    rps_win: '相手は {move} を出しました。勝ってください！',
    rps_sent: '{move} 送信。待機中...',
    chat_placeholder: '入力...',
    send: '送信',
    verified: '認証成功！',
    denied: 'アクセス拒否。',
    partner_dc: '相手が切断しました。',
    retry: '再試行中...',
    validator_title: '検証コンソール',
    observing: '観察中...',
    task_control: 'タスク制御',
    approve: '承認',
    reject: '拒否',
    challenge: 'じゃんけん:',
    chat_ph: '入力...',
    client_choice: 'クライアントの選択: ',
    challenge_sent: '送信済み: ',
    session_ended: 'セッション終了: ',
    prompt_topic: '描画のお題を入力してください（例：リンゴ、車）:',
    lang_en: '英語',
    lang_ko: '韓国語',
    lang_ja: '日本語',
    lang_zh: '中国語',
    lang_fr: 'フランス語',
    ROCK: 'グー',
    PAPER: 'パー',
    SCISSORS: 'チョキ',
  },
  zh: {
    home_title: '人与人验证码',
    home_subtitle: '由真人而非机器进行实时验证',
    btn_client: '我是用户',
    btn_validator: '我是验证者',
    client_title: '你是人类吗？',
    connecting: '连接中...',
    connected: '已连接。等待队列...',
    waiting: '等待验证者...',
    matched: '匹配成功！',
    mission: '任务: ',
    partner_lang: '验证者语言: ',
    draw_topic: '请画: ',
    rps_wait: '等待对手...',
    rps_win: '对手出了 {move}。你必须赢！',
    rps_sent: '已发送 {move}。等待中...',
    chat_placeholder: '输入...',
    send: '发送',
    verified: '验证通过！',
    denied: '拒绝访问。',
    partner_dc: '对方已断开。',
    retry: '重试中...',
    validator_title: '验证控制台',
    observing: '观察中...',
    task_control: '任务控制',
    approve: '批准',
    reject: '拒绝',
    challenge: '挑战用户:',
    chat_ph: '输入...',
    client_choice: '用户选择: ',
    challenge_sent: '已发送: ',
    session_ended: '会话结束: ',
    prompt_topic: '请输入绘画主题（例如：苹果，汽车）:',
    lang_en: '英语',
    lang_ko: '韩语',
    lang_ja: '日语',
    lang_zh: '中文',
    lang_fr: '法语',
    ROCK: '石头',
    PAPER: '布',
    SCISSORS: '剪刀',
  },
  fr: {
    home_title: 'Captcha H2H',
    home_subtitle: 'Vérification en temps réel par des humains.',
    btn_client: 'Je suis un utilisateur',
    btn_validator: 'Je suis un validateur',
    client_title: 'Êtes-vous humain ?',
    connecting: 'Connexion...',
    connected: 'Connecté. En attente...',
    waiting: 'En attente d\'un validateur...',
    matched: 'Correspondance trouvée !',
    mission: 'Mission : ',
    partner_lang: 'Langue du validateur : ',
    draw_topic: 'Dessinez : ',
    rps_wait: "En attente de l'adversaire...",
    rps_win: "L'adversaire a choisi {move}. Gagnez !",
    rps_sent: '{move} envoyé. En attente...',
    chat_placeholder: 'Tapez ici...',
    send: 'Envoyer',
    verified: 'Vérifié Humain !',
    denied: 'Accès refusé.',
    partner_dc: 'Partenaire déconnecté.',
    retry: 'Nouvel essai...',
    validator_title: 'Console de Validation',
    observing: 'Observation...',
    task_control: 'Contrôle des Tâches',
    approve: 'Approuver',
    reject: 'Rejeter',
    challenge: 'Défier le client:',
    chat_ph: 'Dire quelque chose...',
    client_choice: 'Choix du client : ',
    challenge_sent: 'Défi envoyé : ',
    session_ended: 'Session terminée : ',
    prompt_topic: 'Entrez un sujet de dessin (ex: Pomme, Voiture):',
    lang_en: 'Anglais',
    lang_ko: 'Coréen',
    lang_ja: 'Japonais',
    lang_zh: 'Chinois',
    lang_fr: 'Français',
    ROCK: 'Pierre',
    PAPER: 'Feuille',
    SCISSORS: 'Ciseaux',
  },
}

export function getLanguage(): Language {
  const stored = localStorage.getItem('h2h_language') as Language | null
  return stored && dict[stored] ? stored : 'en'
}

export function setLanguage(lang: Language) {
  localStorage.setItem('h2h_language', lang)
}

export function t(lang: Language, key: keyof Translations, params?: Record<string, string>): string {
  let text = dict[lang]?.[key] ?? dict['en'][key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v)
    }
  }
  return text
}

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'fr', label: 'Français' },
]
