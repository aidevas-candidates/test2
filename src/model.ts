export type SocialKind = 'instagram' | 'vk'

export type CaseStudy = {
  request: string
  action: string
  result: string
  proofImage?: string
}

export type MediaKitData = {
  specialization: string
  fullName: string
  portrait?: string
  about: string
  positioning: string
  destinations: string[]
  tourists: string[]
  partnerBenefits: string[]
  requests: string[]
  years: string
  directionsCount: string
  countriesCount: string
  tripsCount: string
  cases: [CaseStudy, CaseStudy]
  phone: string
  telegramNick: string
  telegramUrl: string
  instagramNick: string
  instagramUrl: string
  vkNick: string
  vkUrl: string
  website: string
  qrTarget: 'telegram' | 'instagram' | 'vk' | 'website' | ''
  finalPhrase: string
}

export const initialMediaKitData: MediaKitData = {
  specialization: '', fullName: '', about: '', positioning: '', portrait: undefined,
  destinations: [''], tourists: [''], partnerBenefits: [''], requests: [''],
  years: '', directionsCount: '', countriesCount: '', tripsCount: '',
  cases: [
    { request: '', action: '', result: '' },
    { request: '', action: '', result: '' },
  ],
  phone: '', telegramNick: '', telegramUrl: '', instagramNick: '', instagramUrl: '',
  vkNick: '', vkUrl: '', website: '', qrTarget: '',
  finalPhrase: 'Буду рад(а) познакомиться и обсудить сотрудничество',
}

export const limits = {
  specialization: 54,
  fullName: 46,
  about: 350,
  positioning: 170,
  destination: 40,
  destinations: 4,
  tourist: 60,
  tourists: 5,
  partnerBenefit: 80,
  partnerBenefits: 3,
  request: 88,
  requests: 7,
  casePart: 155,
  contactNick: 44,
  finalPhrase: 120,
} as const
