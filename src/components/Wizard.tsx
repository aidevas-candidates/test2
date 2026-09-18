import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react'
import type { CaseStudy, MediaKitData } from '../model'
import { limits } from '../model'
import './components.css'

export type WizardProps = {
  data: MediaKitData
  onChange: (data: MediaKitData) => void
  onPreview: () => void
}

type StringListKey = 'destinations' | 'tourists' | 'partnerBenefits' | 'requests'
type CaseKey = keyof Pick<CaseStudy, 'request' | 'action' | 'result'>

const steps = [
  { number: 1, title: 'Кто я', short: 'О вас' },
  { number: 2, title: 'С кем и как я работаю', short: 'Работа' },
  { number: 3, title: 'Опыт и доказательства', short: 'Опыт' },
  { number: 4, title: 'Контакты', short: 'Контакты' },
] as const

const listSettings: Record<StringListKey, { maxItems: number; maxLength: number }> = {
  destinations: { maxItems: limits.destinations, maxLength: limits.destination },
  tourists: { maxItems: limits.tourists, maxLength: limits.tourist },
  partnerBenefits: { maxItems: limits.partnerBenefits, maxLength: limits.partnerBenefit },
  requests: { maxItems: limits.requests, maxLength: limits.request },
}

function CharacterCount({ value, max }: { value: string; max: number }) {
  return <span className="character-count" aria-live="polite">{value.length}/{max}</span>
}

function FieldLabel({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="field__label">
      {children} {optional ? <small>необязательно</small> : <b aria-label="обязательное поле">*</b>}
    </span>
  )
}

