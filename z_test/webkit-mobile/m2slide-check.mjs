// webkit-mobile/m2slide-check.mjs — m2slide 덱 전용 모바일 검사 (prj3#Issue848 · ego-mobile/mobile-check.js 이식)
//
// 공용 러너 ~/.claude/skills/mobile-test 의 --check 모듈이다 — run.sh 가 넘긴다.
// 계약: export default async (page, ctx) => [{ id, name, result: PASS|FAIL|INFO, detail }]
//   page 는 러너가 이미 덱 URL 로 띄운 Playwright WebKit 페이지(아이폰 기기 에뮬, 세로)
//   ctx = { name, url, out, shot(file), viewport, landscape }
// ego 판과 다른 점
//   * 엔진이 WebKit 이라 아이폰 Safari 와 같은 렌더러로 판정한다(ego 는 Blink + iPhone UA)
//   * 세로 높이는 실제 Safari 가시 영역(iPhone 15 = 393×659) — ego 는 390×844
//   * 탭은 Playwright 네이티브 touchscreen.tap · 쓸기는 locator.dispatchEvent 로 TouchEvent 합성
//     (WebKit macOS 빌드는 페이지 안 `new Touch()` 가 Illegal constructor — ego 의 페이지 내 합성을 그대로 못 쓴다)
// Playwright 를 import 하지 않는다 — 이 파일은 jma 로 복사돼 러너 런타임 밑에서 돈다

const rec = (T, id, name, pass, detail) => T.push({ id, name, result: pass === null ? 'INFO' : pass ? 'PASS' : 'FAIL', detail });

// 페이지 이동 감지 표식 — 이동하면 새 문서라 표식이 사라진다
const mark = page => page.evaluate(() => { window.__mtSentinel = 1; return location.pathname; });
const alive = page => page.evaluate(() => ({ path: location.pathname, same: window.__mtSentinel === 1 }));

const findContinue = page => page.evaluate(() => {
  const b = [...document.querySelectorAll('button, a')].find(x => /계속 보기/.test(x.textContent));
  if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});

// 손가락 쓸기 — (x0,y0) 에서 (x1,y1) 로 ms 동안. 시작점 요소에 touchstart → touchend 를 보낸다
// touchend 직후 페이지가 이동할 수 있어(표지 «다음» = agenda 이동) 그 실패는 삼키고 결과는 호출자가 잰다
async function swipe(page, [x0, y0], [x1, y1], ms = 120) {
  const el = await page.evaluateHandle(([x, y]) => document.elementFromPoint(x, y), [x0, y0]);
  const pt = (x, y) => [{ identifier: 1, clientX: x, clientY: y }];
  await el.dispatchEvent('touchstart', { touches: pt(x0, y0), changedTouches: pt(x0, y0) });
  await page.waitForTimeout(ms);
  await el.dispatchEvent('touchend', { touches: [], changedTouches: pt(x1, y1) }).catch(() => {});
}

