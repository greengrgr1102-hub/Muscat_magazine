'use server'
import { getClient } from '@/lib/data'

export type FormState = { ok: boolean; message: string } | null

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const KINDS = ['interview', 'submission', 'collab', 'etc'] as const

export async function sendInquiry(_prev: FormState, form: FormData): Promise<FormState> {
  // 스팸 방지용 숨은 칸: 사람이 채우지 않는 칸이 채워져 있으면 조용히 무시합니다.
  if (form.get('website')) return { ok: true, message: '보내 주셔서 감사합니다.' }

  const name = String(form.get('name') || '').trim()
  const email = String(form.get('email') || '').trim()
  const kind = String(form.get('kind') || 'etc') as (typeof KINDS)[number]
  const message = String(form.get('message') || '').trim()
  const agree = form.get('agree')

  if (!name || !email || !message) return { ok: false, message: '이름, 이메일, 메시지를 모두 입력해 주세요.' }
  if (!EMAIL.test(email)) return { ok: false, message: '이메일 주소를 다시 확인해 주세요.' }
  if (!agree) return { ok: false, message: '개인정보 수집·이용에 동의해 주세요.' }
  if (message.length > 5000) return { ok: false, message: '메시지는 5,000자 이내로 적어 주세요.' }

  try {
    const payload = await getClient()
    await payload.create({
      collection: 'inquiries',
      data: { name: name.slice(0, 100), email, kind: KINDS.includes(kind) ? kind : 'etc', message },
      overrideAccess: true,
    })
    return { ok: true, message: '보내 주셔서 감사합니다. 확인 후 이메일로 답장드릴게요.' }
  } catch {
    return { ok: false, message: '잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' }
  }
}

export async function subscribe(_prev: FormState, form: FormData): Promise<FormState> {
  if (form.get('website')) return { ok: true, message: '구독해 주셔서 감사합니다.' }
  const email = String(form.get('email') || '').trim().toLowerCase()
  if (!EMAIL.test(email)) return { ok: false, message: '이메일 주소를 다시 확인해 주세요.' }
  try {
    const payload = await getClient()
    const exists = await payload.count({
      collection: 'subscribers',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    if (!exists.totalDocs) {
      await payload.create({ collection: 'subscribers', data: { email }, overrideAccess: true })
    }
    return { ok: true, message: '구독해 주셔서 감사합니다.' }
  } catch {
    return { ok: false, message: '잠시 문제가 생겼어요. 다시 시도해 주세요.' }
  }
}
