import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

export default function ChatPanel({ messages, isTyping, onSend, appState }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const blocked = appState === 'listening' || appState === 'analyzing'

  return (
    <div className="chat">
      <div className="chat__messages">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && (
          <div className="typing">
            <div className="typing__bubble">
              <div className="typing__dot" />
              <div className="typing__dot" />
              <div className="typing__dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} className="chat__bottom" />
      </div>

      <ChatInput
        onSend={onSend}
        disabled={blocked}
        placeholder={blocked ? 'Finish your take first…' : 'Ask Orphy anything…'}
      />
    </div>
  )
}