function ListEditor({
  id,
  label,
  hint,
  values,
  maxItems,
  maxLength,
  onChange,
}: {
  id: string
  label: string
  hint: string
  values: string[]
  maxItems: number
  maxLength: number
  onChange: (values: string[]) => void
}) {
  const update = (index: number, value: string) => {
    const next = [...values]
    next[index] = value
    onChange(next)
  }

  const remove = (index: number) => {
    if (values.length === 1) return
    onChange(values.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <fieldset className="list-editor">
      <legend><FieldLabel>{label}</FieldLabel></legend>
      <p className="field__hint" id={`${id}-hint`}>{hint}</p>
      <div className="list-editor__items">
        {values.map((value, index) => (
          <div className="list-editor__row" key={`${id}-${index}`}>
            <span className="list-editor__index" aria-hidden="true">{index + 1}</span>
            <label className="sr-only" htmlFor={`${id}-${index}`}>{label}, пункт {index + 1}</label>
            <input
              id={`${id}-${index}`}
              value={value}
              maxLength={maxLength}
              onChange={(event) => update(index, event.target.value)}
              aria-describedby={`${id}-hint`}
              required={index === 0}
            />
            <CharacterCount value={value} max={maxLength} />
            {values.length > 1 && (
              <button className="icon-button" type="button" onClick={() => remove(index)} aria-label={`Удалить пункт ${index + 1}`}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {values.length < maxItems && (
        <button className="add-button" type="button" onClick={() => onChange([...values, ''])}>
          <span aria-hidden="true">＋</span> Добавить пункт <small>до {maxItems}</small>
        </button>
      )}
    </fieldset>
  )
}

type ImagePurpose = 'portrait' | 'proof'

function ImageUpload({
  id,
  label,
  value,
  purpose,
  optional = false,
  onChange,
}: {
  id: string
  label: string
  value?: string
  purpose: ImagePurpose
  optional?: boolean
  onChange: (value?: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setError('')
    setNotice('')
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Выберите изображение в формате JPEG, PNG или WebP.')
      event.target.value = ''
      return
    }
    const maxFileSize = purpose === 'proof' ? 4 : 8
    if (file.size > maxFileSize * 1024 * 1024) {
      setError(`Файл больше ${maxFileSize} МБ. Уменьшите изображение и загрузите снова.`)
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const image = new Image()
      image.onload = () => {
        if (purpose === 'portrait' && (image.width < 800 || image.height < 1000)) {
          setNotice('Фото загружено, но для чёткого результата лучше использовать размер не менее 800 × 1000 px.')
        }
        if (purpose === 'portrait') {
          const ratio = image.width / image.height
          if (Math.abs(ratio - 0.8) > 0.12) {
            setNotice('Фото загружено. Лучше всего подойдёт вертикальный портрет с соотношением сторон 4:5 — лишнее будет обрезано.')
          }
        }
        if (purpose === 'proof') {
          const ratio = image.width / image.height
          if (image.width < 800 || image.height < 600 || Math.abs(ratio - 4 / 3) > 0.18) {
            setNotice('Фото загружено. Для лучшей читаемости используйте горизонтальный формат 4:3 размером не менее 800 × 600 px.')
          }
        }
        onChange(result)
      }
      image.onerror = () => setError('Не удалось прочитать изображение. Попробуйте другой файл.')
      image.src = result
    }
    reader.onerror = () => setError('Не удалось загрузить файл. Попробуйте ещё раз.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="field field--upload">
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <p className="field__hint" id={`${id}-hint`}>
        {purpose === 'portrait'
          ? 'Вертикальный портрет 4:5, желательно не менее 800 × 1000 px.'
          : 'Горизонтальное фото, отзыв или сертификат 4:3, желательно не менее 800 × 600 px. Оно появится внутри кейса.'}
        {' '}JPEG, PNG или WebP, до {purpose === 'proof' ? 4 : 8} МБ.
      </p>
      <div className="upload-box">
        {value ? (
          <img className={purpose === 'portrait' ? 'upload-box__portrait' : ''} src={value} alt="Предпросмотр загруженного изображения" />
        ) : (
          <div className="upload-box__placeholder" aria-hidden="true"><span>↥</span><small>Выберите изображение</small></div>
        )}
        <div className="upload-box__actions">
          <input
            ref={inputRef}
            id={id}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={`${id}-hint ${error ? `${id}-error` : ''}`}
            onChange={readImage}
          />
          <button className="button button--secondary button--small" type="button" onClick={() => inputRef.current?.click()}>
            {value ? 'Заменить' : 'Загрузить'}
          </button>
          {value && <button className="text-button" type="button" onClick={() => { onChange(undefined); if (inputRef.current) inputRef.current.value = '' }}>Удалить</button>}
        </div>
      </div>
      {error && <p className="field__message field__message--error" id={`${id}-error`} role="alert">{error}</p>}
      {notice && <p className="field__message" role="status">{notice}</p>}
    </div>
  )
}

function UrlField({
  id,
  label,
  value,
  placeholder,
  required = false,
  onChange,
}: {
  id: string
  label: string
  value: string
  placeholder: string
  required?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}{required && <b aria-label="обязательное поле">*</b>}</span>
      <input id={id} type="url" inputMode="url" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  )
}

export function Wizard({ data, onChange, onPreview }: WizardProps) {
  const [step, setStep] = useState(1)
  const topRef = useRef<HTMLDivElement>(null)

  const setField = <K extends keyof MediaKitData>(key: K, value: MediaKitData[K]) => {
    onChange({ ...data, [key]: value })
  }

  const setList = (key: StringListKey, value: string[]) => setField(key, value)

  const setCaseField = (index: 0 | 1, key: CaseKey, value: string) => {
    const cases: [CaseStudy, CaseStudy] = [{ ...data.cases[0] }, { ...data.cases[1] }]
    cases[index][key] = value
    setField('cases', cases)
  }

  const setCaseImage = (index: 0 | 1, value?: string) => {
    const cases: [CaseStudy, CaseStudy] = [{ ...data.cases[0] }, { ...data.cases[1] }]
    cases[index].proofImage = value
    setField('cases', cases)
  }

  const qrOptions = useMemo(() => [
    data.telegramUrl && { value: 'telegram', label: `Telegram ${data.telegramNick || ''}`.trim() },
    data.instagramUrl && { value: 'instagram', label: `Instagram ${data.instagramNick || ''}`.trim() },
    data.vkUrl && { value: 'vk', label: `VK ${data.vkNick || ''}`.trim() },
    data.website && { value: 'website', label: 'Сайт' },
  ].filter(Boolean) as { value: Exclude<MediaKitData['qrTarget'], ''>; label: string }[], [data])

  const goTo = (next: number) => {
    setStep(next)
    requestAnimationFrame(() => topRef.current?.focus())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step < 4) goTo(step + 1)
    else onPreview()
  }

  return (
    <main className="wizard">
      <div className="wizard__top" ref={topRef} tabIndex={-1}>
        <div>
          <p className="section-kicker">Конструктор медиакита</p>
          <h1>Заполните анкету</h1>
          <p>Не старайтесь писать много: короткие конкретные ответы лучше читаются в готовом медиаките.</p>
        </div>
        <span className="wizard__progress-text">Шаг {step} из 4</span>
      </div>

      <nav className="stepper" aria-label="Шаги заполнения">
        {steps.map((item) => (
          <button
            type="button"
            className={`stepper__item ${item.number === step ? 'is-active' : ''} ${item.number < step ? 'is-complete' : ''}`}
            aria-current={item.number === step ? 'step' : undefined}
            onClick={() => item.number < step && goTo(item.number)}
            disabled={item.number > step}
            key={item.number}
          >
            <span>{item.number < step ? '✓' : item.number}</span>
            <span className="stepper__full">{item.title}</span>
            <span className="stepper__short">{item.short}</span>
          </button>
        ))}
      </nav>
      <div className="progress-bar" aria-hidden="true"><span style={{ width: `${step * 25}%` }} /></div>

      <form className="wizard__form" onSubmit={submit}>
        <section className="form-card" aria-labelledby={`step-${step}-title`}>
          <div className="form-card__header">
            <span>0{step}</span>
            <div>
              <p>Слайд {step}</p>
              <h2 id={`step-${step}-title`}>{steps[step - 1].title}</h2>
            </div>
          </div>

          {step > 1 && (
            <aside className="carry-note">
              <span aria-hidden="true">✓</span>
              <p><b>Имя и специализация уже подставятся автоматически.</b><br />Повторно вводить их не нужно.</p>
            </aside>
          )}

          {step === 1 && (
            <div className="form-layout">
              <div className="form-column">
                <label className="field" htmlFor="specialization">
                  <FieldLabel>Специализация</FieldLabel>
                  <span className="field__hint">Например: семейные путешествия, авторские туры, премиальный отдых.</span>
                  <input id="specialization" value={data.specialization} maxLength={limits.specialization} placeholder="Семейные путешествия" onChange={(e) => setField('specialization', e.target.value)} required />
                  <CharacterCount value={data.specialization} max={limits.specialization} />
                </label>
                <label className="field" htmlFor="full-name">
                  <FieldLabel>Имя и фамилия</FieldLabel>
                  <input id="full-name" autoComplete="name" value={data.fullName} maxLength={limits.fullName} placeholder="Анна Смирнова" onChange={(e) => setField('fullName', e.target.value)} required />
                  <CharacterCount value={data.fullName} max={limits.fullName} />
                </label>
                <label className="field" htmlFor="about">
                  <FieldLabel>Коротко о себе</FieldLabel>
                  <span className="field__hint">2–4 предложения: сколько вы в туризме, на чём специализируетесь и что особенно важно в работе с туристами.</span>
                  <textarea id="about" rows={6} value={data.about} maxLength={limits.about} placeholder="Я в туризме…" onChange={(e) => setField('about', e.target.value)} required />
                  <CharacterCount value={data.about} max={limits.about} />
                </label>
                <label className="field" htmlFor="positioning">
                  <FieldLabel>Ваша ключевая фраза</FieldLabel>
                  <span className="field__hint">Формула: «Я помогаю [кому] подобрать [какой отдых] с учётом [2–3 важных факторов]».</span>
                  <textarea id="positioning" rows={3} value={data.positioning} maxLength={limits.positioning} placeholder="Я помогаю семьям с детьми…" onChange={(e) => setField('positioning', e.target.value)} required />
                  <CharacterCount value={data.positioning} max={limits.positioning} />
                </label>
              </div>
              <div className="form-column">
                <ImageUpload id="portrait" label="Ваш портрет" value={data.portrait} purpose="portrait" onChange={(value) => setField('portrait', value)} />
                <ListEditor
                  id="destinations"
                  label="Мои направления"
                  hint="Укажите страны, регионы или форматы отдыха, в которых особенно сильны. Коротко, без описаний."
                  values={data.destinations}
                  {...listSettings.destinations}
                  onChange={(value) => setList('destinations', value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-layout form-layout--wide">
              <div className="form-column">
                <ListEditor
                  id="tourists"
                  label="Мои туристы"
                  hint="Кто чаще всего к вам обращается: семьи с детьми, пары, самостоятельные путешественники, туристы 45+ и другие."
                  values={data.tourists}
                  {...listSettings.tourists}
                  onChange={(value) => setList('tourists', value)}
                />
                <ListEditor
                  id="partner-benefits"
                  label="Чем я полезен партнёру"
                  hint="Конкретные преимущества для туроператора, отеля или авиакомпании: продажи, база туристов, командная работа."
                  values={data.partnerBenefits}
                  {...listSettings.partnerBenefits}
                  onChange={(value) => setList('partnerBenefits', value)}
                />
              </div>
              <div className="form-column">
                <ListEditor
                  id="requests"
                  label="Какие запросы я решаю"
                  hint="До семи типичных задач клиента. Начинайте с глагола: «подобрать», «организовать», «найти», «спланировать»."
                  values={data.requests}
                  {...listSettings.requests}
                  onChange={(value) => setList('requests', value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-stack">
              <fieldset className="stats">
                <legend><FieldLabel>Опыт в цифрах</FieldLabel></legend>
                <p className="field__hint">Все четыре показателя обязательны. Если только начинаете, можно честно указать 0.</p>
                <div className="stats__grid">
                  <label className="field" htmlFor="years"><span className="field__label">Лет в туризме <b>*</b></span><input id="years" inputMode="numeric" value={data.years} maxLength={6} placeholder="5" onChange={(e) => setField('years', e.target.value)} required /></label>
                  <label className="field" htmlFor="directions-count"><span className="field__label">Направлений <b>*</b></span><input id="directions-count" inputMode="numeric" value={data.directionsCount} maxLength={6} placeholder="12" onChange={(e) => setField('directionsCount', e.target.value)} required /></label>
                  <label className="field" htmlFor="countries-count"><span className="field__label">Стран, которые знаю <b>*</b></span><input id="countries-count" inputMode="numeric" value={data.countriesCount} maxLength={6} placeholder="18" onChange={(e) => setField('countriesCount', e.target.value)} required /></label>
                  <label className="field" htmlFor="trips-count"><span className="field__label">Туристов / поездок <b>*</b></span><input id="trips-count" inputMode="numeric" value={data.tripsCount} maxLength={8} placeholder="150+" onChange={(e) => setField('tripsCount', e.target.value)} required /></label>
                </div>
              </fieldset>
              <div className="cases-grid">
                {data.cases.map((caseStudy, index) => {
                  const caseIndex = index as 0 | 1
                  return (
                    <fieldset className="case-card" key={index}>
                      <legend>Кейс {String(index + 1).padStart(2, '0')}</legend>
                      <p className="field__hint">Опишите реальную задачу кратко и конкретно. Результат лучше подкрепить цифрой или фактом.</p>
                      {([
                        ['request', 'Запрос туриста', 'С чем к вам пришёл турист?'],
                        ['action', 'Что сделали', 'Что вы подобрали или организовали?'],
                        ['result', 'Результат', 'Что получилось в итоге?'],
                      ] as const).map(([key, label, placeholder]) => (
                        <label className="field" htmlFor={`case-${index}-${key}`} key={key}>
                          <FieldLabel>{label}</FieldLabel>
                          <textarea id={`case-${index}-${key}`} rows={3} value={caseStudy[key]} maxLength={limits.casePart} placeholder={placeholder} onChange={(e) => setCaseField(caseIndex, key, e.target.value)} required />
                          <CharacterCount value={caseStudy[key]} max={limits.casePart} />
                        </label>
                      ))}
                      <ImageUpload id={`case-${index}-image`} label="Доказательство результата" value={caseStudy.proofImage} purpose="proof" optional onChange={(value) => setCaseImage(caseIndex, value)} />
                    </fieldset>
                  )
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-layout form-layout--contacts">
              <div className="form-column contact-lines">
                <div className="contact-line">
                  <span className="contact-line__number">01</span>
                  <label className="field" htmlFor="phone">
                    <FieldLabel optional>Телефон</FieldLabel>
                    <input id="phone" type="tel" autoComplete="tel" value={data.phone} placeholder="+7 900 000-00-00" onChange={(e) => setField('phone', e.target.value)} />
                  </label>
                </div>
                <div className="contact-line">
                  <span className="contact-line__number">02</span>
                  <div className="contact-line__group">
                    <label className="field" htmlFor="telegram-nick">
                      <FieldLabel optional>Telegram — ник</FieldLabel>
                      <input id="telegram-nick" value={data.telegramNick} maxLength={limits.contactNick} placeholder="@username" onChange={(e) => setField('telegramNick', e.target.value)} required={Boolean(data.telegramUrl)} />
                    </label>
                    <UrlField id="telegram-url" label="Ссылка" value={data.telegramUrl} placeholder="https://t.me/username" onChange={(value) => setField('telegramUrl', value)} required={Boolean(data.telegramNick)} />
                  </div>
                </div>
                <div className="contact-line">
                  <span className="contact-line__number">03</span>
                  <fieldset className="social-pair">
                    <legend><FieldLabel optional>Соцсети — Instagram / VK</FieldLabel></legend>
                    <p className="field__hint">Можно указать одну или обе соцсети. В медиаките они появятся в одной строке через слеш.</p>
                    <div className="social-pair__grid">
                      <label className="field" htmlFor="instagram-nick"><span className="field__label">Instagram — ник</span><input id="instagram-nick" value={data.instagramNick} maxLength={limits.contactNick} placeholder="@username" onChange={(e) => setField('instagramNick', e.target.value)} required={Boolean(data.instagramUrl)} /></label>
                      <UrlField id="instagram-url" label="Ссылка Instagram" value={data.instagramUrl} placeholder="https://instagram.com/username" onChange={(value) => setField('instagramUrl', value)} required={Boolean(data.instagramNick)} />
                      <label className="field" htmlFor="vk-nick"><span className="field__label">VK — ник</span><input id="vk-nick" value={data.vkNick} maxLength={limits.contactNick} placeholder="@username" onChange={(e) => setField('vkNick', e.target.value)} required={Boolean(data.vkUrl)} /></label>
                      <UrlField id="vk-url" label="Ссылка VK" value={data.vkUrl} placeholder="https://vk.com/username" onChange={(value) => setField('vkUrl', value)} required={Boolean(data.vkNick)} />
                    </div>
                  </fieldset>
                </div>
                <div className="contact-line">
                  <span className="contact-line__number">04</span>
                  <div className="field">
                    <span className="field__label">Сайт <small>необязательно</small></span>
                    <input id="website" type="url" inputMode="url" value={data.website} placeholder="https://example.ru" onChange={(event) => setField('website', event.target.value)} />
                  </div>
                </div>
              </div>
              <div className="form-column">
                <fieldset className="qr-choice">
                  <legend><FieldLabel optional>Ссылка для QR-кода</FieldLabel></legend>
                  <p className="field__hint">QR-код появится на четвёртом слайде. Выберите, куда он должен вести.</p>
                  {qrOptions.length ? qrOptions.map((option) => (
                    <label className="radio-card" key={option.value}>
                      <input type="radio" name="qr-target" value={option.value} checked={data.qrTarget === option.value} onChange={() => setField('qrTarget', option.value)} required={qrOptions.length > 0} />
                      <span aria-hidden="true" /> {option.label}
                    </label>
                  )) : <p className="empty-note">Сначала добавьте хотя бы одну ссылку в контактах.</p>}
                </fieldset>
                <label className="field" htmlFor="final-phrase">
                  <FieldLabel optional>Финальная фраза</FieldLabel>
                  <span className="field__hint">Можно оставить предложенный вариант или написать свой.</span>
                  <textarea id="final-phrase" rows={3} value={data.finalPhrase} maxLength={limits.finalPhrase} onChange={(e) => setField('finalPhrase', e.target.value)} />
                  <CharacterCount value={data.finalPhrase} max={limits.finalPhrase} />
                </label>
                <aside className="checklist">
                  <h3>Перед просмотром проверьте</h3>
                  <ul>
                    <li>имя и контакты написаны без ошибок;</li>
                    <li>ссылки открываются и ведут на ваши страницы;</li>
                    <li>в кейсах есть конкретный результат;</li>
                    <li>фотографии не содержат личных данных туристов.</li>
                  </ul>
                </aside>
              </div>
            </div>
          )}
        </section>

        <div className="wizard__actions">
          {step > 1 ? <button className="button button--secondary" type="button" onClick={() => goTo(step - 1)}>← Назад</button> : <span />}
          <button className="button button--primary" type="submit">
            {step === 4 ? 'Посмотреть медиакит' : 'Продолжить'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </main>
  )
}

export default Wizard
