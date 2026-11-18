import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@/components/RichText'
import { ViewTracker } from '@/components/Track'
import { ArrowLink, CardGrid, Chip, Icon, Img, ListenLinks, SectionHeader, articleHref } from '@/components/ui'
import type { Article, User } from '@/payload-types'
import {
  TYPE_LABEL,
  asArtists,
  asMedia,
  formatDate,
  getArticle,
  nextArticle,
  relatedArticles,
} from '@/lib/data'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArticle(decodeURIComponent(slug))
  if (!a) return {}
  const cover = asMedia(a.cover)
  return {
    title: a.title,
    description: a.excerpt || undefined,
    openGraph: { title: a.title, description: a.excerpt || undefined, images: cover?.url ? [cover.url] : undefined },
  }
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params
  const article = await getArticle(decodeURIComponent(slug))
  if (!article) notFound()

  const [related, next] = await Promise.all([relatedArticles(article), nextArticle(article)])
  const artists = asArtists(article.artists)
  const author = typeof article.author === 'object' ? (article.author as User | null) : null
  const isPlaylist = article.type === 'playlist'

  const metaInfo: [string, React.ReactNode][] = [
    ['Category', TYPE_LABEL[article.type]],
    ['Published', formatDate(article.publishedAt)],
  ]
  if (author?.name) metaInfo.push(['Editor', author.name])
  if (artists.length)
    metaInfo.push([
      'Artists',
      <span key="a" className="inline-links">
        {artists.map((ar, i) => (
          <span key={ar.id}>
            <Link href={`/artists/${ar.slug}`} className="underline">
              {ar.name}
            </Link>
            {i < artists.length - 1 ? ', ' : ''}
          </span>
        ))}
      </span>,
    ])

  const meta = [formatDate(article.publishedAt)]
  if (isPlaylist && article.tracks?.length) meta.push(`${article.tracks.length}곡`)
  if (article.type === 'release' && article.releases?.length) meta.push(`이번 주 ${article.releases.length}건`)
  if (article.readingTime) meta.push(`읽는 시간 ${article.readingTime}분`)

  return (
    <article>
      <ViewTracker kind="article" id={article.id} />
      <header className="article-head wrap">
        <ArrowLink href="/articles" back>
          Articles
        </ArrowLink>
        <div className="article-head__meta">
          <Chip href={`/articles?type=${article.type}`}>{TYPE_LABEL[article.type]}</Chip>
          {meta.map((m) => (
            <span key={m} className="label">
              {m}
            </span>
          ))}
        </div>
        <h1 className="h-xl article-head__title">{article.title}</h1>
        {article.excerpt ? <p className="body-lg muted article-head__lead">{article.excerpt}</p> : null}
      </header>

      {isPlaylist ? (
        <PlaylistBody article={article} />
      ) : (
        <>
          {article.type !== 'release' || asMedia(article.cover) ? (
            <div className="wrap">
              <Img media={article.cover} label="Cover image" ratio="16 / 9" tone="tint" sizes="100vw" priority />
            </div>
          ) : null}
          <div className="article-body wrap grid12">
            <aside className="article-side col-3">
              <dl className="meta-list">
                {metaInfo.map(([k, v]) => (
                  <div key={k}>
                    <dt className="label">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </aside>
            <div className={`article-content ${article.type === 'release' ? 'col-9' : 'col-7 col-start-5'}`}>
              <RichText data={article.intro} className="prose prose--lead" />
              {article.type === 'review' ? <ReviewBody article={article} /> : null}
              {article.type === 'interview' ? <InterviewBody article={article} /> : null}
              {article.type === 'release' ? <ReleaseBody article={article} /> : null}
              <RichText data={article.body} />
              <Gallery items={article.gallery} />
              <ListenLinks links={article.listen} label="Listen" />
              {article.tags?.length ? (
                <div className="chips">
                  {article.tags.map((t) => (
                    <Chip key={t} href={`/search?q=${encodeURIComponent(t)}`}>
                      #{t}
                    </Chip>
                  ))}
                </div>
              ) : null}
              {article.type === 'interview' && artists[0] ? (
                <Link href={`/artists/${artists[0].slug}`} className="artist-link">
                  <Img media={artists[0].photo} ratio="1 / 1" className="artist-link__img" />
                  <span className="artist-link__name">
                    <span className="label">Artist</span>
                    <span className="h-sm">{artists[0].name}</span>
                  </span>
                  <span className="arrow-link">
                    <span className="hide-mobile">아티스트 페이지 보기</span>
                    <Icon name="right" />
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}

      {next ? (
        <div className="wrap">
          <Link href={articleHref(next)} className="next-article">
            <span>
              <span className="label">Next</span>
              <span className="h-lg">{next.title}</span>
            </span>
            <Icon name="right" size={48} />
          </Link>
        </div>
      ) : null}

      {related.length ? (
        <section className="wrap section">
          <SectionHeader title={artists.length && article.type === 'interview' ? 'More from this artist' : 'More articles'} />
          <CardGrid articles={related} />
        </section>
      ) : null}
    </article>
  )
}

function ReviewBody({ article }: { article: Article }) {
  return (
    <>
      {(article.albums || []).map((al, i) => (
        <section key={al.id || i} className="album-block">
          <p className="label">{String(i + 1).padStart(2, '0')}</p>
          <h2 className="h-md">
            {al.albumTitle}
            {al.artistName ? ` — ${al.artistName}` : ''}
          </h2>
          {asMedia(al.cover) ? (
            <Img media={al.cover} ratio="1 / 1" className="album-block__cover" sizes="(max-width: 768px) 100vw, 400px" />
          ) : null}
          <RichText data={al.body} />
          <ListenLinks links={al.listen} />
        </section>
      ))}
      {article.editorsPick?.length ? (
        <div className="pick">
          <p className="label">Editor&apos;s Pick</p>
          <ol>
            {article.editorsPick.map((t, i) => (
              <li key={t.id || i}>
                <span className="label">{String(i + 1).padStart(2, '0')}</span>
                <span className="pick__title">{t.trackTitle}</span>
                <span className="small muted">{t.artistName}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </>
  )
}

function InterviewBody({ article }: { article: Article }) {
  return (
    <>
      {(article.qa || []).map((q, i) => (
        <div key={q.id || i} className="qa">
          {q.background ? <p className="qa__bg">{q.background}</p> : null}
          <div className="qa__row qa__q">
            <span className="qa__mark qa__mark--q">Q.</span>
            <p className="h-md">{q.question}</p>
          </div>
          <div className="qa__row">
            <span className="qa__mark">A.</span>
            <RichText data={q.answer} />
          </div>
          {q.pullQuote ? <blockquote className="pull-quote h-lg">{q.pullQuote}</blockquote> : null}
        </div>
      ))}
    </>
  )
}

const KIND: Record<string, string> = { album: '정규 앨범', ep: 'EP', single: '싱글', live: '라이브 앨범' }

function ReleaseBody({ article }: { article: Article }) {
  const list = article.releases || []
  const groups = [
    { title: 'Album · EP', items: list.filter((r) => r.kind !== 'single') },
    { title: 'Single', items: list.filter((r) => r.kind === 'single') },
  ].filter((g) => g.items.length)
  return (
    <>
      {groups.map((g) => (
        <section key={g.title} className="release-group">
          <SectionHeader title={g.title} right={<span className="muted">{g.items.length}</span>} />
          <ul className="release-list">
            {g.items.map((r, i) => (
              <li key={r.id || i} className="release">
                <Img media={r.cover} ratio="1 / 1" className="release__cover" label="1:1" sizes="96px" />
                <span className="label release__date">
                  {formatDate(r.date, true)}
                  <span className="show-mobile"> · {KIND[r.kind || 'single']}</span>
                </span>
                <span className="release__title">
                  <span className="h-md">{r.releaseTitle}</span>
                  <span className="small muted">
                    {r.artistName}
                    <span className="hide-mobile"> · {KIND[r.kind || 'single']}</span>
                  </span>
                </span>
                <span className="muted release__note">{r.note}</span>
                {r.url ? (
                  <a className="chip chip--link" href={r.url} target="_blank" rel="noreferrer">
                    <span>듣기</span>
                    <Icon name="upright" size={14} />
                  </a>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function PlaylistBody({ article }: { article: Article }) {
  const tracks = article.tracks || []
  return (
    <div className="wrap playlist grid12">
      <div className="col-5 playlist__cover">
        <Img media={article.cover} ratio="1 / 1" tone="tint" label="Playlist cover 1:1" sizes="(max-width: 768px) 100vw, 40vw" priority />
        <ListenLinks links={article.listen} label="전체 듣기" large />
      </div>
      <div className="col-6 col-start-7 playlist__content">
        <RichText data={article.intro} className="prose prose--lead" />
        <ol className="tracklist">
          {tracks.map((t, i) => {
            const Row = t.url ? 'a' : 'div'
            return (
              <li key={t.id || i}>
                <Row className="track" {...(t.url ? { href: t.url, target: '_blank', rel: 'noreferrer' } : {})}>
                  <span className="label">{String(i + 1).padStart(2, '0')}</span>
                  <span className="track__info">
                    <span className="h-sm">{t.trackTitle}</span>
                    <span className="small muted">{t.artistName}</span>
                  </span>
                  <span className="small muted track__note">{t.note}</span>
                  <span className="label">{t.duration}</span>
                  {t.url ? <Icon name="upright" /> : <span />}
                </Row>
              </li>
            )
          })}
        </ol>
        <RichText data={article.body} />
      </div>
    </div>
  )
}

function Gallery({ items }: { items: Article['gallery'] }) {
  const photos = (items || []).map((m) => asMedia(m)).filter((m): m is NonNullable<ReturnType<typeof asMedia>> => Boolean(m?.url))
  if (!photos.length) return null
  return (
    <div className={`gallery ${photos.length === 1 ? 'gallery--single' : ''}`}>
      {photos.map((m) => (
        <figure key={m.id} className="gallery__item">
          <Img media={m} ratio={m.width && m.height ? `${m.width} / ${m.height}` : '4 / 3'} sizes="(max-width: 900px) 100vw, 50vw" />
          {m.alt ? <figcaption className="small muted">{m.alt}</figcaption> : null}
        </figure>
      ))}
    </div>
  )
}
