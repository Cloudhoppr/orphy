import { useRef, useEffect } from 'react'

const BARS = 38

export default function WaveformVisualizer() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const t0Ref     = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const setSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width  * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    setSize()

    t0Ref.current = performance.now()

    const draw = (now) => {
      const t  = (now - t0Ref.current) / 1000
      const W  = canvas.offsetWidth
      const H  = canvas.offsetHeight
      const gw = 2
      const bw = (W - gw * (BARS - 1)) / BARS

      ctx.clearRect(0, 0, W, H)

      for (let i = 0; i < BARS; i++) {
        // multi-harmonic wave for an organic singing-like motion
        const p = t * 2.2 + i * 0.38
        const v =
          Math.sin(p) * 0.38 +
          Math.sin(p * 1.73 - 0.6) * 0.22 +
          Math.sin(p * 3.1 + 0.9) * 0.12 +
          Math.sin(p * 0.47 + 1.4) * 0.18

        const raw    = Math.abs(v) * 1.25
        const height = Math.max(4, Math.min(1, raw) * H * 0.84)
        const alpha  = 0.38 + Math.min(1, raw) * 0.58

        const x = i * (bw + gw)
        const y = (H - height) / 2

        ctx.fillStyle = `rgba(196, 24, 32, ${alpha})`
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(x, y, bw, height, 2)
        } else {
          ctx.rect(x, y, bw, height)
        }
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return <canvas ref={canvasRef} className="waveform" />
}
