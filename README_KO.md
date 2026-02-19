<p align="center">
  <a href="README.md">English</a> |
  <a href="README_KO.md">한국어</a> |
  <a href="README_JA.md">日本語</a> |
  <a href="README_ZH.md">中文</a> |
  <a href="README_FR.md">Français</a>
</p>

# Human-to-Human CAPTCHA (H2H-CAPTCHA)

> **"기계가 아닌 사람이 직접 검증하는 실시간 캡차 시스템"**

H2H-CAPTCHA는 기존의 자동화된 튜링 테스트(신호등 찾기 등)를 실시간 인간 상호작용으로 대체하는 혁신적인 보안 솔루션입니다. 사용자("Client")는 실제 사람 검증자("Validator")와 매칭되어 대화하거나 게임을 하며 자신이 사람임을 증명합니다.

---

## 🏗 시스템 아키텍처

별도의 백엔드 서버 없이 **React + Supabase**만으로 구동됩니다.

### 프론트엔드 (React + TypeScript + Vite)
- **Supabase Realtime Broadcast**: 마우스 데이터를 초당 최대 40회, DB 저장 없이 고속 전송.
- **Supabase Presence**: 상대방 연결 끊김을 실시간으로 감지.
- **Postgres Changes**: 매칭이 생성되는 순간 대기 중인 유저에게 즉시 알림.

### 데이터베이스 & 실시간 (Supabase + PostgreSQL)
- **`queued_participants`** 테이블: Client/Validator 대기열 관리.
- **`matches`** 테이블: 진행 중 및 완료된 매칭 기록.
- **`client_states`** 테이블: Client별 실패 횟수 및 블랙리스트 관리.
- **`try_match()`** RPC: `FOR UPDATE SKIP LOCKED`를 사용한 원자적 1:1 매칭.
- **`record_decision()`** RPC: 승인/거부 판정 처리 및 실패 횟수 업데이트.
- **`handle_disconnect()`** RPC: 연결 끊김 시 대기열 및 진행 중 매칭 정리.

### 채널 전략
```
queued_participants  → Postgres Changes  (매칭 대기)
session:{match_id}   → Broadcast         (마우스 / 게임 / 결과 이벤트)
session:{match_id}   → Presence          (연결 끊김 감지)
```

---

## 🎮 인터랙티브 챌린지

Validator가 제어하는 네 가지 검증 모드를 지원합니다:

1. **🖱️ 마우스 트래킹 (수동적 검증)**
   - Validator가 Client의 자연스러운 마우스 움직임을 관찰합니다.
   - 목표: 매크로 특유의 직선 이동이나 순간 이동을 감지.
   - 기술: Realtime Broadcast 30fps (DB 저장 없음).

2. **✏️ 그림 그리기 (능동적 검증)**
   - Validator가 주제어(예: "사과")를 주면 Client가 캔버스에 그립니다.
   - 목표: 사람의 창의성과 운동 제어 능력 확인.
   - 기술: 전역 좌표 + 캔버스 좌표 이중 전송.

3. **👊 가위바위보 (반응 속도 검증)**
   - Validator가 패(예: "바위")를 내면 Client는 이기는 패("보")를 냅니다.
   - 목표: 규칙 이해 능력과 인지 반응 테스트.

4. **💬 실시간 채팅 (튜링 테스트)**
   - "입력 중..." 표시와 함께 자유 형식의 텍스트 대화.
   - 목표: 고도화된 언어 상호작용을 통한 최종 검증.

---

## 🚀 시작하기

### 필수 조건
- **Node.js** 18+
- **Supabase** 프로젝트 ([supabase.com](https://supabase.com))

### 1. 데이터베이스 설정

Supabase SQL 에디터에서 마이그레이션을 실행합니다:

```bash
# 파일: supabase/migrations/001_h2h_captcha.sql
```

이후 Supabase 대시보드 → Database → Replication에서 `matches` 테이블 Realtime을 활성화합니다.

### 2. 환경 변수 설정

```env
# .env.local
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Supabase 대시보드 → Project Settings → API에서 URL과 anon key를 확인할 수 있습니다.

### 3. 설치 및 실행

```bash
npm install
npm run dev
```

`http://localhost:5173`에 접속합니다.

### 사용 방법
1. **탭 1**: "사용자로 참여 (Client)"를 선택합니다.
2. **탭 2**: "검증자로 참여 (Validator)"를 선택합니다.
3. 즉시 매칭이 완료되며, Validator는 화면을 지켜보며 미션을 부여할 수 있습니다.

---

## 🛡️ 보안 및 개인정보
- **UUID 기반 라우팅**: `localStorage`에 저장된 UUID로 재접속 후에도 동일한 세션 유지.
- **철저한 고립**: Client끼리는 절대 통신할 수 없습니다.
- **Validator 블랙리스트**: 같은 Validator와 재매칭되지 않습니다 (`client_states`에서 관리).
- **실패 횟수 추적**: 연속 3회 거부 시 영구 차단.
- **Row Level Security**: 모든 테이블에 RLS 적용, 민감한 작업은 `SECURITY DEFINER` 함수에서만 수행.

---

## 🗂 프로젝트 구조

```
├── src/
│   ├── hooks/
│   │   └── useSupabase.ts     # 메인 훅 (매칭 + broadcast + presence)
│   ├── lib/
│   │   └── supabase.ts        # Supabase 클라이언트 싱글톤
│   ├── pages/
│   │   ├── ClientPage.tsx
│   │   └── ValidatorPage.tsx
│   ├── types/
│   │   └── index.ts           # MatchRow, SessionBroadcast 등
│   └── i18n/
│       └── translations.ts    # 5개 언어 지원
├── supabase/
│   └── migrations/
│       └── 001_h2h_captcha.sql
├── .env.local                 # Supabase 인증 정보 (gitignore)
└── vite.config.ts
```

---

© 2025 H2H Captcha Project.
