import { limits, type MediaKitData } from './model'

export type ValidationError = {
  field: string
  message: string
}

type ValidationErrorsByField = Record<string, string>

const isBlank = (value: string | undefined) => !value?.trim()

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const addRequired = (
  errors: ValidationErrorsByField,
  field: string,
  value: string | undefined,
  message: string,
) => {
  if (isBlank(value)) errors[field] = message
}

const addMaxLength = (
  errors: ValidationErrorsByField,
  field: string,
  value: string | undefined,
  maximum: number,
) => {
  if (value && value.trim().length > maximum) {
    errors[field] = `Не больше ${maximum} символов`
  }
}

const validateList = (
  errors: ValidationErrorsByField,
  field: 'destinations' | 'tourists' | 'partnerBenefits' | 'requests',
  values: string[],
  maximumItems: number,
  maximumLength: number,
  emptyMessage: string,
) => {
  const nonEmptyValues = values.filter((value) => !isBlank(value))

  if (nonEmptyValues.length === 0) errors[field] = emptyMessage
  if (nonEmptyValues.length > maximumItems) {
    errors[field] = `Не больше ${maximumItems} пунктов`
  }

  values.forEach((value, index) => {
    addMaxLength(errors, `${field}.${index}`, value, maximumLength)
  })
}

const validateSocial = (
  errors: ValidationErrorsByField,
  nickField: 'telegramNick' | 'instagramNick' | 'vkNick',
  urlField: 'telegramUrl' | 'instagramUrl' | 'vkUrl',
  nick: string,
  url: string,
  title: string,
) => {
  addMaxLength(errors, nickField, nick, limits.contactNick)

  if (!isBlank(nick) && isBlank(url)) {
    errors[urlField] = `Добавьте ссылку на ${title}`
  } else if (!isBlank(url) && !isHttpUrl(url.trim())) {
    errors[urlField] = 'Укажите полную ссылку, начинающуюся с http:// или https://'
  }

  // Ссылка без подписи не сможет отобразиться как кликабельный ник в медиаките.
  if (!isBlank(url) && isBlank(nick)) {
    errors[nickField] = `Добавьте ник для ${title}`
  }
}

/**
 * Проверяет, можно ли строить предпросмотр и итоговый PDF без обрезанного
 * или отсутствующего обязательного содержимого.
 */
export const validateForPreview = (data: MediaKitData): ValidationError[] => {
  const errors: ValidationErrorsByField = {}

  addRequired(errors, 'fullName', data.fullName, 'Укажите имя и фамилию')
  addRequired(errors, 'specialization', data.specialization, 'Укажите специализацию')
  if (isBlank(data.portrait)) errors.portrait = 'Загрузите портретное фото'
  addRequired(errors, 'about', data.about, 'Расскажите о себе')
  addRequired(errors, 'positioning', data.positioning, 'Добавьте позиционирование')

  addMaxLength(errors, 'fullName', data.fullName, limits.fullName)
  addMaxLength(errors, 'specialization', data.specialization, limits.specialization)
  addMaxLength(errors, 'about', data.about, limits.about)
  addMaxLength(errors, 'positioning', data.positioning, limits.positioning)
  addMaxLength(errors, 'finalPhrase', data.finalPhrase, limits.finalPhrase)

  validateList(
    errors,
    'destinations',
    data.destinations,
    limits.destinations,
    limits.destination,
    'Добавьте хотя бы одно направление',
  )
  validateList(
    errors,
    'tourists',
    data.tourists,
    limits.tourists,
    limits.tourist,
    'Добавьте хотя бы один тип туристов',
  )
  validateList(
    errors,
    'partnerBenefits',
    data.partnerBenefits,
    limits.partnerBenefits,
    limits.partnerBenefit,
    'Добавьте хотя бы одно преимущество для партнёров',
  )
  validateList(
    errors,
    'requests',
    data.requests,
    limits.requests,
    limits.request,
    'Добавьте хотя бы один запрос, который вы решаете',
  )

  addRequired(errors, 'years', data.years, 'Укажите опыт работы')
  addRequired(errors, 'directionsCount', data.directionsCount, 'Укажите количество направлений')
  addRequired(errors, 'countriesCount', data.countriesCount, 'Укажите количество стран')
  addRequired(errors, 'tripsCount', data.tripsCount, 'Укажите количество туристов или поездок')

  data.cases.forEach((caseStudy, index) => {
    const prefix = `cases.${index}`
    addRequired(errors, `${prefix}.request`, caseStudy.request, 'Опишите запрос туриста')
    addRequired(errors, `${prefix}.action`, caseStudy.action, 'Опишите, что вы сделали')
    addRequired(errors, `${prefix}.result`, caseStudy.result, 'Опишите результат')
    addMaxLength(errors, `${prefix}.request`, caseStudy.request, limits.casePart)
    addMaxLength(errors, `${prefix}.action`, caseStudy.action, limits.casePart)
    addMaxLength(errors, `${prefix}.result`, caseStudy.result, limits.casePart)
  })

  validateSocial(
    errors,
    'telegramNick',
    'telegramUrl',
    data.telegramNick,
    data.telegramUrl,
    'Telegram',
  )
  validateSocial(
    errors,
    'instagramNick',
    'instagramUrl',
    data.instagramNick,
    data.instagramUrl,
    'Instagram',
  )
  validateSocial(errors, 'vkNick', 'vkUrl', data.vkNick, data.vkUrl, 'VK')

  if (!isBlank(data.website) && !isHttpUrl(data.website.trim())) {
    errors.website = 'Укажите полную ссылку, начинающуюся с http:// или https://'
  }

  const availableQrTargets = {
    telegram: data.telegramUrl,
    instagram: data.instagramUrl,
    vk: data.vkUrl,
    website: data.website,
  } as const
  const hasAnyLink = Object.values(availableQrTargets).some(
    (value) => !isBlank(value) && isHttpUrl(value.trim()),
  )

  if (hasAnyLink && !data.qrTarget) {
    errors.qrTarget = 'Выберите ссылку для QR-кода'
  } else if (data.qrTarget && isBlank(availableQrTargets[data.qrTarget])) {
    errors.qrTarget = 'Выбранная ссылка не заполнена'
  } else if (
    data.qrTarget &&
    !isHttpUrl(availableQrTargets[data.qrTarget].trim())
  ) {
    errors.qrTarget = 'Выбранная ссылка должна быть корректной'
  }

  return Object.entries(errors).map(([field, message]) => ({ field, message }))
}
