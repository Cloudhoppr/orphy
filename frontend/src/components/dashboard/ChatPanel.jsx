import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageSquare } from 'lucide-react'

const TYPE_CONFIG = {
  ai:   { label: 'Orphy',    accent: '#FF3B5C', bg: 'rgba(255,59,92,0.06)', border: 'rgba(255,59,92,0.12)' },
  user: { label: 'You',      accent: '#A1A1AA', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
}

function CoachMessage({ message }) {
  const cfg = TYPE_CONFIG[message.role]
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
      className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
    >
      {!isUser && (
        <div className="flex items-center gap-1.5 px-1">
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.accent }} />
          <span style={{ fontSize: 10.5, fontWeight: 600, color: cfg.accent, letterSpacing: '0.05em' }}>
            {cfg.label}
          </span>
        </div>
      )}
      <div
        style={{
          maxWidth: '88%',
          padding: '10px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          fontSize: 13.5,
          lineHeight: 1.65,
          color: '#e8e8e8',
          backdropFilter: 'blur(8px)',
        }}
      >
        {message.content}
      </div>
      <span style={{ fontSize: 10, color: '#404040', padding: '0 4px' }}>{time}</span>
    </motion.div>
  )
}

export default function ChatPanel({ messages, isTyping, onSend, appState }) {
  const [value, setValue] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const submit = () => {
    if (!value.trim()) return
    onSend(value.trim())
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const blocked = appState === 'listening' || appState === 'analyzing'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={13} color="#FF3B5C" />
          <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A1A1AA' }}>
            Coaching Feed
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map(msg => (
          <CoachMessage key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-1.5"
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF3B5C', marginTop: 12 }} />
              <div style={{
                padding: '10px 14px',
                borderRadius: '16px 16px 16px 4px',
                background: 'rgba(255,59,92,0.06)',
                border: '1px solid rgba(255,59,92,0.12)',
                display: 'flex', gap: 4, alignItems: 'center',
              }}>
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#505050',
                    animation: `wave-bar 1.2s ${d}s ease-in-out infinite`,
                    transformOrigin: 'center',
                  }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 14px 14px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(5,5,5,0.6)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
            }}
            placeholder={blocked ? 'Finish your take first…' : 'Ask Orphy anything…'}
            disabled={blocked}
            rows={1}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '10px 13px',
              fontSize: 13.5,
              fontFamily: 'inherit',
              color: '#fff',
              resize: 'none',
              outline: 'none',
              minHeight: 40,
              maxHeight: 100,
              lineHeight: 1.5,
              opacity: blocked ? 0.3 : 1,
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.14)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
          />
          <button
            onClick={submit}
            disabled={blocked || !value.trim()}
            style={{
              width: 40, height: 40, flexShrink: 0,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.07)',
              background: value.trim() && !blocked ? 'rgba(255,59,92,0.15)' : 'rgba(255,255,255,0.03)',
              color: value.trim() && !blocked ? '#FF3B5C' : '#404040',
              cursor: blocked || !value.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
