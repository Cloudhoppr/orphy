export default function MessageBubble({ message }) {
  const time = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`msg msg--${message.role}`}>
      <div className="msg__bubble">{message.content}</div>
      <span className="msg__time">{time}</span>
    </div>
  )
}
