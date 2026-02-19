import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLanguage, setLanguage, t, LANGUAGES } from '../i18n/translations'
import type { Language } from '../types'

export default function HomePage() {
  const [lang, setLang] = useState<Language>(getLanguage())
  const navigate = useNavigate()

  const handleLangChange = (newLang: Language) => {
    setLang(newLang)
    setLanguage(newLang)
  }

  const handleNavigate = (path: '/client' | '/validator') => {
    if (path === '/client') {
      localStorage.removeItem('h2h_captcha_uuid')
    }
    navigate(path)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="glass-card p-8 shadow-2xl shadow-black/50">

          {/* Logo + Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 mb-4 shadow-lg shadow-violet-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              H2H Captcha
            </h1>
            <p className="mt-2 text-slate-400 text-sm leading-relaxed">
              {t(lang, 'home_subtitle')}
            </p>
          </div>

          {/* Language Selector */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
              Language
            </label>
            <div className="relative">
              <select
                value={lang}
                onChange={(e) => handleLangChange(e.target.value as Language)}
                className="w-full appearance-none bg-slate-800/60 border border-slate-700/60 text-slate-200
                           rounded-xl px-4 py-2.5 text-sm cursor-pointer outline-none
                           hover:border-violet-500/50 focus:border-violet-500 transition-colors"
              >
                {LANGUAGES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleNavigate('/client')}
              className="w-full btn-primary py-4 text-base flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t(lang, 'btn_client')}
            </button>

            <button
              onClick={() => handleNavigate('/validator')}
              className="w-full btn-secondary py-4 text-base flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t(lang, 'btn_validator')}
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-6">
            Human-to-Human Verification System
          </p>
        </div>
      </div>
    </div>
  )
}
