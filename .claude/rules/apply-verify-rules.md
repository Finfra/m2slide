---
name: apply-verify-rules
description: m2slide 코드·템플릿·CSS 수정 후 빌드→HTML 검증→브라우저 표시까지의 적용 검증 절차
date: 2026-05-03
---

# 적용 트리거

m2slide 저장소(`lib/m2slide/`) 내 다음 파일을 수정한 직후 자동 발동:

* `generate-slides.js`, `generate-epub.js`, `lib/**/*.js` (코어 변환 로직)
* `theme/**/*.html` (layout 템플릿)
* `theme/**/*.css`, `lib/css/*.css` (스타일)
* `Projects/{Name}/**/*.md`, `Projects/{Name}/_config.yml` (프로젝트 콘텐츠·설정. 구 `_meta.yml` 은 Issue79 에서 폐기 — 메타는 슬라이드 소스 frontmatter 소유)
* `m2slide.sh`, `run.sh` 등 빌드 스크립트

위 변경이 한 건이라도 발생하면 사용자에게 별도 확인 없이 검증 절차를 즉시 수행함.

# 핵심 절차 (필수 순서)

## 1. 대상 프로젝트 결정

`/run` 커맨드와 동일한 우선순위 적용:

| 순위 | 소스                                                                              | 비고                                                                                  |
| :--- | :-------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| 1    | 사용자가 명시한 프로젝트명                                                        | "MarkdownGraph 빌드해줘" 등 직접 지시                                                 |
| 2    | 수정한 파일이 속한 프로젝트                                                       | `Projects/{Name}/...` 경로에서 `{Name}` 추출                                          |
| 3    | IDE 컨텍스트                                                                      | `<ide_opened_file>` / `<ide_selection>`에서 `Projects/{Name}/` 캡처                   |
| 4    | 영향 범위가 글로벌(`generate-slides.js`, `theme/default/`, `lib/css/base.css` 등) | 대표 프로젝트 다수 빌드 — `m2Slide_single_mode`, `m2Slide_chapter_mode`, `layoutTest` |

결정 근거를 한 줄로 사용자에게 알림.

## 1.5 Effective theme 확정 (theme/**/slide.css·layouts 편집 시 필수)

`theme/{name}/slide.css`, `theme/{name}/layouts/*.html`, `theme/{name}/palettes/*.css` 등 **theme 자산을 편집하기 전** 반드시 *실제 적용되는 theme*을 먼저 확정함. 잘못된 theme 파일을 고치면 빌드 산출물(`slide/css/custom.css`)에 반영되지 않아 헛수고 발생.

### theme 결정 우선순위 (lib/config.js 레이어 — 나중이 이김)

| 순위 | 소스                                | 비고                       |
| :--- | :---------------------------------- | :------------------------- |
| 1    | `_config.yml`의 `slide_css:`        | 있으면 최우선 (theme 무시) |
| 2    | `projectDir/_config.yml`의 `theme:` | 프로젝트 단위 override     |
| 3    | `ROOT/_config.yml`의 `theme:`       | 전역 기본                  |
| 4    | `ROOT/_config.org.yml`의 `theme:`   | 최후 fallback              |

* **⚠️ AGENDA.md / 슬라이드 소스 `.md` frontmatter의 `theme:`는 theme 해석에 쓰이지 않음** (Issue79 — frontmatter는 instructor 등 *메타 전용*). frontmatter에 `theme:`이 있어도 무시되므로, 그 값을 보고 편집 대상 theme을 판단하면 안 됨.

### 확정 절차 (편집 직전)

```bash
# 1) 적용 theme 추출 (projectDir _config > ROOT _config 순)
grep -h '^theme:' Projects/<P>/_config.yml _config.yml _config.org.yml 2>/dev/null | head -1

# 2) 빌드 로그로 교차 확인 (SSOT)
./m2slide.sh <P> 2>&1 | grep 'Theme applied:'
#   → "✅ Theme applied: <name> (.../theme/<name>/slide.css)"
```

* 편집 대상 = **빌드 로그가 보고한 `<name>`**의 `theme/<name>/slide.css`.
* 구조성(레이아웃·정렬) 규칙이면 `theme/_shared/` 우선 검토 (모든 theme 공유).
* 자매 theme(default·default_lec 등) 간 parity가 필요한 변경이면 양쪽 모두 반영하되, **실제 적용 theme을 1순위로 검증**.

## 2. 빌드 실행

```bash
./m2slide.sh {ProjectName}
```

* 변경 영향이 큰 경우(`base.css`, `generate-slides.js` 등)는 위 표 4번에 따라 대표 프로젝트 다수를 순차 빌드
* `--epub` 옵션은 사용자가 명시한 경우에만 추가
* 빌드 실패 시 즉시 사용자 보고 + 후속 절차 중단

## 3. HTML 산출물 직접 검증

빌드 성공 후 **반드시 결과 HTML 파일을 직접 Read하여** 다음을 확인:

