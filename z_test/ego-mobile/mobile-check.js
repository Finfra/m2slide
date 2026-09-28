// ego-mobile/mobile-check.js — ego-browser 로 m2slide 덱을 «아이폰·터치 전용» 으로 자동 테스트 (prj42#Issue415)
//
// run.sh 가 __URL__·__DECK__·__OUT__ 을 치환해 `ego-browser nodejs` 의 stdin 으로 넘긴다
// (ego 에는 env 가 전달되지 않는다 — 리터럴 주입이 유일한 경로).
// 원칙: 키 입력 0회. 조작은 CDP 터치(Input.dispatchTouchEvent · synthesizeScrollGesture)만.
// 에뮬레이션은 CDP 연결에 묶인 상태라 **이 한 회차 안에서만** 유효하다 — 핸드오프용이 아니다.

const URL = "__URL__", DECK = "__DECK__", OUT = "__OUT__";
const fs = await import("node:fs/promises");
await fs.mkdir(OUT, { recursive: true });
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { deck: DECK, url: URL, tests: [], shots: [] };
const rec = (id, name, pass, detail) => R.tests.push({ id, name, result: pass === null ? "INFO" : pass ? "PASS" : "FAIL", detail });

// 캡처는 간헐 15초 타임아웃이 있다(web-auto) — 3회 재시도
async function shot(page, file) {
  for (let i = 0; i < 3; i++) { try { await page.screenshot({ path: `${OUT}/${file}` }); R.shots.push(file); return; } catch (e) { if (i === 2) R.shots.push(`${file} (실패: ${String(e.message).slice(0, 60)})`); } }
}
async function emulate(page, w, h) {
  await page.cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 3, mobile: true });
  await page.cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await page.cdp("Emulation.setUserAgentOverride", { userAgent: IPHONE_UA });
}
async function tap(page, x, y) {
  await page.cdp("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await page.cdp("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
// 페이지 이동 감지용 표식 — 이동하면 새 문서라 표식이 사라진다
const mark = page => page.evaluate(() => { window.__egoSentinel = 1; return location.pathname; });
const alive = page => page.evaluate(() => ({ path: location.pathname, same: window.__egoSentinel === 1 }));

const task = await taskSpace(`m2slide 모바일 자동 테스트 — ${DECK}`);
try {
  const page = task.page("p1");
  await page.goto("about:blank");

  // ── 세로 390×844 (스크롤 뷰) ──────────────────────────────────────────
  await emulate(page, 390, 844);
  await page.goto(URL); await page.waitForLoadState(); await sleep(2000);

  // M4 Safari 안내창 — iPhone UA 라 뜬다. 탭으로 닫혀야 한다
  const btn = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button, a")].find(x => /계속 보기/.test(x.textContent));
    if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (btn) {
    await tap(page, btn.x, btn.y); await sleep(500);
    const gone = await page.evaluate(() => { const o = document.getElementById("m2-safari-warning"); return !o || getComputedStyle(o).display === "none" || !o.isConnected; });
    rec("M4", "Safari 안내창 탭으로 닫기", gone, gone ? "닫힘" : "탭 후에도 남아 있음");
  } else rec("M4", "Safari 안내창 탭으로 닫기", null, "안내창 없음");

  const st = await page.evaluate(() => {
    const ps = [...document.querySelectorAll(".scroll-page")];
    return {
      scrollView: !!document.querySelector(".reveal-scroll"), vh: innerHeight, pages: ps.length,
      pageH: ps.map(p => Math.round(p.getBoundingClientRect().height)), frags: ps.map(p => p.querySelectorAll(".fragment").length),
      arts: [...document.querySelectorAll(".m2-htmlart")].map(a => ({ kind: (a.className.match(/htmlart-(\w+)/) || [, "?"])[1], h: Math.round(a.getBoundingClientRect().height) })),
    };
  });
  rec("M1", "스크롤 뷰 진입 (폭 390)", st.scrollView, `scroll-page ${st.pages}장`);
  // 마지막 장은 reveal 이 «끝 장도 화면 맨 위까지 올릴 수 있게» 뷰포트 높이만큼 여백을 붙인다(실측 260+844=1104)
  // — 간격 결함이 아니므로 판정에서 빼고 참고로만 보고한다
  const body = st.pageH.slice(0, -1).filter((_, i) => !st.frags[i]), maxH = Math.max(0, ...body), last = st.pageH[st.pageH.length - 1] || 0;
  const fragPages = st.pageH.map((h, i) => st.frags[i] ? `${i + 1}장 ${h}px(fragment ${st.frags[i]})` : null).filter(Boolean);
  rec("M2", "세로 간격 compact (마지막·fragment 장 제외, 장 높이 < 화면 높이/2)", body.length > 0 && maxH < st.vh / 2, `장 높이 최대 ${maxH}px · 화면 ${st.vh}px`);
  rec("M2i", "마지막 장 끝 여백 (reveal 설계)", null, `마지막 장 ${last}px (slide + 뷰포트 여백이면 ${st.vh}px 초과)` + (fragPages.length ? ` · fragment 장(단계마다 화면 한 높이 고정 스크롤): ${fragPages.join(", ")}` : ""));
  const zero = st.arts.filter(a => a.h <= 0);
  rec("M3", "htmlArt 전 블록 렌더 (높이 > 0)", st.arts.length === 0 ? null : zero.length === 0,
    st.arts.length ? st.arts.map(a => `${a.kind}:${a.h}`).join(" · ") : "htmlArt 없음");

  // 슬라이드별 캡처 — 스크롤 위치 이동은 검증이 아니라 기록용이라 scrollIntoView 사용
  for (let i = 0; i < st.pages; i++) {
    await page.evaluate(i => document.querySelectorAll(".scroll-page")[i]?.scrollIntoView({ behavior: "instant" }), i); await sleep(300);
    await shot(page, `portrait-${String(i + 1).padStart(2, "0")}.png`);
  }

  // ⚠️ ego 에서는 CDP 로 손가락 스크롤을 못 만든다 — synthesizeScrollGesture 는 CDP 타임아웃,
  //    dispatchTouchEvent 드래그는 호출당 수백 ms 라 7s 걸리고 scrollTop 이 안 움직였다(2026-09-24 실측).
  //    그래서 «도달 가능성» 은 스크롤 위치 지정으로, «제스처 오인» 은 페이지 내 TouchEvent 합성으로 가른다.

  // M5 스크롤로 전 장 도달 — 각 장의 시작 위치까지 스크롤이 실제로 가는가
  // 실제로 스크롤되는 요소를 가정하지 않는다 — 터치 에뮬·iPhone UA 에서 `.reveal-viewport.scrollTo` 가 무반응이었다
  //   (scrollIntoView 는 동작, 2026-09-24 실측). 판정은 «그 장이 화면 맨 위에 왔는가» 또는 «끝이라 더 못 가는가»
  const reach = await page.evaluate(async () => {
    const ps = [...document.querySelectorAll(".scroll-page")], miss = [];
    for (let i = 0; i < ps.length; i++) {
      ps[i].scrollIntoView({ block: "start", behavior: "instant" }); await new Promise(r => setTimeout(r, 150));
      const top = Math.round(ps[i].getBoundingClientRect().top);
      const atEnd = Math.round(ps[ps.length - 1].getBoundingClientRect().bottom) <= innerHeight + 2;   // 끝에 닿아 더 못 올라감
      if (Math.abs(top) > 2 && !(atEnd && top > 0)) miss.push(`${i + 1}(top ${top})`);
    }
    ps[0].scrollIntoView({ block: "start", behavior: "instant" }); return { total: ps.length, miss };
  });
  rec("M5", "스크롤로 전 장 도달", reach.miss.length === 0, reach.miss.length ? `도달 실패 장: ${reach.miss.join(",")}` : `${reach.total}장 전부 도달`);

  // M6 세로 쓸기(=스크롤 손짓)가 페이지를 이동시키지 않는가 — A1. 실제 손가락 속도(120ms)로 합성
  const flick = async (fromY, toY) => {
    await page.evaluate(() => { const v = document.querySelector(".reveal-viewport"); const ps = document.querySelectorAll(".scroll-page"); ps[Math.min(2, ps.length - 1)].scrollIntoView({ block: "start", behavior: "instant" }); });
    await sleep(300); const p0 = await mark(page);
    const keys = await page.evaluate(async ([a, b]) => {
      const keys = []; window.addEventListener("keydown", e => keys.push(e.key), true);
      const el = document.elementFromPoint(195, 420);
      const T = y => new Touch({ identifier: 1, target: el, clientX: 195, clientY: y });
      el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [T(a)], changedTouches: [T(a)] }));
      await new Promise(r => setTimeout(r, 120));
      el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [T(b)] }));
      await new Promise(r => setTimeout(r, 100)); return keys;
    }, [fromY, toY]).catch(() => ["(평가 중 페이지 이동)"]);
    await sleep(1500);
    const a = await alive(page).catch(() => ({ path: "?", same: false }));
    return { keys, from: p0, to: a.path, moved: !a.same };
  };
  const up = await flick(650, 400), down = await flick(400, 650);
  const bad = [up, down].filter(f => f.keys.length || f.moved);
  rec("M6", "세로 쓸기가 키 합성·페이지 이동을 일으키지 않음 (A1)", bad.length === 0,
    [["위로 쓸기", up], ["아래로 쓸기", down]].map(([n, f]) => `${n}: 키 [${f.keys.join(",") || "없음"}]${f.moved ? ` → 페이지 이동 ${f.from} → ${f.to}` : ""}`).join(" / "));
  if (bad.some(f => f.moved)) await shot(page, "portrait-after-flick.png");

  // ── 가로 844×390 (페이지 뷰) ──────────────────────────────────────────
  await emulate(page, 844, 390);
  await page.goto(URL); await page.waitForLoadState(); await sleep(2000);
  const lb = await page.evaluate(() => { const b = [...document.querySelectorAll("button, a")].find(x => /계속 보기/.test(x.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (lb) { await tap(page, lb.x, lb.y); await sleep(400); }
  for (let i = 0; i < 20 && (await page.evaluate(() => typeof Reveal)) === "undefined"; i++) await sleep(300);
  const h0 = await page.evaluate(() => ({ scrollView: !!document.querySelector(".reveal-scroll"), h: Reveal.getIndices().h, path: location.pathname }));
  // 빠른 가로 스와이프(오른쪽→왼쪽 = 다음) — CDP 로는 2.9s 걸려 700ms 게이트에 걸린다(실측). 페이지 내 합성 120ms
  // ⚠️ touchend 는 페이지 안 setTimeout 으로 예약하고 evaluate 는 바로 돌려받는다. touchend 를 await 한
  //    뒤 반환하면 표지의 «다음»(agenda 페이지 이동)이 응답보다 먼저 커밋돼 `Inspected target navigated
  //    or closed` 로 throw → L1 이 기록되지 않는다(aTest 3회 중 2회 실측, Issue426). 이동 결과는 아래 재시도가 잰다
  await page.evaluate(() => {
    const el = document.elementFromPoint(422, 195);
    const T = x => new Touch({ identifier: 2, target: el, clientX: x, clientY: 195 });
    el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [T(640)], changedTouches: [T(640)] }));
    setTimeout(() => el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [T(200)] })), 120);
  });
  // 표지의 «다음» 은 agenda 페이지 이동일 수 있다 — 새 문서가 뜨는 동안 평가가 실패하므로 재시도
  let h1 = null;
  for (let i = 0; i < 10 && !h1; i++) {
    await sleep(600);
    h1 = await page.evaluate(() => ({ h: typeof Reveal === "undefined" ? -1 : Reveal.getIndices().h, path: location.pathname })).catch(() => null);
  }
  const fwd = h1 && (h1.h > h0.h || h1.path !== h0.path);
  rec("L1", "가로 모드 스와이프로 다음으로 이동", !h0.scrollView && !!fwd, `페이지 뷰=${!h0.scrollView} · ${h0.path}#${h0.h} → ${h1 ? `${h1.path}#${h1.h}` : "?"}`);
  await shot(page, "landscape.png");
} catch (e) {
  rec("ERR", "실행 오류", false, String(e.message).slice(0, 200));
} finally {
  await task.finish({ keep: [] });   // 반드시 1회 — 누락 시 스페이스가 쌓인다
}
await fs.writeFile(`${OUT}/result.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
