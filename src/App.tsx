import { useRef, useState } from 'react'
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
  const [sampleMode, setSampleMode] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const fillWithSample = () => {
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

  const downloadPdf = async () => {
    if (!previewRef.current || isExporting) return
    setIsExporting(true)
    try {
      await exportMediaKitPdf(previewRef.current, data)
    } catch (error) {
      console.error(error)
      setErrors(['Не удалось собрать PDF. Попробуйте ещё раз или откройте сайт в актуальной версии браузера.'])
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main>
      {errors.length > 0 && (
        <section className="error-summary" role="alert" aria-live="polite">
          <strong>Перед предпросмотром нужно дополнить анкету</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      )}

      {screen === 'intro' && <Intro onStart={() => setScreen('form')} />}

      {screen === 'form' && (
        <Wizard
          data={data}
          onChange={setData}
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
              <button className="button button-secondary" onClick={() => setScreen('form')}>Изменить ответы</button>
              <button className="button button-primary" onClick={downloadPdf} disabled={isExporting}>
                {isExporting ? 'Собираем PDF…' : 'Скачать PDF'}
              </button>
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