| 검증 항목                        | 확인 방법                                                              |
| :------------------------------- | :--------------------------------------------------------------------- |
| HTML 파일 생성 여부              | `ls Projects/{Name}/slide/*.html`                                      |
| 변경 의도가 산출물에 반영됐는지  | 수정 의도와 관련된 HTML 영역(섹션·class·data attribute 등) Read·Grep   |
| 파서 오류 흔적                   | `undefined`, `{{...}}` 미치환 placeholder, 빈 `<section></section>` 등 |
| 사용자 명시 layout/slot          | `class="layout-*"`, `data-*` 속성, 슬롯 div 존재 여부                  |
| Cover/agenda 자동 주입 (해당 시) | 첫 슬라이드의 cover/agenda 마커 존재                                   |

검증 통과 기준은 **"수정 사항이 HTML에 의도대로 나타났는가"** — 단순 빌드 성공만으로 종료 금지.

## 4. 브라우저·검증 채널 (Issue235 — 이중화)

### 4.0 검증 엔진 — ego-browser 가 기본 (Issue377)

헤드리스 검증의 기본 엔진은 **ego-browser** 다. 글로벌 [browser-engine-rules](~/.claude/rules/browser-engine-rules.md) 의 *"기본은 ego"* 가 m2slide 에도 그대로 적용된다. 본 룰이 과거 Playwright 를 지목하고 있어 세션이 그쪽을 집어 왔으나(2026-09-19 실사용 관측), **룰과 엔진 정책이 갈라져 있던 그 비대칭이 재발 지점이었다**.

2026-09-19 실측 (aTest · dev-server 9877 · ego lite 0.5.0.32) + **2026-09-20 캡처 축 재실측**(1.design_rnd):

| 축                        | ego-browser              | Playwright MCP        |
| :------------------------ | :----------------------- | :-------------------- |
| 진입 `goto()`             | 172ms ✅                 | MCP 왕복              |
| 의미 트리 `snapshot()`    | 12ms ✅                  | ✅                    |
| DOM 실측 `evaluate()`     | 1ms ✅                   | `browser_evaluate`    |
| **`file://` 직접 진입**   | **✅ 가능**              | **❌ 차단(보안 기본값)** |
| PNG 캡처                  | **74~85ms ✅** (3회 성공) | ✅                    |

* **ego 는 `file://` 를 연다** — Playwright 가 못 하던 축이다. [file-deployment-rules](file-deployment-rules.md) 의 *"임의 단일 `.html` + `img/` 만으로 동작"* 계약을 **실제 배포 조건 그대로** 헤드리스 검증할 수 있게 됐다. dev-server 경유는 그 계약을 우회한 근사였다
* **예외는 없다 — 캡처를 포함해 전 축이 ego 다.** 2026-09-19~20 사이 캡처 축이 15초 타임아웃(6회 연속·성공 0회) → 74~85ms(3회 성공)로 뒤집혔다. 구 §4.2 「캡처만 Playwright」 예외는 그 재실측으로 **해제**됐다(Issue397 작업 중 확인)
* ⚠️ **원인은 규명되지 않은 채 증상만 사라졌다** — 글로벌 Issue653 은 *"재현되지 않는다"* 로 종결됐지 원인이 잡힌 것이 아니다(독립 2세션 교차 46/46 성공 · 21~94ms). 가설 5종이 **기각**돼 있다: 버전 회귀 ❌(같은 빌드) · 앱 재기동 ❌(실패 때와 같은 프로세스 인스턴스) · TCC 권한 ❌(`Page.captureScreenshot` 은 화면이 아니라 페이지를 뜬다) · 배경 탭·viewport override·대형 서피스 ❌ · 「창 activate 필요」「경로 인자 필수」 ❌(과거 두 번의 오진)
* 🔴 **다시 15초 타임아웃을 만나면 — 재시도도, 엔진 교체도 아니다.** 남은 가설은 「한 인스턴스 안에서 특정 Page 의 컴포지터만 굳는다」 하나이므로 **처방은 `task.newPage()` 로 새 Page 에서 찍는 것**이다. 같은 Page 를 두들기는 것은 굳은 자리를 다시 두들기는 것이다
* ⚠️ **표본 없이 가설을 세우지 말 것** — 실패를 만나면 계측을 먼저 돌린다. `bash ~/.claude/sh/ego-capture-probe.sh 5` (원장 `~/.claude/_doc_work/z_log/ego-capture-probe.tsv`). 상세 SSOT 는 글로벌 [web-auto](~/.claude/skills/web-auto/SKILL.md) 「캡처가 15초 타임아웃을 낼 때」

검증 의도에 따라 두 채널 분기:

