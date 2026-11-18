'use server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getClient } from '@/lib/data'
import { playlistId, syncPlaylist } from '@/lib/spotify'

async function requireUser() {
  const payload = await getClient()
  const h = new Headers(await headers())
  h.delete('origin')
  const { user } = await payload.auth({ headers: h })
  if (!user) throw new Error('관리자 로그인이 필요해요.')
  return payload
}

export async function savePlaylist(_: unknown, form: FormData) {
  const payload = await requireUser()
  const url = String(form.get('playlistUrl') || '').trim()
  if (!playlistId(url)) return { error: 'open.spotify.com/playlist/… 형태의 링크를 넣어 주세요.' }
  await payload.updateGlobal({ slug: 'spotify-sync', overrideAccess: true, data: { playlistUrl: url } })
  revalidatePath('/spotify')
  return { ok: '플레이리스트를 저장했어요.' }
}

export async function syncNow() {
  const payload = await requireUser()
  const r = await syncPlaylist(payload)
  revalidatePath('/spotify')
  revalidatePath('/picks')
  if ('error' in r) return { error: r.error }
  if ('skipped' in r) return { error: r.skipped === 'no-playlist' ? '먼저 플레이리스트 링크를 저장해 주세요.' : 'Spotify 연결이 필요해요.' }
  return { ok: r.message }
}
