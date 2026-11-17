'use client'
import { useActionState, useState } from 'react'
import { sendInquiry, subscribe, type FormState } from '@/app/(frontend)/actions'
import { Icon } from './ui'

const Honeypot = () => (
  <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
)

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribe, null)
  return (
    <form action={action} className="newsletter">
      <p className="label">Newsletter</p>
      {state?.ok ? (
        <p className="form-done">{state.message}</p>
      ) : (
        <>
          <div className="newsletter__row">
            <input
              type="email"
              name="email"
              required
              placeholder="이메일 주소"
              aria-label="뉴스레터 받을 이메일 주소"
              className="newsletter__input"
            />
            <button className="btn btn--light" type="submit" disabled={pending}>
              <span>{pending ? '...' : '구독하기'}</span>
              <Icon name="right" />
            </button>
          </div>
          <Honeypot />
          {state && !state.ok ? <p className="form-error">{state.message}</p> : null}
        </>
      )}
    </form>
  )
}

const KINDS = [
  { value: 'interview', label: '인터뷰' },
  { value: 'submission', label: '음원 제보' },
  { value: 'collab', label: '협업' },
  { value: 'etc', label: '기타' },
]

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendInquiry, null)
  const [kind, setKind] = useState('interview')
  if (state?.ok) {
    return (
      <div className="contact-form contact-form--done">
        <p className="h-md">{state.message}</p>
      </div>
    )
  }
  return (
    <form action={action} className="contact-form">
      <div className="field-row">
        <label className="field">
          <span className="label">이름</span>
          <input name="name" required maxLength={100} placeholder="이름을 입력해 주세요" />
        </label>
        <label className="field">
          <span className="label">이메일</span>
          <input name="email" type="email" required placeholder="name@email.com" />
        </label>
      </div>
      <fieldset className="field field--plain">
        <legend className="label">문의 유형</legend>
        <div className="chips">
          {KINDS.map((k) => (
            <label key={k.value} className={`chip${kind === k.value ? ' chip--active' : ''}`}>
              <input
                type="radio"
                name="kind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
                className="sr-only"
              />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span className="label">메시지</span>
        <textarea name="message" required rows={6} maxLength={5000} placeholder="문의 내용을 적어 주세요" />
      </label>
      <label className="check">
        <input type="checkbox" name="agree" required />
        <span>문의 답변을 위해 이름과 이메일을 수집·이용하는 데 동의합니다.</span>
      </label>
      <Honeypot />
      <div className="contact-form__submit">
        <p className="small muted">보내 주신 정보는 문의 답변 용도로만 사용합니다.</p>
        <button className="btn btn--filled" type="submit" disabled={pending}>
          <span>{pending ? '보내는 중...' : '보내기'}</span>
          <Icon name="right" />
        </button>
      </div>
      {state && !state.ok ? <p className="form-error">{state.message}</p> : null}
    </form>
  )
}
