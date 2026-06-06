import { useState, useCallback }  from 'react'
import DashboardNav  from '../components/dashboard/DashboardNav'
import ChatPanel     from '../components/dashboard/ChatPanel'
import VoiceOrb      from '../components/dashboard/VoiceOrb'
import AnalysisPanel from '../components/dashboard/AnalysisPanel'
import { useOrphyChat }    from '../hooks/useOrphyChat'
import { useAudioRecorder } from '../hooks/useAudioRecorder'

const PLACEHOLDER_FEEDBACK = {
  summary: 'Pitch ran 65 cents flat on average. Timing drifted up to 200 ms on chorus phrases.',
  narration: 'Your pitch was running about 65 cents flat across the take, placing most notes nearly a semitone below target. Timing drifted by 151 milliseconds on average, making phrases sound late. The foundation is solid — focus on breath support before each phrase.',
  fixes: [
    'Practice the opening phrase with a reference note before singing.',
    'Compare your onset timing to the melody on the chorus specifically.',
    'Work on diaphragmatic support to stabilize pitch at phrase endings.',
  ],
  metrics: {
    pitch:   { score: 62, label: 'Pitch Accuracy' },
    rhythm:  { score: 74, label: 'Rhythm' },
    breath:  { score: 58, label: 'Breath Control' },
    confidence: { score: 70, label: 'Confidence' },
    overall: 66,
  },
}

const GOOD_FEEDBACK = {
  summary: 'Excellent take — pitch within 8 cents on average, timing tight at 22 ms.',
  narration: 'Fantastic improvement. You reduced pitch error from 65 to 8 cents and matched all 8 reference notes. Timing tightened to 22 milliseconds. This performance is close to demo quality.',
  fixes: [
    'Note 5 drifted 15 cents flat — lift it slightly on the next take.',
    'Sustain the 22 ms timing discipline through longer phrases.',
    'Continue targeting 8 cents or fewer average pitch error.',
  ],
  metrics: {
    pitch:   { score: 88, label: 'Pitch Accuracy' },
    rhythm:  { score: 91, label: 'Rhythm' },
    breath:  { score: 83, label: 'Breath Control' },
    confidence: { score: 87, label: 'Confidence' },
    overall: 87,
  },
}

export default function Dashboard() {
  const [appState, setAppState] = useState('idle')
  const [feedback, setFeedback] = useState(null)
  const [takeCount, setTakeCount] = useState(0)

  const { messages, isTyping, sendMessage, addAIMessage } = useOrphyChat()
  const { startRecording, stopRecording } = useAudioRecorder()

  const handleStart = useCallback(async () => {
    const ok = await startRecording()
    if (!ok) {
      addAIMessage("I need microphone access to hear you sing. Please allow it in your browser settings.")
      return
    }
    setAppState('listening')
  }, [startRecording, addAIMessage])

  const handleStop = useCallback(() => {
    try { stopRecording() } catch (_) { /* mic may already be released */ }
    setAppState('analyzing')

    setTimeout(() => {
      const f = takeCount === 0 ? PLACEHOLDER_FEEDBACK : GOOD_FEEDBACK
      setTakeCount(n => n + 1)
      setAppState('responding')
      setFeedback(f)
      addAIMessage(`${f.summary} I've broken down the details in the analysis panel.`)
    }, 3000)
  }, [stopRecording, addAIMessage, takeCount])

  const handleReset = useCallback(() => {
    setAppState('idle')
    setFeedback(null)
  }, [])

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#050505', overflow: 'hidden' }}>
      <DashboardNav appState={appState} />

      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 60 }}>
        {/* Left: Chat */}
        <div className="flex flex-col border-r" style={{
          width: 300, minWidth: 280, flexShrink: 0,
          borderColor: 'rgba(255,255,255,0.06)',
          background: '#050505',
        }}>
          <ChatPanel
            messages={messages}
            isTyping={isTyping}
            onSend={sendMessage}
            appState={appState}
          />
        </div>

        {/* Center: Voice Orb */}
        <div className="flex-1 flex flex-col items-center justify-center relative"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,59,92,0.04) 0%, transparent 70%)' }}>
          <VoiceOrb
            appState={appState}
            onStart={handleStart}
            onStop={handleStop}
            onReset={handleReset}
          />
        </div>

        {/* Right: Analysis */}
        <div className="flex flex-col border-l overflow-y-auto" style={{
          width: 320, minWidth: 300, flexShrink: 0,
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <AnalysisPanel feedback={feedback} appState={appState} />
        </div>
      </div>
    </div>
  )
}
