import { useState, useCallback, useRef } from 'react'

const RESPONSES = [
  "Pitch accuracy improves fastest through ear training. Match your voice to a sustained piano reference before each phrase — your brain needs a clear target.",
  "Breath support is everything. Place a hand on your stomach — it should expand on the inhale. Shoulder rises mean chest-breathing, which limits pitch control.",
  "For timing drift, slow the song to 70% with a pitch-preserving app, nail it, then increase 5% per session. Rhythmic internalization carries forward.",
  "Vowel shaping significantly affects pitch. 'Ah' is easier to tune than 'ee'. If a note feels flat, try opening the mouth shape slightly and re-sing.",
  "Recording yourself is the fastest feedback loop. Sing a phrase, play it back immediately. The gap between imagined and actual closes fast with listening.",
  "Warm up resonators before full voice. Five minutes of quiet humming on a single note engages the right muscles without fatiguing the voice.",
  "If your pitch trends flat, you may be running out of breath at phrase ends. Start phrases with more air than you think you need.",
]

let id = 2

export function useOrphyChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      content: "Hi, I'm Orphy — your AI vocal coach. Hit the orb to start a take, or ask me anything about your voice.",
      timestamp: new Date(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const timer = useRef(null)

  const add = useCallback((role, content) => {
    const m = { id: ++id, role, content, timestamp: new Date() }
    setMessages(p => [...p, m])
  }, [])

  const addAIMessage = useCallback((content) => add('ai', content), [add])

  const sendMessage = useCallback((text) => {
    if (!text.trim()) return
    add('user', text.trim())
    clearTimeout(timer.current)
    setIsTyping(true)
    timer.current = setTimeout(() => {
      setIsTyping(false)
      add('ai', RESPONSES[Math.floor(Math.random() * RESPONSES.length)])
    }, 1000 + Math.random() * 900)
  }, [add])

  return { messages, isTyping, sendMessage, addAIMessage }
}
