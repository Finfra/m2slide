// htmlart foreignObject 넘침 전수 계측 — 가로(over)·세로(overV) 둘 다 (Issue391)
//
// 실행:  ego-browser nodejs < z_test/htmlart-fo-audit.mjs
// 설정:  아래 BASE·FILES 만 바꾼다. file:// 도 dev-server http:// 도 된다.
//
// 🔴 기존 4종 계측(클리핑 조상·슬라이드 경계·형제 겹침)으로는 이 결함이 안 잡힌다 —
//    넘친 글자는 클리핑이 아니라 «이웃 SVG 도형에 덮여» 사라진다.
// ⚠️ 내부 div 를 기준으로 재면 0건이 나온다(오탐) — flex 자식이라 max-content 로 늘어나
//    텍스트는 언제나 div 안에 들어맞는다. 기준은 foreignObject 경계다.
// ⚠️ htmlart 는 비동기 렌더라 goto 후 2.2s 이상 기다려야 장을 다 센다.
// ⚠️ fs 는 viewBox 단위(스케일 전)라 화면 px 와 다르다 — 폰트 비교용이지 넘침 판정용이 아니다.
const BASE  = "http://127.0.0.1:9877/p/m2Slide_visual_component/n/5/1";   // 덱 URL (또는 file:///…/slide/)
const FILES = [""];                                                          // chapter 파일명 목록. 단일 URL 이면 [""]
const ONLY  = "";                                                            // 타입 필터 (ex "chevron"). 비우면 전 타입

const task = await taskSpace("htmlart fo overflow audit");
const page = task.page("p1");
let totSec = 0, totHa = 0, totFo = 0, totBad = 0;
for (const f of FILES) {
  await page.goto(BASE + f);
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(`Reveal.configure({transition:"none"})`);
  const nSec = await page.evaluate(`document.querySelectorAll('.reveal .slides > section').length`);
  const idx = await page.evaluate(`(() => [...document.querySelectorAll('.reveal .slides > section')]
      .map((s,i)=>({i, has:!!s.querySelector('svg[class^=ha-]')})).filter(o=>o.has).map(o=>o.i))()`);
  totSec += nSec; totHa += idx.length;
  let bad = 0, nfo = 0;
  for (const i of idx) {
    await page.evaluate(`Reveal.slide(${i})`);
    await new Promise(r => setTimeout(r, 450));
    const out = await page.evaluate(`(() => {
      const sec = Reveal.getCurrentSlide(); if(!sec) return {n:0,res:[]};
      const res = []; let n = 0;
      for (const fo of sec.querySelectorAll('foreignObject')) {
        const type = (fo.closest('svg')?.getAttribute('class')||'').replace(/^ha-/,'').replace(/-svg$/,'');
        if (${JSON.stringify(ONLY)} && type !== ${JSON.stringify(ONLY)}) continue;
        n++;
        const fr = fo.getBoundingClientRect();
        for (const d of fo.querySelectorAll('div')) {
          if (d.children.length) continue;                 // 잎 노드(실제 텍스트)만
          const t = d.textContent.trim(); if(!t) continue;
          const rng = document.createRange(); rng.selectNodeContents(d);
          const tr = rng.getBoundingClientRect();
          const over  = Math.max(fr.left - tr.left, tr.right - fr.right);
          const overV = Math.max(fr.top - tr.top, tr.bottom - fr.bottom);
          if (over > 1 || overV > 1) res.push({type, over:+over.toFixed(1), overV:+overV.toFixed(1),
            foW:Math.round(fr.width), txtW:Math.round(tr.width), fs:getComputedStyle(d).fontSize, txt:t.slice(0,22)});
        }
      }
      return {n, res:res.sort((a,b)=>Math.max(b.over,b.overV)-Math.max(a.over,a.overV)).slice(0,5)};
    })()`);
    nfo += out.n; bad += out.res.length;
    if (out.res.length) console.log("  🔴", f || BASE, "slide", i + 1, "(1-base)", JSON.stringify(out.res));
  }
  totFo += nfo; totBad += bad;
  console.log("##", f || BASE, "섹션", nSec, "· htmlart 장", idx.length, "· foreignObject", nfo, "· 넘침", bad);
}
console.log("== 합계: 섹션", totSec, "· htmlart 장", totHa, "· foreignObject", totFo, "· 넘침", totBad);
await task.finish({ keep: [] });
