import { useState, useRef, useCallback } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.start()

      setIsRecording(true)
      return true
    } catch {
      return false
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setIsRecording(false)
  }, [])

  return { isRecording, startRecording, stopRecording }
}
