// 장르 지도 자리 계산 (DB 없이 따로 시험해 볼 수 있게 분리)
export type GenreGraph = {
  nodes: { id: number; name: string; slug: string; n: number; x: number; y: number; r: number }[]
  edges: { a: number; b: number; c: number; w: number }[]
  box: { w: number; h: number }
}

export function layoutGenres(
  nodes: { id: number; name: string; slug: string; n: number }[],
  rawPairs: { a: number; b: number; c: number }[],
): GenreGraph {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const pairs = rawPairs
    .filter((p) => byId.has(p.a) && byId.has(p.b))
    .map((p) => ({ ...p, w: p.c / Math.sqrt(byId.get(p.a)!.n * byId.get(p.b)!.n) }))
  // 장르마다 가장 가까운 5개만 (둘 중 한쪽이라도 고르면 이어요)
  const keep = new Set<string>()
  const per = new Map<number, typeof pairs>()
  for (const p of pairs) {
    per.set(p.a, [...(per.get(p.a) || []), p])
    per.set(p.b, [...(per.get(p.b) || []), p])
  }
  for (const list of per.values()) for (const p of list.sort((x, y) => y.w - x.w).slice(0, 5)) keep.add(`${p.a}|${p.b}`)
  const edges = pairs.filter((p) => keep.has(`${p.a}|${p.b}`))
  // 이어진 데가 없는 장르는 빼요
  const linked = new Set(edges.flatMap((e) => [e.a, e.b]))
  const list = nodes.filter((n) => linked.has(n.id)).sort((a, b) => b.n - a.n)

  // 자리 잡기: 큰 장르를 가운데부터 나선으로 놓고, 힘으로 펼쳐요 (항상 같은 모양이 나오게 무작위 없이)
  const W = 1800
  const H = 1200
  const N = list.length || 1
  const idx = new Map(list.map((n, i) => [n.id, i]))
  const pos = list.map((_, i) => {
    const a = i * 2.39996
    const r = 40 * Math.sqrt(i + 1)
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  })
  const k = Math.sqrt((W * H) / N) * 0.85
  const E = edges.filter((e) => idx.has(e.a) && idx.has(e.b)).map((e) => ({ i: idx.get(e.a)!, j: idx.get(e.b)!, w: e.w }))
  let temp = W / 8
  for (let it = 0; it < 420; it++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }))
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        const dx = pos[i].x - pos[j].x
        const dy = pos[i].y - pos[j].y
        const d2 = dx * dx + dy * dy + 0.01
        // 멀리 떨어진 장르끼리는 밀어내지 않아요 (외딴 무리가 끝없이 멀어지지 않게)
        if (d2 > 9 * k * k) continue
        const f = (k * k) / d2
        disp[i].x += dx * f
        disp[i].y += dy * f
        disp[j].x -= dx * f
        disp[j].y -= dy * f
      }
    for (const e of E) {
      const dx = pos[e.i].x - pos[e.j].x
      const dy = pos[e.i].y - pos[e.j].y
      const d = Math.sqrt(dx * dx + dy * dy) + 0.01
      const f = (d / k) * (0.6 + e.w * 3)
      disp[e.i].x -= dx * f * 0.5
      disp[e.i].y -= dy * f * 0.5
      disp[e.j].x += dx * f * 0.5
      disp[e.j].y += dy * f * 0.5
    }
    for (let i = 0; i < N; i++) {
      // 가운데로 끌어당겨 흩어지지 않게 (멀리 있을수록 세게), 가로로 조금 더 넓게
      const far = 1 + Math.hypot(pos[i].x, pos[i].y) / 700
      disp[i].x -= pos[i].x * 0.02 * far
      disp[i].y -= pos[i].y * 0.075 * far
      const d = Math.sqrt(disp[i].x ** 2 + disp[i].y ** 2) + 0.01
      const m = Math.min(d, temp)
      pos[i].x += (disp[i].x / d) * m
      pos[i].y += (disp[i].y / d) * m
    }
    temp = Math.max(1, temp * 0.985)
  }
  const maxN = list[0]?.n || 1
  // 동그라미와 이름이 겹치지 않게 살살 떼어 놓기
  const rad = list.map((n) => 7 + 26 * Math.sqrt(n.n / maxN))
  for (let it = 0; it < 160; it++) {
    let moved = false
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j].x - pos[i].x
        const dy = pos[j].y - pos[i].y
        const d = Math.hypot(dx, dy) || 0.01
        const need = rad[i] + rad[j] + 44
        if (d < need) {
          const push = (need - d) / 2
          const ux = dx / d
          const uy = dy / d
          pos[i].x -= ux * push
          pos[i].y -= uy * push
          pos[j].x += ux * push
          pos[j].y += uy * push
          moved = true
        }
      }
    if (!moved) break
  }
  const xs = pos.map((p) => p.x)
  const ys = pos.map((p) => p.y)
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  const out = list.map((n, i) => ({
    ...n,
    x: Math.round(pos[i].x - cx),
    y: Math.round(pos[i].y - cy),
    r: Math.round(rad[i]),
  }))
  const bw = Math.max(...out.map((n) => Math.abs(n.x) + n.r)) * 2 + 120
  const bh = Math.max(...out.map((n) => Math.abs(n.y) + n.r)) * 2 + 80
  return { nodes: out, edges: edges.filter((e) => idx.has(e.a) && idx.has(e.b)), box: { w: Math.round(bw), h: Math.round(bh) } }
}
