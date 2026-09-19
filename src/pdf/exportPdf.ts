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

export type GeneratedPdf = {
  blob: Blob
  fileName: string
}

async function waitForImage(image: HTMLImageElement, timeoutMs = 8000) {
  const startedAt = performance.now()
  while (!image.complete) {
    if (performance.now() - startedAt > timeoutMs) {
      throw new Error(`Истекло время ожидания изображения: ${image.className || image.alt || 'без подписи'}`)
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 50))
  }
  if (!image.naturalWidth) {
    throw new Error(`Изображение не загрузилось: ${image.className || image.alt || 'без подписи'}`)
  }
}

async function waitForQr(container: HTMLElement, data: MediaKitData) {
  if (!data.qrTarget || container.querySelector('.mk-qr-block img')) return
  await new Promise<void>((resolve, reject) => {
    const startedAt = performance.now()
    const check = () => {
      if (container.querySelector('.mk-qr-block img')) {
        resolve()
        return
      }
      if (performance.now() - startedAt > 5000) {
        reject(new Error('QR-код не успел сформироваться'))
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

function nextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function prepareSlideImages(slide: HTMLElement, pixelRatio: number) {
  const images = Array.from(slide.querySelectorAll<HTMLImageElement>('img:not(.mk-qr-block img)'))
  const originals: { image: HTMLImageElement; src: string; srcset: string | null }[] = []
  const restoreOriginals = async () => {
    for (const original of originals) {
      original.image.src = original.src
      if (original.srcset) original.image.setAttribute('srcset', original.srcset)
      else original.image.removeAttribute('srcset')
    }
    await Promise.all(originals.map(({ image }) => waitForImage(image)))
    await nextPaint()
  }

  for (const image of images) {
    await waitForImage(image)
    const naturalWidth = image.naturalWidth
    const naturalHeight = image.naturalHeight
    if (!naturalWidth || !naturalHeight || naturalWidth * naturalHeight < 2_000_000) continue

    const requiredWidth = Math.max(1, image.offsetWidth * pixelRatio)
    const requiredHeight = Math.max(1, image.offsetHeight * pixelRatio)
    const resolutionScale = Math.min(
      1,
      Math.max(requiredWidth / naturalWidth, requiredHeight / naturalHeight),
      2048 / Math.max(naturalWidth, naturalHeight),
    )
    if (resolutionScale >= 0.92) continue

    let original: { image: HTMLImageElement; src: string; srcset: string | null } | undefined
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) continue
      canvas.width = Math.max(1, Math.round(naturalWidth * resolutionScale))
      canvas.height = Math.max(1, Math.round(naturalHeight * resolutionScale))
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      original = { image, src: image.src, srcset: image.getAttribute('srcset') }
      image.removeAttribute('srcset')
      const keepTransparency = image.src.startsWith('data:image/png') || image.src.startsWith('data:image/webp')
      image.src = keepTransparency ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9)
      await waitForImage(image)
      originals.push(original)
    } catch (error) {
      if (original) {
        original.image.src = original.src
        if (original.srcset) original.image.setAttribute('srcset', original.srcset)
        await waitForImage(original.image)
      }
      await restoreOriginals()
      throw new Error('Не удалось подготовить изображение для PDF', { cause: error })
    }
  }

  await nextPaint()
  return restoreOriginals
}

async function captureSlide(slide: HTMLElement, pixelRatio: number) {
  const restoreImages = await prepareSlideImages(slide, pixelRatio)
  try {
    return await toJpeg(slide, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      pixelRatio,
      quality: 0.92,
      cacheBust: false,
      skipAutoScale: true,
      backgroundColor: '#ffffff',
      style: {
        transform: 'none',
        transformOrigin: '0 0',
      },
    })
  } finally {
    await restoreImages()
  }
}

async function captureSlideFallback(slide: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(slide, {
    backgroundColor: '#ffffff',
    scale: 1,
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    windowWidth: SLIDE_WIDTH,
    windowHeight: SLIDE_HEIGHT,
    useCORS: true,
    logging: false,
    imageTimeout: 10000,
    onclone: (_document, clonedSlide) => {
      clonedSlide.style.transform = 'none'
      clonedSlide.style.transformOrigin = '0 0'
      const viewport = clonedSlide.parentElement
      if (viewport) {
        viewport.style.width = `${SLIDE_WIDTH}px`
        viewport.style.height = `${SLIDE_HEIGHT}px`
        viewport.style.maxWidth = 'none'
        viewport.style.overflow = 'visible'
      }
    },
  })
  if (canvas.width !== SLIDE_WIDTH || canvas.height !== SLIDE_HEIGHT) {
    throw new Error('Резервный рендерер создал страницу неверного размера')
  }
  return canvas.toDataURL('image/jpeg', 0.9)
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

function safeFileNamePart(fullName: string) {
  return fullName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/[. ]+$/g, '') || 'Турагент'
}

export async function exportMediaKitPdf(container: HTMLElement, data: MediaKitData): Promise<GeneratedPdf> {
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
  const isMobileDevice = /Android|iP(?:hone|ad|od)/.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024)
  const pixelRatio = isMobileDevice ? 1 : 1.5

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    const links = collectLinkZones(slide)
    let image: string
    try {
      image = await captureSlide(slide, pixelRatio)
    } catch (primaryError) {
      try {
        image = pixelRatio > 1 ? await captureSlide(slide, 1) : await captureSlideFallback(slide)
      } catch (secondError) {
        if (pixelRatio > 1) {
          try {
            image = await captureSlideFallback(slide)
          } catch (fallbackError) {
            throw new Error(`Не удалось подготовить слайд ${index + 1}`, { cause: [primaryError, secondError, fallbackError] })
          }
        } else {
          throw new Error(`Не удалось подготовить слайд ${index + 1}`, { cause: [primaryError, secondError] })
        }
      }
    }

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

  const personName = safeFileNamePart(data.fullName)
  pdf.setProperties({
    title: `Медиакит — ${personName}`,
    subject: 'Медиакит турагента',
    creator: 'Конструктор медиакита',
  })
  const fileName = `Media Kit — ${personName}.pdf`
  return { blob: pdf.output('blob'), fileName }
}
