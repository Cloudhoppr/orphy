import { useState, useRef, useCallback } from 'react'

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
    <path
      d="M1.5 7.5L7.5 1.5M7.5 1.5L13.5 7.5M7.5 1.5V13.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)

  const submit = useCallback(() => {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
    ref.current?.focus()
    if (ref.current) {
      ref.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const onInput = (e) => {
    setValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 108) + 'px'
  }

  return (
    <div className="chat-input">
      <div className="chat-input__row">
        <textarea
          ref={ref}
          className="chat-input__field"
          value={value}
          onInput={onInput}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Chat message"
        />
        <button
          className="chat-input__send"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}
