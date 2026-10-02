const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = "http://127.0.0.1:9877", P = "/p/m2Slide_chapter_mode";
const task = await taskSpace("pc matrix 2");
const safe = async (f, d) => { for (let i=0;i<5;i++){ try { return await f(); } catch(e){ await sleep(600);} } return d; };
try {
  const page = task.page("p1");
  await page.goto("about:blank");
  await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const open = async u => { await page.goto(B + u + "?t=" + Date.now()); await page.waitForLoadState(); await sleep(1800); };
  const st = () => safe(() => page.evaluate(() => ({ p: location.pathname + location.hash, n: document.querySelectorAll(".slides section").length, cur: window.Reveal ? JSON.stringify(Reveal.getIndices()) : null, last: window.Reveal ? Reveal.isLastSlide() : null })), {});
  const click = async sel => { const c = await safe(() => page.evaluate(sel => { const b = document.querySelector(sel); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x+r.width/2, y: r.y+r.height/2, disp: getComputedStyle(b).visibility + "/" + getComputedStyle(b).opacity, enabled: b.classList.contains("enabled") }; }, sel), null); if (!c) return null; for (const type of ["mousePressed","mouseReleased"]) await page.cdp("Input.dispatchMouseEvent", { type, x: c.x, y: c.y, button: "left", clickCount: 1 }); await sleep(1500); return c; };
  // ⇟ 도달 지점
  await open(P + "/n/1/1");
  for (const type of ["rawKeyDown","keyUp"]) await safe(() => page.cdp("Input.dispatchKeyEvent", { type, key: "PageDown", code: "PageDown", windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34 }));
  await sleep(2500); console.log("PgDown 도달", JSON.stringify(await st()));
  // 클릭
  await open(P + "/n/1/1"); await safe(() => page.evaluate(() => { location.hash = "#/3"; })); await sleep(700);
  const a = await st(); const c1 = await click(".controls .navigate-right"); const b = await st();
  console.log("CLICK right", JSON.stringify(c1), a.p, "=>", b.p);
  const c2 = await click(".controls .navigate-left"); const c = await st();
  console.log("CLICK left", JSON.stringify(c2), b.p, "=>", c.p);
  // 세로 쓸기 (페이지 뷰) — 합성
  await open(P + "/n/1/1"); await safe(() => page.evaluate(() => { location.hash = "#/3"; })); await sleep(700);
  const sw = await safe(() => page.evaluate(async () => {
    const keys = []; window.addEventListener("keydown", e => keys.push(e.key), true);
    const mk = (type, x, y) => { const t = new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y }); document.dispatchEvent(new TouchEvent(type, { touches: type === "touchend" ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); };
    const run = async (x0, y0, x1, y1) => { mk("touchstart", x0, y0); await new Promise(r => setTimeout(r, 40)); mk("touchmove", (x0+x1)/2, (y0+y1)/2); mk("touchend", x1, y1); await new Promise(r => setTimeout(r, 150)); };
    await run(700, 600, 700, 300); await run(700, 300, 700, 600); await run(900, 400, 500, 400);
    return { keys, scrollView: !!document.querySelector(".reveal-scroll") };
  }), null);
  console.log("SWIPE 페이지뷰(위·아래·가로)", JSON.stringify(sw));
} finally { }
