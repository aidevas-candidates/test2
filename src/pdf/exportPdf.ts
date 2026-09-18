import { toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import type { MediaKitData } from '../model'

const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720

type LinkZone = {
  url: string
  x: number
  y: number
  width: number
  height: number
}

function waitForImage(image: HTMLImageElement) {
  if (image.complete) return image.decode?.().catch(() => undefined) ?? Promise.resolve()
  return new Promise<void>((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => resolve(), { once: true })
  })
}

async function waitForQr(container: HTMLElement, data: MediaKitData) {
  if (!data.qrTarget || container.querySelector('.mk-qr-block img')) return
  await new Promise<void>((resolve) => {
    const startedAt = performance.now()
    const check = () => {
      if (container.querySelector('.mk-qr-block img') || performance.now() - startedAt > 1600) {
        resolve()
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
}

async function prepareForCapture(container: HTMLElement, data: MediaKitData) {
  await waitForQr(container, data)
  await document.fonts?.ready
  const images = Array.from(container.querySelectorAll<HTMLImageElement>('.media-slide img'))
  await Promise.all(images.map(waitForImage))
}

function collectLinkZones(slide: HTMLElement): LinkZone[] {
  const slideRect = slide.getBoundingClientRect()
  const scaleX = slideRect.width / SLIDE_WIDTH || 1
  const scaleY = slideRect.height / SLIDE_HEIGHT || 1

  return Array.from(slide.querySelectorAll<HTMLElement>('[data-pdf-url]')).flatMap((element) => {
    const url = element.dataset.pdfUrl?.trim()
    if (!url) return []
    const rect = element.getBoundingClientRect()
    return [{
      url,
      x: (rect.left - slideRect.left) / scaleX,
      y: (rect.top - slideRect.top) / scaleY,
      width: rect.width / scaleX,
      height: rect.height / scaleY,
    }]
  })
}

function transliterate(value: string) {
  const source = 'абвгдеёзийклмнопрстуфхцчшщъыьэюя'
  const target = ['a', 'b', 'v', 'g', 'd', 'e', 'e', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f', 'h', 'c', 'ch', 'sh', 'sch', '', 'y', '', 'e', 'yu', 'ya']
  return Array.from(value.toLowerCase()).map((character) => {
    const index = source.indexOf(character)
    return index >= 0 ? target[index] : character
  }).join('')
}

function fileSlug(fullName: string) {
  return transliterate(fullName)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'turagent'
}

export async function exportMediaKitPdf(container: HTMLElement, data: MediaKitData): Promise<void> {
  const slides = Array.from(container.querySelectorAll<HTMLElement>('.media-slide'))
  if (slides.length !== 4) {
    throw new Error(`Ожидалось 4 страницы медиакита, найдено: ${slides.length}`)
  }

  await prepareForCapture(container, data)

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [SLIDE_WIDTH, SLIDE_HEIGHT],
    compress: true,
    hotfixes: ['px_scaling'],
  })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    const links = collectLinkZones(slide)
    const image = await toJpeg(slide, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      pixelRatio: 2,
      quality: 0.94,
      cacheBust: true,
      backgroundColor: '#ffffff',
      style: {
        transform: 'none',
        transformOrigin: '0 0',
      },
    })

    if (index > 0) pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape')
    pdf.addImage(image, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')

    const xRatio = pageWidth / SLIDE_WIDTH
    const yRatio = pageHeight / SLIDE_HEIGHT
    links.forEach((link) => {
      pdf.link(
        link.x * xRatio,
        link.y * yRatio,
        Math.max(link.width * xRatio, 8),
        Math.max(link.height * yRatio, 8),
        { url: link.url },
      )
    })
  }

  pdf.setProperties({
    title: `Медиакит — ${data.fullName.trim() || 'турагент'}`,
    subject: 'Медиакит турагента',
    creator: 'Конструктор медиакита',
  })
  pdf.save(`media-kit-${fileSlug(data.fullName)}.pdf`)
}