export default async function m2slideCheck(page, ctx) {
  const T = [];
  const { width: W } = ctx.viewport;

  // ── 세로 (스크롤 뷰) ────────────────────────────────────────────────
  // M4 Safari 안내창 — 아이폰 UA 라 뜬다. 탭으로 닫혀야 한다
  const btn = await findContinue(page);
  if (btn) {
    await page.touchscreen.tap(btn.x, btn.y); await page.waitForTimeout(500);
    const gone = await page.evaluate(() => { const o = document.getElementById('m2-safari-warning'); return !o || !o.isConnected || getComputedStyle(o).display === 'none'; });
    rec(T, 'M4', 'Safari 안내창 탭으로 닫기', gone, gone ? '닫힘' : '탭 후에도 남아 있음');
  } else rec(T, 'M4', 'Safari 안내창 탭으로 닫기', null, '안내창 없음');

  const st = await page.evaluate(() => {
    const ps = [...document.querySelectorAll('.scroll-page')];
    return {
      scrollView: !!document.querySelector('.reveal-scroll'), vh: innerHeight, pages: ps.length,
      pageH: ps.map(p => Math.round(p.getBoundingClientRect().height)), frags: ps.map(p => p.querySelectorAll('.fragment').length),
      arts: [...document.querySelectorAll('.m2-htmlart')].map(a => ({ kind: (a.className.match(/htmlart-(\w+)/) || [, '?'])[1], h: Math.round(a.getBoundingClientRect().height) })),
    };
  });
  rec(T, 'M1', `스크롤 뷰 진입 (폭 ${W})`, st.scrollView, `scroll-page ${st.pages}장`);
  // 마지막 장은 reveal 이 «끝 장도 화면 맨 위까지 올릴 수 있게» 뷰포트 높이만큼 여백을 붙인다 — 판정에서 빼고 참고로만
  const body = st.pageH.slice(0, -1).filter((_, i) => !st.frags[i]), maxH = Math.max(0, ...body), last = st.pageH[st.pageH.length - 1] || 0;
  const fragPages = st.pageH.map((h, i) => st.frags[i] ? `${i + 1}장 ${h}px(fragment ${st.frags[i]})` : null).filter(Boolean);
  rec(T, 'M2', '세로 간격 compact (마지막·fragment 장 제외, 장 높이 < 화면 높이/2)', body.length > 0 && maxH < st.vh / 2, `장 높이 최대 ${maxH}px · 화면 ${st.vh}px`);
  rec(T, 'M2i', '마지막 장 끝 여백 (reveal 설계)', null, `마지막 장 ${last}px (slide + 뷰포트 여백이면 ${st.vh}px 초과)` + (fragPages.length ? ` · fragment 장: ${fragPages.join(', ')}` : ''));
  const zero = st.arts.filter(a => a.h <= 0);
  rec(T, 'M3', 'htmlArt 전 블록 렌더 (높이 > 0)', st.arts.length === 0 ? null : zero.length === 0,
    st.arts.length ? st.arts.map(a => `${a.kind}:${a.h}`).join(' · ') : 'htmlArt 없음');

  // 슬라이드별 캡처 — 기록용이라 scrollIntoView
  for (let i = 0; i < st.pages; i++) {
    await page.evaluate(i => document.querySelectorAll('.scroll-page')[i]?.scrollIntoView({ behavior: 'instant' }), i);
    await page.waitForTimeout(300);
    await ctx.shot(`portrait-${String(i + 1).padStart(2, '0')}.png`);
  }

  // M5 스크롤로 전 장 도달 — 끝 장이 화면 맨 위까지 못 오르는 것은 «끝에 닿음» 으로 인정
  const reach = await page.evaluate(async () => {
    const ps = [...document.querySelectorAll('.scroll-page')], miss = [];
    for (let i = 0; i < ps.length; i++) {
      ps[i].scrollIntoView({ block: 'start', behavior: 'instant' }); await new Promise(r => setTimeout(r, 150));
      const top = Math.round(ps[i].getBoundingClientRect().top);
      const atEnd = Math.round(ps[ps.length - 1].getBoundingClientRect().bottom) <= innerHeight + 2;
      if (Math.abs(top) > 2 && !(atEnd && top > 0)) miss.push(`${i + 1}(top ${top})`);
    }
    ps[0].scrollIntoView({ block: 'start', behavior: 'instant' }); return { total: ps.length, miss };
  });
  rec(T, 'M5', '스크롤로 전 장 도달', reach.miss.length === 0, reach.miss.length ? `도달 실패 장: ${reach.miss.join(',')}` : `${reach.total}장 전부 도달`);

  // M6 세로 쓸기(=스크롤 손짓)가 페이지를 이동시키지 않는가 — 실제 손가락 속도(120ms)
  const cx = Math.round(W / 2), cy = Math.round(st.vh / 2);
  const flick = async (fromY, toY) => {
    await page.evaluate(() => { const ps = document.querySelectorAll('.scroll-page'); ps[Math.min(2, ps.length - 1)]?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    await page.waitForTimeout(300); const p0 = await mark(page);
    await page.evaluate(() => { window.__mtKeys = []; addEventListener('keydown', e => window.__mtKeys.push(e.key), true); });
    await swipe(page, [cx, fromY], [cx, toY]);
    await page.waitForTimeout(1500);
    const a = await alive(page).catch(() => ({ path: '?', same: false }));
    const keys = a.same ? await page.evaluate(() => window.__mtKeys).catch(() => []) : [];   // 이동했으면 새 문서라 키 기록도 없다
    return { keys, from: p0, to: a.path, moved: !a.same };
  };
  const up = await flick(cy + 120, cy - 120), down = await flick(cy - 120, cy + 120);
  const bad = [up, down].filter(f => f.keys.length || f.moved);
  rec(T, 'M6', '세로 쓸기가 페이지를 이동시키지 않음', bad.length === 0,
    [['위로', up], ['아래로', down]].map(([k, f]) => `${k}: 키 ${f.keys.length ? f.keys.join(',') : '없음'}${f.moved ? ` · 이동 ${f.from} → ${f.to}` : ''}`).join(' / '));
  if (bad.some(f => f.moved)) await ctx.shot('portrait-after-flick.png');

  // ── 가로 (페이지 뷰) ────────────────────────────────────────────────
  if (!ctx.landscape) { rec(T, 'L1', '가로 모드 스와이프로 다음으로 이동', null, `가로 기기 정의 없음 (${ctx.device} landscape)`); return T; }
  const { width: LW, height: LH } = ctx.landscape;
  await page.setViewportSize(ctx.landscape);
  await page.goto(ctx.url, { waitUntil: 'load' }); await page.waitForTimeout(2000);
  const lb = await findContinue(page);
  if (lb) { await page.touchscreen.tap(lb.x, lb.y); await page.waitForTimeout(400); }
  for (let i = 0; i < 20 && (await page.evaluate(() => typeof Reveal)) === 'undefined'; i++) await page.waitForTimeout(300);
  const h0 = await page.evaluate(() => ({ scrollView: !!document.querySelector('.reveal-scroll'), h: Reveal.getIndices().h, path: location.pathname }));
  // 빠른 가로 스와이프(오른쪽→왼쪽 = 다음) — 700ms 게이트 안쪽 120ms
  const ly = Math.round(LH / 2);
  await swipe(page, [Math.round(LW * 0.76), ly], [Math.round(LW * 0.24), ly]);
  // 표지의 «다음» 은 agenda 페이지 이동일 수 있다 — 새 문서가 뜨는 동안 평가가 실패하므로 재시도
  let h1 = null;
  for (let i = 0; i < 10 && !h1; i++) {
    await page.waitForTimeout(600);
    h1 = await page.evaluate(() => ({ h: typeof Reveal === 'undefined' ? -1 : Reveal.getIndices().h, path: location.pathname })).catch(() => null);
  }
  const fwd = h1 && (h1.h > h0.h || h1.path !== h0.path);
  rec(T, 'L1', '가로 모드 스와이프로 다음으로 이동', !h0.scrollView && !!fwd, `${LW}×${LH} · 페이지 뷰=${!h0.scrollView} · ${h0.path}#${h0.h} → ${h1 ? `${h1.path}#${h1.h}` : '?'}`);
  await ctx.shot('landscape.png');
  await page.setViewportSize(ctx.viewport);
  return T;
}
