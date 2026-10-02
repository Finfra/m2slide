const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = "http://127.0.0.1:9877";
const out = [];
const task = await taskSpace("pc matrix");
try {
  const page = task.page("p1");
  await page.goto("about:blank");
  await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const key = async (k, code) => { for (const type of ["rawKeyDown","keyUp"]) { try { await page.cdp("Input.dispatchKeyEvent", { type, key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code }); } catch(e){} } await sleep(1500); try { await page.waitForLoadState(); } catch(e){} await sleep(500); };
  const st0 = () => page.evaluate(() => ({ p: location.pathname + location.search + location.hash, scroll: !!document.querySelector(".reveal-scroll"), idx: (window.Reveal && Reveal.getState && Reveal.getIndices) ? JSON.stringify(Reveal.getIndices()) : null }));
  const st = async () => { for (let i=0;i<6;i++){ try { return await st0(); } catch(e){ await sleep(700);} } return {p:"(조회 실패)"}; };
  const open = async u => { await page.goto(B + u + (u.includes("?") ? "&" : "?") + "t=" + Date.now()); await page.waitForLoadState(); await sleep(1800); };
  const rec = async (name, setup, k, code) => { await setup(); const a = await st(); await key(k, code); const b = await st(); out.push({ name, from: a.p, to: b.p, scroll: b.scroll }); console.log(name, a.p, "=>", b.p); };
  const P = "/p/m2Slide_chapter_mode";
  const goHash = async h => page.evaluate(h => { location.hash = h; }, h);
  // Chapter 모드
  await rec("Cover →", () => open(P + "/n/c"), "ArrowRight", 39);
  await rec("Cover ↓", () => open(P + "/n/c"), "ArrowDown", 40);
  await rec("Agenda ←", () => open(P + "/n/a"), "ArrowLeft", 37);
  await rec("Agenda →", () => open(P + "/n/a"), "ArrowRight", 39);
  await rec("Agenda ↑", () => open(P + "/n/a"), "ArrowUp", 38);
  await rec("Agenda ↓", () => open(P + "/n/a"), "ArrowDown", 40);
  await rec("TOC(ch1) ←", () => open(P + "/n/1/1"), "ArrowLeft", 37);
  await rec("TOC(ch1) ↑", () => open(P + "/n/1/1"), "ArrowUp", 38);
  await rec("TOC(ch1) ↓", () => open(P + "/n/1/1"), "ArrowDown", 40);
  await rec("TOC(ch1) →", () => open(P + "/n/1/1"), "ArrowRight", 39);
  await rec("본문(ch1 #/3) ←", async () => { await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600); }, "ArrowLeft", 37);
  await rec("본문(ch1 #/3) →", async () => { await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600); }, "ArrowRight", 39);
  await rec("본문(ch1 #/3) ↑", async () => { await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600); }, "ArrowUp", 38);
  await rec("본문(ch1 #/3) ↓", async () => { await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600); }, "ArrowDown", 40);
  await rec("⇞ PgUp (본문)", async () => { await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600); }, "PageUp", 33);
  await rec("⇟ PgDown (본문)", async () => { await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600); }, "PageDown", 34);
  await rec("⇤ Home (본문)", async () => { await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600); }, "Home", 36);
  await rec("⇥ End (본문)", async () => { await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600); }, "End", 35);
  // Single 모드
  const S = "/p/m2Slide_single_mode";
  await rec("S Cover →", () => open(S + "/n/c"), "ArrowRight", 39);
  await rec("S Agenda ←", () => open(S + "/n/a"), "ArrowLeft", 37);
  await rec("S Agenda →", () => open(S + "/n/a"), "ArrowRight", 39);
  // 클릭: Reveal 컨트롤 화살표
  await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600);
  const before = await st();
  const ctl = await page.evaluate(() => { const b = document.querySelector(".controls .navigate-right"); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, vis: getComputedStyle(b).visibility, op: getComputedStyle(document.querySelector(".controls")).display }; });
  if (ctl) { await page.cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: ctl.x, y: ctl.y, button: "left", clickCount: 1 }); await page.cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: ctl.x, y: ctl.y, button: "left", clickCount: 1 }); await sleep(800); }
  out.push({ name: "클릭 .navigate-right", ctl, from: before.p, to: (await st()).p });
  const ctl2 = await page.evaluate(() => { const b = document.querySelector(".controls .navigate-left"); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; });
  const b2 = await st();
  if (ctl2) { await page.cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: ctl2.x, y: ctl2.y, button: "left", clickCount: 1 }); await page.cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: ctl2.x, y: ctl2.y, button: "left", clickCount: 1 }); await sleep(800); }
  out.push({ name: "클릭 .navigate-left", ctl: ctl2, from: b2.p, to: (await st()).p });
  // 페이지 뷰 세로 스와이프 유지(A1 회귀): 합성 TouchEvent 위로 쓸기 → ArrowUp 키 합성
  await open(P + "/n/1/1"); await goHash("#/3"); await sleep(600);
  const sw = await page.evaluate(async () => {
    const keys = []; window.addEventListener("keydown", e => keys.push(e.key), true);
    const mk = (type, y) => { const t = new Touch({ identifier: 1, target: document.body, clientX: 700, clientY: y }); document.dispatchEvent(new TouchEvent(type, { touches: type === "touchend" ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); };
    const run = async (y0, y1) => { mk("touchstart", y0); await new Promise(r => setTimeout(r, 40)); mk("touchmove", (y0+y1)/2); mk("touchend", y1); await new Promise(r => setTimeout(r, 200)); };
    await run(600, 300); await run(300, 600);
    return { keys, scrollView: !!document.querySelector(".reveal-scroll"), path: location.pathname + location.hash };
  });
  out.push({ name: "페이지 뷰 세로 쓸기 키 합성 유지", sw });
} finally { await task.close?.(); }
console.log(JSON.stringify(out, null, 1));
