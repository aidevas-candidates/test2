import { useCallback, useEffect, useRef, useState } from 'react'
import { Intro } from './components/Intro'
import { Wizard } from './components/Wizard'
import { MediaKitPreview } from './components/MediaKitPreview'
import { exportMediaKitPdf } from './pdf/exportPdf'
import { initialMediaKitData, type MediaKitData } from './model'
import { sampleData } from './sampleData'
import { validateForPreview } from './validation'
import './components/components.css'
import './components/preview.css'

type Screen = 'intro' | 'form' | 'preview'

export function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [data, setData] = useState<MediaKitData>(initialMediaKitData)
  const [errors, setErrors] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [pdfDownload, setPdfDownload] = useState<{ url: string; fileName: string } | null>(null)
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle')
  const [sampleMode, setSampleMode] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const exportInProgressRef = useRef(false)
  const pdfGenerationRef = useRef(0)
  const pdfQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => () => {
    if (pdfDownload) URL.revokeObjectURL(pdfDownload.url)
  }, [pdfDownload])

  const fillWithSample = () => {
    setPdfDownload(null)
    setData((current) => ({
      ...sampleData,
      portrait: current.portrait ?? sampleData.portrait,
      cases: [
        { ...sampleData.cases[0], proofImage: current.cases[0].proofImage ?? sampleData.cases[0].proofImage },
        { ...sampleData.cases[1], proofImage: current.cases[1].proofImage ?? sampleData.cases[1].proofImage },
      ],
    }))
    setSampleMode(true)
    setErrors([])
  }

  const clearForm = () => {
    setPdfDownload(null)
    setData(initialMediaKitData)
    setSampleMode(false)
    setErrors([])
  }

  const openPreview = () => {
    const nextErrors = validateForPreview(data)
    if (nextErrors.length) {
      setErrors(nextErrors.map((item) => item.message))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors([])
    setScreen('preview')
    window.scrollTo({ top: 0 })
  }

  const preparePdf = useCallback(async () => {
    if (!previewRef.current || exportInProgressRef.current) return
    const generation = ++pdfGenerationRef.current
    exportInProgressRef.current = true
    setIsExporting(true)
    setPdfStatus('preparing')
    setPdfDownload(null)
    setErrors([])
    try {
      const container = previewRef.current
      const job = pdfQueueRef.current.then(() => {
        if (generation !== pdfGenerationRef.current) throw new Error('PDF generation cancelled')
        return exportMediaKitPdf(container, data)
      })
      pdfQueueRef.current = job.then(() => undefined, () => undefined)
      const generated = await job
      const url = URL.createObjectURL(generated.blob)
      if (generation !== pdfGenerationRef.current) {
        URL.revokeObjectURL(url)
        return
      }
      setPdfDownload({ url, fileName: generated.fileName })
      setPdfStatus('ready')
    } catch (error) {
      if (generation !== pdfGenerationRef.current) return
      console.error(error)
      setErrors(['Не удалось собрать PDF. Попробуйте ещё раз или откройте сайт в актуальной версии браузера.'])
      setPdfStatus('error')
    } finally {
      if (generation === pdfGenerationRef.current) {
        exportInProgressRef.current = false
        setIsExporting(false)
      }
    }
  }, [data])

  useEffect(() => {
    if (screen !== 'preview') return
    const frame = requestAnimationFrame(() => void preparePdf())
    return () => {
      cancelAnimationFrame(frame)
      pdfGenerationRef.current += 1
      exportInProgressRef.current = false
    }
  }, [screen, preparePdf])

  return (
    <main>
      {errors.length > 0 && (
        <section className="error-summary" role="alert" aria-live="polite">
          <strong>{screen === 'preview' ? 'Не удалось скачать PDF' : 'Перед предпросмотром нужно дополнить анкету'}</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      )}

      {screen === 'intro' && <Intro onStart={() => setScreen('form')} />}

      {screen === 'form' && (
        <Wizard
          data={data}
          onChange={(nextData) => {
            setPdfDownload(null)
            setData(nextData)
          }}
          onPreview={openPreview}
          sampleMode={sampleMode}
          onFillSample={fillWithSample}
          onClear={clearForm}
        />
      )}

      {screen === 'preview' && (
        <section className="preview-screen">
          <header className="preview-toolbar">
            <div>
              <span className="eyebrow">Финальная проверка</span>
              <h1>Ваш media kit готов</h1>
              <p>Посмотрите на результат глазами будущего партнёра.</p>
            </div>
            <div className="toolbar-actions">
              <button className="button button-secondary" onClick={() => {
                setPdfDownload(null)
                setPdfStatus('idle')
                setScreen('form')
              }}>Изменить ответы</button>
              {pdfDownload && pdfStatus === 'ready' ? (
                <a className="button button-primary" href={pdfDownload.url} download={pdfDownload.fileName}>
                  Скачать PDF
                </a>
              ) : (
                <button className="button button-primary" onClick={() => void preparePdf()} disabled={isExporting}>
                  {pdfStatus === 'error' ? 'Повторить подготовку' : 'Готовим PDF…'}
                </button>
              )}
            </div>
          </header>

          <div className="self-check" aria-label="Самопроверка">
            <strong>Проверьте три вещи</strong>
            <label><input type="checkbox" /> За 30 секунд понятно, кто я</label>
            <label><input type="checkbox" /> Понятно, с какими туристами я работаю</label>
            <label><input type="checkbox" /> Понятно, зачем со мной сотрудничать</label>
          </div>

          <div ref={previewRef} className="preview-canvas">
            <MediaKitPreview data={data} />
          </div>
        </section>
      )}
    </main>
  )
}