| 채널            | URL                                                        | 도구                 | 용도                              |
| :-------------- | :--------------------------------------------------------- | :------------------- | :-------------------------------- |
| 시각 (file://)  | `file:///abs/.../slide/X.html?fwd=1#/N`                    | AppleScript Chrome   | 사용자 직접 확인, 배포 시뮬레이션 |
| 헤드리스 — solo | `http://localhost:9877/p/<P>/s/<chap>/<slide>[?mode=text]` | **ego-browser**, curl | 단일 슬라이드 design 검증         |
| 헤드리스 — deck | `http://localhost:9877/p/<P>/n/<chap>/<slide_or_id>`       | **ego-browser**, curl | 전체 deck navigation 검증         |

> ⚠️ legacy `http://localhost:9877/Projects/<P>/slide/<X>.html` 직접 접근은 차단됨 (Issue236.11 — 404). 반드시 short form 사용.
> chap·slide 는 1-base 인덱스 (m2slide hashOneBasedIndex 정합). chap=1 = sorted chapter files 첫 번째 (single mode 면 index.html).
> **Issue248 — path-based mode separation**:
>   * `/p/<P>/s/<chap>/<slide>` = **solo design view** (단일 section + 풀 테마/JS). plain text는 `?mode=text`.
>   * `/p/<P>/n/<chap>/<slide>` = **deck navigation** (전체 deck + reveal.js nav). slide는 1-base 정수 또는 reveal.js section id (`toc-placeholder` 등).
>   * 진입 단축: `/p/<P>/n/c` (cover), `/p/<P>/n/a` (agenda), `/p/<P>/n/t` (toc) — fallback chain 자동 처리.
>   * legacy `?mode=nav`는 302로 `/n/` form 변환. cross-page nav rewrites도 모두 `/n/`.

선택 기준:

* Claude 자동 검증·screenshot·console 캡처 필요 → **헤드리스 채널**
* 사용자에게 결과 시각 확인 → **시각 채널**
* 둘 다 필요하면 헤드리스 검증 + 시각 채널 알림 (병행)

### 헤드리스 채널 (HTTP server)

`./m2slide.sh <project>` 빌드 시 dev-server(port 9877) 자동 시동 (Issue235). 별도 수동 시동 불필요.

수동 제어:

```bash
./m2slide.sh --serve start       # idempotent
./m2slide.sh --serve stop
./m2slide.sh --serve status
./m2slide.sh --serve restart
```

ego-browser 사용 (short form 필수):

```bash
ego-browser nodejs <<'EOF'
const task = await taskSpace("m2slide 슬라이드 검증");
const page = task.page("p1");

// 단일 슬라이드 design 검증 (/s/ path = solo)
await page.goto("http://127.0.0.1:9877/p/aTest/s/1/1");   // chap·slide 는 1-base
await page.waitForLoadState();

// 구조·텍스트 실측 — 검증의 1차 수단 (스크린샷보다 빠르고 판정 근거가 명시적)
console.log(await page.evaluate(() => ({
  sections: document.querySelectorAll("section").length,
  title: document.querySelector("h1,h2")?.textContent?.trim(),
  layout: document.querySelector("section")?.className,
})));
console.log(await page.snapshot());

await task.finish({ keep: [] });
EOF
```

* **`evaluate()`·`snapshot()` 이 1차 수단**이다 — 실측 1ms·12ms. *"눈으로 봐야 안다"* 고 넘겨짚지 말고 판정 기준을 DOM 질의로 적는다
* deck navigation 은 `/n/` path 로 goto — `http://127.0.0.1:9877/p/aTest/n/1/1` · named section id `…/n/1/toc-placeholder`
* ⚠️ **존재하지 않는 chap·slide 를 주면 dev-server 가 에러 페이지를 200 으로 돌려준다** — `evaluate()` 결과가 `title: "Error response"` 면 엔진 문제가 아니라 **인덱스가 틀린 것**이다. 프로젝트의 실제 챕터 수는 `curl http://127.0.0.1:9877/p/<P>` 로 먼저 확인한다
* **`file://` 직접 검증**(배포 조건 그대로, Playwright 로는 불가): `await page.goto("file:///abs/.../slide/01-x.html?fwd=1#/3")`
* task space 는 **목표당 하나**다. 다음 라운드는 출력된 `spaceId` 로 `taskSpace(<id>)` 재개하고, 끝나면 `finish({ keep: [] })` 로 닫는다
* ⚠️ **ego API 는 Playwright 가 아니다** — `locator()`·`getByRole()`·`expect()`·`route()` 없음. 문서화된 Page API 와 `evaluate()`·`cdp()` 만 쓴다
* console 오류 수집이 필요하면 goto **전에** `await page.cdp("Runtime.enable")`·`cdp("Log.enable")` 후 `await page.events()` 로 회수

curl 사용:

```bash
# 단일 슬라이드 design HTML (페이지별 디자인 확인용)
curl http://localhost:9877/p/aTest_v1/s/8/6

# deck navigation HTML (전체 deck, reveal.js + 좌우 nav UI)
curl http://localhost:9877/p/aTest_v1/n/8/6

# deck navigation with named section id
curl http://localhost:9877/p/aTest_v1/n/1/toc-placeholder

# plain text section (curl + grep 친화, reveal.js 없이)
curl 'http://localhost:9877/p/aTest_v1/s/8/6?mode=text'
```

`?fwd=1` query 는 headless 채널에서 불필요 — m2slide 내부 cross-page 트랜지션 cue 전용, 외부 진입은 short form 인덱스(`<chap>/<slide>`)로 절대 좌표 직접 지정.

chap·slide 인덱스 결정 방법:

```bash
# 프로젝트 chapter 목록 + chap_idx 확인
curl http://localhost:9877/p/aTest_v1

# JSON 형태 (스크립트 친화)
curl -H 'Accept: application/json' http://localhost:9877/p/aTest_v1
```

명시적 진입 (Issue240+ short form, Issue248 v2 path-based):

```bash
# 데크 첫 진입 — cover/agenda/toc/first slide fallback chain
curl http://localhost:9877/p/<P>/n/c

# cover/agenda/toc 명시 진입 (deck navigation)
curl http://localhost:9877/p/<P>/n/c    # cover (없으면 a→t→1/1)
curl http://localhost:9877/p/<P>/n/a    # agenda (없으면 t→1/1)
curl http://localhost:9877/p/<P>/n/t    # toc (없으면 1/1)

# deck 본문 slide 지정 (chap=1-base, slide=1-base 또는 reveal.js section id)
curl http://localhost:9877/p/<P>/n/<chap>/<slide>
curl http://localhost:9877/p/<P>/n/<chap>/<section-id>

# solo design view (단일 슬라이드 디자인 확인)
curl http://localhost:9877/p/<P>/s/<chap>/<slide>

# legacy 진입 (302 redirect to /n/ form)
curl -L http://localhost:9877/p/<P>/s/c   # → /n/c
```

### 시각 채널 (AppleScript file://)

**⚠️ shell `open -a "Google Chrome" <URL>` (슬라이드 검증·진입 컨텍스트만) 사용 금지 (Issue223 후속 정책)**

**적용 범위 (한정)**:
* 본 룰의 ban은 **Chrome으로 슬라이드 페이지 진입 + 컨텐츠 검증** 컨텍스트에만 적용
* **예외 (영향 없음)**:
    - htm 스킬 (`~/.claude/commands/htm.md`) — `open -a Firefox "file://..."` Firefox용 HTML 응답 렌더. 본 룰 ban 대상 아님
    - dashboard agent (`~/.claude/agents/dashboard.md`) — `open -a Firefox "$STABLE_URL"` SSE 라이브 대시보드. 본 룰 ban 대상 아님
    - 글로벌 정책 (Chrome=일반 / Firefox=htm·dashboard 전용) 그대로 유지
    - `run.sh` 등 사용자 명시 진입점 내부 `open -a` 무관

이유:
* macOS `open -a "Google Chrome" <URL>` 동일 URL 재호출 시 새 탭만 추가되고 foreground 안 옴 → 사용자가 변경 사항을 못 봄
* 컨텐츠 슬라이드 진입 검증 불가 (포커스가 backgrounded 탭에 머물러 검증 자체가 실패)
* 빌드 후 검증 사이클에서 매번 실패 → 사용자 수동 클릭 강요
* Firefox는 별도 인스턴스 + htm/dashboard 단일 URL 컨텍스트라 동일 회귀 없음 (재사용 + 새 탭 정책으로 충분)

**대체 수단 (우선순위 순)**:

1. **AppleScript (Chrome 새 탭 + activate 강제)** — 일반 검증·재오픈
    ```bash
    osascript <<'EOF'
    tell application "Google Chrome"
        activate
        if (count of windows) = 0 then
            make new window
        end if
        tell window 1
            make new tab with properties {URL:"file:///<abs>/Projects/{Name}/slide/{chapter}.html?fwd=1#/N"}
        end tell
    end tell
    EOF
    ```
    * `make new tab` 매번 새 탭 강제 → 동일 URL 캐시 문제 회피
    * `activate` Chrome 자체를 foreground로 끌어옴
    * `file://` URL 직접 지원

2. **ego-browser** — 페이지 콘텐츠 자동 검증이 필요할 때 (기본 엔진, §4.0)
    * **`file://` 를 직접 연다** — 배포 조건 그대로 재는 유일한 경로다 (Playwright 는 `file://` 차단이라 불가능했다). dev-server 경유 short form 도 그대로 쓴다:
        ```
        http://127.0.0.1:9877/p/{Name}/s/{chap}/{slide}
        ```
        ```bash
        # dev-server idempotent 시동 (빌드 시 자동, 수동 가능)
        ./m2slide.sh --serve start
        ```
        * legacy `http://localhost:9877/Projects/<P>/slide/<X>.html` 직접 진입은 차단됨 (Issue236.11 — 404)
        * 별도 `python3 -m http.server 8765` fallback 사용 금지 — dev-server 가 단일 진입점
    * 판정은 `evaluate()`·`snapshot()` 으로 한다 — 구조·텍스트·스타일은 그쪽이 더 정확하고 빠르다. PNG 는 **사람이 볼 필요가 있을 때만** 찍고, 그때도 ego 로 찍는다(경로 의무 [capture-output-rules](capture-output-rules.md))
    * 단순 "열어보기"에는 과하다 — 그 경우 1번 AppleScript

3. **`open-slide` 스킬** (Issue223) — 임의 슬라이드 진입 자동화
    * 위 AppleScript 로직 + chapter prefix 매칭을 캡슐화한 프로젝트 로컬 스킬
    * 트리거: "슬라이드 N번 열어줘", "X.Y #N 보여줘", "검증해줘" 등 자동 발동

* `run.sh`는 `slide/`를 `rm -rf`로 비우므로 이미 빌드된 산출물 보존하려면 위 1~3 중 선택. 단 `run.sh` 내부의 `open -a` 자체는 본 룰의 shell 금지 대상 아님 (사용자 명시적 `./run.sh` 진입점)

### 4.1 슬라이드 링크 규약 (사용자 보고·재오픈용)

사용자에게 슬라이드 링크를 알려주거나 브라우저로 띄울 때는 **반드시 `?fwd=1#/N` 시그널 형식** 사용:

```
file:///<abs_path>/Projects/{Name}/slide/{chapter}.html?fwd=1#/N
```

* **이유**: m2slide는 `?fwd=1`/`?back=1`/`?last=1` 쿼리 시그널을 cross-page forward/back 애니메이션(fade-in)에 사용 (Issue110/122). 시그널 없으면 페이지 진입이 부자연스럽거나 Reveal.js hash 파싱 충돌로 cover 슬라이드로 떨어지는 회귀 가능 (Issue110 회귀 사례)
* **순서 규칙**: `?fwd=1` 쿼리는 반드시 `#hash` 앞에 배치. `index.html#/2?fwd=1`처럼 hash 뒤에 두면 Reveal.js가 `?fwd=1`을 hash 일부로 해석하여 인덱싱 실패
* **slide index**: `#/N` = N번째 horizontal 슬라이드 (0-base). cover 슬라이드는 #/0, 본문은 #/1부터
* **AppleScript 또는 ego-browser 만 사용**: `open -a` shell 명령은 §4 정책으로 금지. AppleScript 는 `URL:"..."` heredoc 내부 인용이라 `#` 안전, ego 는 `page.goto("…")` 인수 직접 전달이라 인용 무관
* **chapter mode**: `{chapter}.html?fwd=1#/N` 형태 (예: `01-opening.html?fwd=1#/3`)
* **single mode**: `index.html?fwd=1#/N`

## 4.5 파일 단위 배포 검증 (Issue235)

빌드 산출물 코드(`generate-slides.js`, `html-builder.js`, `markdown.js`, `theme/**/layouts/*.html` 등) 또는 외부 라이브러리 의존 컴포넌트(react·d3·model3d·p5·chart·map 등)를 수정한 경우 다음 검증 의무:

```bash
./m2slide.sh --lint-deployment <project>
```

검사 패턴: `localhost`, `127.0.0.1`, `0.0.0.0`, `/Users/`, `/home/`, `file:///Users/` 등.

* 위반 0건 → 통과
* 위반 발견 → 즉시 수정 + 재빌드 + 재lint 통과까지 진행

상세 룰: [`file-deployment-rules.md`](file-deployment-rules.md). 핵심: 빌드 산출물은 임의 단일 `.html` 파일 + `img/` 만으로 `file://` 동작해야 함. server-only 기능(`localhost` 하드코딩, server-side include, dynamic endpoint, WebSocket, SSE, POST endpoint) 금지.

## 4.6 라이선스 뱃지 대비 검증 (Issue292)

**theme CSS 또는 신규 theme을 건드린 경우 의무.** 라이선스 뱃지는 테마 변수 `--m2-license-fg`를 재사용하므로, 테마 색을 바꾸면 뱃지 글자가 배경에 묻혀도 빌드는 성공한다 — 육안 확인만으로는 놓친다.

```bash
./m2slide.sh --lint-license
```

* 검사 내용: 전 theme의 `--m2-license-fg`(뱃지 글자색) ↔ `.reveal` 배경 WCAG 2.1 대비비. 기준 **4.5:1**
* 트리거: `theme/*/slide.css`·`theme/_shared/*.css`·팔레트 CSS 수정, **신규 theme 추가**, 라이선스 뱃지 스타일 변경
* 위반 발견 → 색 조정 후 재lint 통과까지 진행 (기준 미달인 채로 커밋 금지)
* 상세 설계: [`../../_doc_arch/license-attribution.md`](../../_doc_arch/license-attribution.md)

## 4.7 PPTX 규격 검증 (Issue317)

**`--pptx` 로 PowerPoint 를 산출한 경우 자동 적용.** 별도 lint subcommand 가 아니라 **빌드에 내장**돼 있다 — `md2pptx.py` 가 산출 직후 `check-conform` + `check-xml-order` 를 실행하고, FAIL 이면 빌드가 **실패한다**(rc≠0).

```bash
./m2slide.sh <project> --pptx              # 검증 포함. FAIL 이면 exit 1
./m2slide.sh <project> --pptx-no-verify    # 차단을 의도적으로 넘길 때만
./m2slide.sh <project> --ppt-make          # 앞단·lane A·뒷단·보고 (Issue332)
./m2slide.sh <project> --ppt-make --ig     # + 인포그래픽 선별·비용 게이트 (팬아웃 없음)
```

> `--ppt-make` 의 **뒷단(`ppt-check`)은 보고 전용**이다 — 차단 지점은 `--pptx` 와 같은 자리(lane A 내장 검증) 하나다. 뒷단이 더하는 `legible` 류는 휴리스틱이라 오탐이 성립하므로(실측: aTest p24 산문 `flowchart TD 위→아래 흐름` → *"mermaid 원문 노출"* FAIL) 판정 줄을 사람이 읽고 가른다. 상세: [`../../_doc_arch/ig-ppt-integration.md`](../../_doc_arch/ig-ppt-integration.md) "오케스트레이션".

* **경고가 아니라 차단인 이유**: `check-conform` 의 FAIL 은 *"PowerPoint 가 거부하거나 깨져 보이는 위반"*이다. 통과시키면 `index.html` 에 다운로드 버튼까지 달려 배포된다. `build-pptx.sh` 가 구 pandoc 직접 경로로 **폴백하지 않는 것과 같은 이유** — 성공으로 보이는 품질 회귀를 막는다
* **심각도 구분은 m2slide 가 하지 않는다.** FAIL/WARN 은 `check-conform` 이 이미 가르며 WARN 은 rc0 이라 통과한다 (실측: igTest 35장 → FAIL 0 · WARN 1(템플릿 밖 폰트 Courier) → 빌드 성공)
* **실패 종류를 구분해 보고한다**: rc 2 = 검증 실패(파일은 있다) · rc 1 = 생성 실패(파일이 없다). `build-pptx.sh` 가 산출 파일의 갱신 여부로 가른다

> ⚠️ **손으로 재검할 때는 `--lane a` 가 필수다.** `check-conform` 의 기본값은 `b`(인포그래픽)이고, 그 lane 은 본문 이미지를 위반으로 본다. m2slide 덱은 lane A 라 mermaid 렌더 이미지가 **정상 콘텐츠**인데 기본값으로 재면 FAIL 이 뜬다 — 같은 pptx 실측: `--lane a` rc 0 / lane 미지정 rc 1 (Issue317).
>
> ```bash
> python3 ~/.claude/skills/ppt-check/scripts/check-conform.py <out.pptx> --lane a
> ```

## 4.8 lane B 회귀 검증 (Issue331)

`::: cards`·정형 htmlart 를 네이티브 도형으로 그리는 **lane B** 는 `--pptx` 에 **기본 포함**돼 있다(끄려면 `--pptx-no-lane-b`). 다음을 건드렸으면 전용 러너를 돌린다:

```bash
./z_test/ig-ppt/4.laneb.sh aTest      # cards·process·compare·lane C 이월이 모두 있는 픽스처
./z_test/ig-ppt/3.parity.sh igTest    # 구조 파리티는 여기 — 7/7 유지 확인
```

* 트리거: [`lib/pptx/lane-b.py`](../../lib/pptx/lane-b.py) · [`build-source.py`](../../lib/pptx/build-source.py) ⑫(lane B 표시) · [`build-pptx.sh`](../../lib/pptx/build-pptx.sh) ③-b2 배선 수정
* 단언 6종 — 사이드카 · 글자 있는 네이티브 도형 존재 · **그림 0** · 평문 불릿 제거 · **lane C 이월 미개입** · `check-conform --lane a`
* ⚠️ lane B 는 **덧칠**이라 실패해도 빌드를 죽이지 않는다. 그래서 *"빌드가 rc0 이니 됐다"* 는 판정이 성립하지 않는다 — 러너로 재거나 stderr 의 `⚠️ lane B` 줄을 읽어야 한다

## 4.9 lane M · 백지 장 회귀 검증 (Issue339)

수식이 든 덱, 또는 [lane-m.py](../../lib/pptx/lane-m.py) · [check-empty.py](../../lib/pptx/check-empty.py) · [build-source.py](../../lib/pptx/build-source.py) ⑬ 를 건드렸으면 전용 러너를 돌린다:

```bash
./z_test/ig-ppt/5.lanem.sh aTest      # 수식·코드 동거 장 + 컴포넌트 장이 있는 픽스처
```

* 단언 6종 — 사이드카 · **마커 잔존 0** · OMML 존재 · **수식 장의 동거 본문 생존** · 백지 장 0 · 코드 안 `$` 오탐 0
* 수식 0건 덱은 ①③④⑥ 을 skip 하고 백지 장만 잰다 — 러너가 덱 작성 방식을 강제하지 않는다
* ⚠️ **`--pptx` 가 rc0 이어도 손실은 있을 수 있다.** pandoc 은 Math 를 만나면 그 장의 본문을 조용히 버리며 conform 은 그것을 위반으로 보지 않는다. *"빌드가 통과했으니 됐다"* 는 이 축에서 성립하지 않는다 — 빌드 로그의 `lane M 수식 복원` · `본문 0 장` 두 줄을 읽는다

## 4.10 커버리지 감사 — 아무도 재지 않는 축 (Issue369)

**계약([fidelity.yml](../../data/m2slide2ppt/fidelity.yml))의 요소·등급을 건드렸거나 회귀 픽스처의 원고를 고쳤으면 돌린다.**

```bash
./z_test/ig-ppt/7.coverage.sh            # 기본 4덱 (aTest-all·aTest·chapter_mode·igTest)
./z_test/ig-ppt/7.coverage.sh <프로젝트…>
```

왕복 러너는 *"이 덱이 계약대로 돌았는가"* 를 잰다. 이 러너는 **계약이 선언한 축을 아무도 재지 않고 있지 않은가** 를 잰다 — 덱이 갈려 있으면 각자 초록불이어도 *"어느 축이 어느 덱에도 없는지"* 는 아무도 세지 않는다.

| 판정              | 뜻                                                                | 고칠 곳                        |
| :---------------- | :---------------------------------------------------------------- | :----------------------------- |
| 🔴 검사기가 안 잼 | `scan()` 에 그 요소를 만드는 코드가 없다 — 원고에 아무리 많아도 0 | **코드**                       |
| ❌ 픽스처에 없음  | 검사기는 잴 줄 아는데 어느 원고에도 없다                          | **원고**                       |
| ⚠️ 한 덱뿐         | 그 덱을 고치면 축이 사라진다                                      | 차단 아님 — 근거가 얇다는 알림 |

* ⚠️ **이 러너가 없으면 "차이 없음" 과 "차이를 못 봄" 이 구분되지 않는다.** Issue358 에서 표 정렬을 `lossy` 로 오판한 것(근거 덱의 표가 전부 좌측 정렬)과 `font_outside_theme` 축이 러너를 옮기며 조용히 사라진 것이 그 형태였다
* 계약에서 요소를 **거두는 것**도 정당한 해법이다 — 다만 그 판단은 사람이 한다

## 4.11 패키지 조립 무결성 (Issue382)

**lane B/G/M/S/T 를 건드렸거나 pptx 의 part·rel 을 새로 끼우는 코드를 넣었으면 돌린다.**

```bash
./z_test/ig-ppt/8.assembly.sh            # 기본 3덱 (aTest-all·igTest·m2Slide_chapter_mode)
./z_test/ig-ppt/8.assembly.sh <프로젝트…> [--no-build]
```

기존 러너가 **보지 못하는 층**이다. [`3.parity.sh`](../../z_test/ig-ppt/3.parity.sh) 는 python-pptx 의 **렌더 텍스트**로 장 수·제목·순서를 재고 [`6.roundtrip.sh`](../../z_test/ig-ppt/6.roundtrip.sh) 는 원고 ↔ 산출의 글자·요소를 잰다 — 둘 다 패키지가 열리고 파싱된 **뒤**를 본다. zip 항목 중복·끊긴 rel·미선언 미디어 확장자는 그 앞 단계다.

* 판정은 글로벌 [`check-assembly.py`](file:///Users/nowage/.claude/skills/ppt-check/scripts/check-assembly.py) 가 한다 — 러너는 **호출·집계·보고**만 한다. ⚠️ `lib/pptx/` 에 복사하지 않는다(문서와 실행체가 따로 자라는 2원 갈라짐)
* baseline 불요 **5규칙**: `zip_entry_names_unique` · `dropped_slide_relationship_removed` · `reorder_key_is_stable_across_save` · `no_duplicate_or_missing_after_reorder` · `declared_extensions_cover_all_media`
* `--baseline` 필요 3규칙은 **Issue383 소관**이라 SKIP 이고 **건수를 보고한다** — 숨기면 *"통과"* 와 *"축이 사라짐"* 이 구분되지 않는다(§4.10 과 같은 취지)
* ⚠️ **차단 지점이 아니다.** `--pptx` 내장 검증(§4.7)은 FAIL 시 빌드를 죽이므로, 현재 FAIL 0 인 축을 거기 넣으면 오탐 1건이 배포를 막는다. 이 축은 **회귀 가드**로만 둔다
* ⚠️ 글로벌 도구가 없는 머신에서는 **SKIP 하고 그 사실을 보고**한다 — 도구 부재와 무결성 통과는 다른 사실이다
* 이 축의 실사고 선례: lane G 의 `diagramDrawing` 관계를 슬라이드 rels 가 아니라 data 파트에 걸어 LibreOffice 가 빈 그룹으로 들여온 건(실측 2026-09-11). **어떤 검사도 잡지 못해 사람이 눈으로 찾았다**

## 4.12 PDF 파리티 회귀 (Issue413)

**`--pdf` 경로를 건드렸거나, 테마·htmlart 렌더·클라이언트 훅을 고쳤으면 돌린다.** pptx 와 달리 PDF 는 **고정된 렌더 결과**라 화면과 다르면 그 자체가 결함이다 — 설계 SSOT 는 [`../../_doc_arch/pdf-parity.md`](../../_doc_arch/pdf-parity.md).

| 무엇을 고쳤나                                               | 부를 러너                                              |
| :---------------------------------------------------------- | :----------------------------------------------------- |
| `m2slide.sh` PDF 블록 · `lib/pdf/*` · `lib/combine-pdfs.py` | `./z_test/pdf/1.integrity.sh`                          |
| 테마 CSS · htmlart 렌더러 · 레이아웃 템플릿                 | `./z_test/pdf/2.tripath.sh <P> <챕터.html> <N> <탐침>` |
| `lib/component-hooks/*.client.js` (런타임 레이아웃)         | `./z_test/pdf/3.nondeterminism.sh <P> [챕터.html] [N]` |

* **`1.integrity`** — 페이지 수(원고 section 합 + 표지·목차) · 비율 · 폰트 격리 · 백지 장 보고. 기본은 `--no-build` 로 **이미 있는 PDF** 를 잰다
    - ⚠️ 산출물이 원고보다 오래되면 **STALE(rc 3)** 로 «판정 불가» 를 보고한다. 불일치로 보고하면 있지도 않은 손실을 쫓게 된다(실측 igTest)
* **`2.tripath`** — 화면 ① · 단독 추출 ② · 전체 추출 ③ 에서 같은 탐침의 폰트·위치를 재어 **결함 계열(C1~C4)을 찍는다**
    - ⚠️ **C4(HTML 자체 결함)는 기계가 못 가른다** — 셋이 «똑같이 잘못» 인 경우다. 일치 판정이 나와도 화면을 사람이 봐야 한다
* **`3.nondeterminism`** — 같은 챕터를 N회 뽑아 **전 페이지 조판 지문**이 같은지. 기본 N=3
    - 🔴 **통과가 «비결정성 없음» 의 증명이 아니다.** 사건률 p 면 놓칠 확률이 `(1-p)^N` 다. 실측(Issue407 구 코드): 사건률 약 25% → N=3 이면 **42% 확률로 놓친다**. 의심되면 N 을 올린다
    - 지문에 **텍스트 내용은 넣지 않는다** — Issue399 는 글리프가 치환돼도 텍스트 레이어가 멀쩡했다

⚠️ 세 러너 모두 **차단 지점이 아니다.** 차단은 이미 `--pdf` 빌드 안에 있다(`Printed N` 대조·`combine --expect`·폰트 격리·`PDF_LOSS` → `exit 2`). 러너까지 차단이면 오탐 1건이 배포를 막는다 — §4.11 과 같은 판단.

## 4.13 single mode pptx 파리티 · 최종 게이트 (Issue418)

**`build-source.py`(장 구성·표지 메타·모드 판정) · `lane-t.py`(좌표) · `build-pptx.sh` 최종 판정 · chapter layout 제목 규칙을 건드렸으면 돌린다.**

```bash
./z_test/ig-ppt/9.single-parity.sh            # --no-pdf 로 PDF 축 생략
```

* 픽스처는 저장소에 추적되는 `z_test/fixtures/pptx-parity/gate16/`(single · `markdown/` 단독 · H1 챕터 3 · 16:9)이고 **임시 사본**에서 빌드한다
* ⚠️ [`3.parity.sh`](../../z_test/ig-ppt/3.parity.sh) ①③ 은 single mode 에서 skip 된다 — 그 틈으로 HTML 16장 → pptx 28장이 rc0 으로 나갔다. single mode 파리티는 이 러너가 잰다
* 최종 check-conform 은 이제 **차단**이다(FAIL → `build-pptx.sh` rc 2 → `m2slide.sh` rc 1). lane B/G/T/M/S 가 나중에 넣은 도형의 위반은 md2pptx 내장 검증(§4.7)이 못 보고 여기서만 잡힌다

> lint subcommand 전체 목록: `--lint-deployment`(§4.5) · `--lint-license`(§4.6) · `--lint-data`([`data-access-rules.md`](data-access-rules.md)) · `--lint-config`·`--lint-layouts`([`../../_doc_arch/theme_layout.md`](../../_doc_arch/theme_layout.md)). PPTX 규격 검증(§4.7)은 subcommand 가 아니라 `--pptx` 빌드 내장이다.

## 5. 결과 보고

사용자에게 다음을 한 묶음으로 보고:

* 빌드 대상 프로젝트(들) + 결정 근거
* 빌드 결과 (성공/실패)
* HTML 검증 항목 + 통과 여부
* 검증 채널(시각/헤드리스) + 사용 도구 + 경로/URL
* 파일 단위 배포 lint 통과 여부 (§4.5 적용 시)

### 5.1 결과 링크 의무 (필수)

슬라이드를 빌드·수정·검증한 응답은 채팅 말미에 **결과 링크(deck deep-link)** 를 반드시 포함함. 사용자가 변경 결과를 즉시 브라우저로 열 수 있어야 함. 캡처·문서가 있으면 함께 3종 묶음으로 제시:

```
캡처: _doc_work/capture/<파일>.png
문서: http://jm4.local:9876/htm-doc?path=<.htm 절대경로>
결과 링크: http://127.0.0.1:9877/p/<P>/n/<chap>/<slide>#/<hash>
```

* **결과 링크 형식**: dev-server deck navigation deep-link `http://127.0.0.1:9877/p/<P>/n/<chap>/<slide>` (chap·slide 1-base). 특정 슬라이드를 가리킬 땐 `#/<hash>` 또는 `#/toc-placeholder` 등 reveal.js hash 부가
    - 변경이 특정 슬라이드면 그 슬라이드를 직접 가리킴 (ex: TOC 변경 → `/n/6/1#/toc-placeholder`)
    - 변경이 데크 전반이면 진입점 `/n/c` (cover) 또는 대표 슬라이드 1장
* **3종 라벨 고정**: `캡처:` / `문서:` / `결과 링크:` — 라벨명·순서 유지. 해당 항목 없으면 그 줄 생략 가능하나 **결과 링크는 슬라이드 작업 시 항상 포함**
* 캡처·문서가 없는 단순 빌드라도 결과 링크는 제시 (사용자가 결과를 열어볼 1차 수단)

# 예외 (절차 생략 가능)

* 마크다운·문서 파일만 수정한 경우 (`*.md` 중 `Projects/` 외부, `Issue.md`, `_doc_arch/*.md`, `_doc_work/**/*.md`, `CLAUDE.md`, `README.md` 등) — 검증 불필요
* 사용자가 "빌드 안 해도 돼", "검증 생략" 등 명시적으로 우회 지시한 경우
* `.claude/`, `.gitignore`, 메타 파일만 수정한 경우

# 위반 시 대응

* 코드 수정 후 본 절차를 누락한 사실을 발견하면 즉시 본 절차 수행 + 사용자에게 누락 보고
* 사용자가 누락을 지적하면 `~/.claude/learning_log.md`에 한 줄 기록 (`* YYYY-MM-DD: m2slide 코드 수정 후 빌드·검증 누락`)

# 참조

* `/run` 커맨드: `.claude/commands/run.md`
* 루트 wrapper: `run.sh`
* CSS 수정 가드: [`CLAUDE.md`](../../CLAUDE.md) "CSS 수정 시 주의사항"
* base.css 수정 가드: [`CLAUDE.md`](../../CLAUDE.md) "base.css 수정 가드"
