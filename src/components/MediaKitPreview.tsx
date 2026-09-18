import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import type { CaseStudy, MediaKitData } from '../model'

type MediaKitPreviewProps = {
  data: MediaKitData
}

const ASSET_ROOT = '/assets/media-kit'
const FALLBACK = '—'

function present(value: string, fallback = FALLBACK) {
  return value.trim() || fallback
}

function compactList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, '')}`
}

function compactUrl(value: string) {
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

function displayNick(value: string) {
  const nick = value.trim()
  if (!nick) return ''
  return nick.startsWith('@') ? nick : `@${nick}`
}

function currentMonth() {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date())
}

function SlideFrame({ children, label }: { children: ReactNode; label: string }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const update = () => setScale(Math.min(1, viewport.clientWidth / 1280))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={viewportRef}
      className="media-slide-viewport"
      style={{ height: `${720 * scale}px` }}
      aria-label={label}
    >
      <div className="media-slide" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}

function PageNumber({ page }: { page: string }) {
  return <div className="mk-page-number"><strong>{page}</strong><span> / 04</span></div>
}

function List({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <ul className={`mk-list ${className}`}>
      {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
    </ul>
  )
}

function CaseCard({ item, index }: { item: CaseStudy; index: number }) {
  const hasProof = Boolean(item.proofImage)
  return (
    <article className={`mk-case ${hasProof ? 'mk-case--with-proof' : ''}`}>
      <div className="mk-case-label">КЕЙС {String(index).padStart(2, '0')}</div>
      {item.proofImage && <img className="mk-case-proof" src={item.proofImage} alt="Подтверждение результата" />}
      <div className="mk-case-part mk-case-part--request">
        <h3>ЗАПРОС</h3>
        <p>{present(item.request, '[с чем пришёл турист]')}</p>
      </div>
      <div className="mk-case-part">
        <h3>ЧТО СДЕЛАЛИ</h3>
        <p>{present(item.action, '[что вы подобрали / организовали]')}</p>
      </div>
      <div className="mk-case-part">
        <h3>РЕЗУЛЬТАТ</h3>
        <p>{present(item.result, '[что получилось]')}</p>
      </div>
    </article>
  )
}

function qrSource(data: MediaKitData) {
  const sources = {
    telegram: data.telegramUrl,
    instagram: data.instagramUrl,
    vk: data.vkUrl,
    website: data.website,
  }
  return data.qrTarget ? normalizeUrl(sources[data.qrTarget]) : ''
}

function qrCaption(target: MediaKitData['qrTarget']) {
  const labels = {
    telegram: 'QR на Telegram',
    instagram: 'QR на Instagram',
    vk: 'QR на ВКонтакте',
    website: 'QR на сайт',
    '': '',
  }
  return labels[target]
}

function SlideOne({ data }: MediaKitPreviewProps) {
  const destinations = compactList(data.destinations)
  return (
    <SlideFrame label="Страница 1 из 4. Кто я">
      <img className="mk-s1-bg" src={`${ASSET_ROOT}/image1.jpg`} alt="" />
      <div className="mk-s1-overlay" />
      <PageNumber page="01" />
      <div className="mk-s1-specialization">ТУРАГЕНТ · {present(data.specialization, '[СПЕЦИАЛИЗАЦИЯ]')}</div>
      <h2 className="mk-s1-title">КТО Я</h2>
      <p className="mk-s1-about">{present(data.about, '[2–4 предложения о себе, опыте и подходе к работе]')}</p>

      <div className="mk-s1-yellow" />
      <h3 className="mk-s1-name">{present(data.fullName, 'ИМЯ ФАМИЛИЯ')}</h3>
      <p className="mk-s1-positioning">« {present(data.positioning, 'Я помогаю подобрать отдых с учётом ваших пожеланий')} »</p>
      <h4 className="mk-s1-directions-title">МОИ НАПРАВЛЕНИЯ</h4>
      <List items={destinations.length ? destinations : ['Направление 1', 'Направление 2']} className="mk-s1-directions" />

      <div className="mk-s1-portrait-frame">
        {data.portrait
          ? <img src={data.portrait} alt={`Портрет: ${present(data.fullName, 'турагент')}`} />
          : <span>ФОТО</span>}
      </div>
    </SlideFrame>
  )
}

function SlideTwo({ data }: MediaKitPreviewProps) {
  const tourists = compactList(data.tourists)
  const benefits = compactList(data.partnerBenefits)
  const requests = compactList(data.requests)
  return (
    <SlideFrame label="Страница 2 из 4. С кем и как я работаю">
      <div className="mk-s2-left">
        <img src={`${ASSET_ROOT}/image3.jpg`} alt="" />
        <h2>С КЕМ И КАК<br />Я РАБОТАЮ</h2>
      </div>
      <PageNumber page="02" />
      <section className="mk-s2-tourists">
        <h3>МОИ ТУРИСТЫ</h3>
        <p className="mk-note">Кто чаще всего обращается ко мне:</p>
        <List items={tourists.length ? tourists : ['Семьи с детьми', 'Пары', 'Индивидуальные путешественники']} />
      </section>
      <section className="mk-s2-benefits">
        <h3>ЧЕМ Я ПОЛЕЗЕН ПАРТНЁРУ:<br />ТУРОПЕРАТОРУ, ОТЕЛЮ,<br />АВИАКОМПАНИИ</h3>
        <List items={benefits.length ? benefits : ['Помогаю продавать ваши туры', 'Есть база туристов и круг общения', 'Готов(а) работать в команде']} />
      </section>
      <section className="mk-s2-requests">
        <h3>КАКИЕ ЗАПРОСЫ<br />Я РЕШАЮ</h3>
        <ol>
          {(requests.length ? requests : ['Организовать путешествие под запрос']).map((item, index) => (
            <li key={`${item}-${index}`}><span>{index + 1}</span><p>{item}</p></li>
          ))}
        </ol>
      </section>
      <div className="mk-footer"><span>{present(data.fullName, '[Имя Фамилия]')}</span><span>Актуально: {currentMonth()}</span></div>
    </SlideFrame>
  )
}

function SlideThree({ data }: MediaKitPreviewProps) {
  const stats = [
    [data.years, 'ЛЕТ В ТУРИЗМЕ'],
    [data.directionsCount, 'НАПРАВЛЕНИЙ'],
    [data.countriesCount, 'СТРАН, КОТОРЫЕ ЗНАЮ'],
    [data.tripsCount, 'ТУРИСТОВ / ПОЕЗДОК'],
  ]
  return (
    <SlideFrame label="Страница 3 из 4. Опыт и доказательства">
      <img className="mk-s3-header-bg" src={`${ASSET_ROOT}/image4.jpg`} alt="" />
      <h2 className="mk-s3-title">ОПЫТ И ДОКАЗАТЕЛЬСТВА</h2>
      <PageNumber page="03" />
      <div className="mk-stats">
        {stats.map(([value, label]) => (
          <div className="mk-stat" key={label}>
            <strong>{present(value, '[X]')}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="mk-cases">
        {data.cases.map((item, index) => <CaseCard item={item} index={index + 1} key={index} />)}
      </div>
      <div className="mk-footer"><span>{present(data.fullName, '[Имя Фамилия]')}</span><span>Актуально: {currentMonth()}</span></div>
    </SlideFrame>
  )
}

function SlideFour({ data }: MediaKitPreviewProps) {
  const targetUrl = useMemo(() => qrSource(data), [data])
  const [qrDataUrl, setQrDataUrl] = useState('')

  useLayoutEffect(() => {
    let active = true
    setQrDataUrl('')
    if (!targetUrl) return () => { active = false }
    QRCode.toDataURL(targetUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    }).then((url) => { if (active) setQrDataUrl(url) })
    return () => { active = false }
  }, [targetUrl])

  const socialLinks = [
    data.instagramNick && { nick: displayNick(data.instagramNick), url: normalizeUrl(data.instagramUrl) },
    data.vkNick && { nick: displayNick(data.vkNick), url: normalizeUrl(data.vkUrl) },
  ].filter(Boolean) as { nick: string; url: string }[]

  const telegramUrl = normalizeUrl(data.telegramUrl)
  const websiteUrl = normalizeUrl(data.website)
  const phoneUrl = data.phone.trim() ? `tel:${data.phone.replace(/[^+\d]/g, '')}` : ''

  return (
    <SlideFrame label="Страница 4 из 4. Контакты">
      <div className="mk-s4-left">
        <PageNumber page="04" />
        <h2>КОНТАКТЫ</h2>

        {qrDataUrl && (
          <div className="mk-qr-block">
            <a href={targetUrl} data-pdf-url={targetUrl} aria-label={qrCaption(data.qrTarget)}>
              <img src={qrDataUrl} alt={qrCaption(data.qrTarget)} />
            </a>
            <span>{qrCaption(data.qrTarget)}</span>
          </div>
        )}

        <div className="mk-s4-specialization">ТУРАГЕНТ · {present(data.specialization, '[СПЕЦИАЛИЗАЦИЯ]')}</div>

        <div className="mk-contacts">
          {data.phone.trim() && (
            <div className="mk-contact-row"><i /><strong>Телефон</strong><span>—</span><a href={phoneUrl} data-pdf-url={phoneUrl}>{data.phone.trim()}</a></div>
          )}
          {data.telegramNick.trim() && (
            <div className="mk-contact-row"><i /><strong>Telegram</strong><span>—</span><a href={telegramUrl || undefined} data-pdf-url={telegramUrl || undefined}>{displayNick(data.telegramNick)}</a></div>
          )}
          {socialLinks.length > 0 && (
            <div className="mk-contact-row"><i /><strong>Соцсети</strong><span>—</span><div className="mk-social-links">
              {socialLinks.map((social, index) => (
                <span key={social.nick}>{index > 0 && <b> / </b>}<a href={social.url || undefined} data-pdf-url={social.url || undefined}>{social.nick}</a></span>
              ))}
            </div></div>
          )}
          {data.website.trim() && (
            <div className="mk-contact-row"><i /><strong>Сайт</strong><span>—</span><a href={websiteUrl} data-pdf-url={websiteUrl}>{compactUrl(data.website)}</a></div>
          )}
        </div>

        <p className="mk-s4-final">« {present(data.finalPhrase, 'Буду рад(а) познакомиться и обсудить сотрудничество')} »</p>
      </div>
      <img className="mk-s4-photo" src={`${ASSET_ROOT}/image5.jpg`} alt="Жёлтый чемодан на берегу моря" />
    </SlideFrame>
  )
}

export function MediaKitPreview({ data }: MediaKitPreviewProps) {
  return (
    <div className="media-kit-preview">
      <SlideOne data={data} />
      <SlideTwo data={data} />
      <SlideThree data={data} />
      <SlideFour data={data} />
    </div>
  )
}
