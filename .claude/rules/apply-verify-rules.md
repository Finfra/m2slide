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
* `Projects/{Name}/**/*.md`, `Projects/{Name}/_config.yml`, `Projects/{Name}/_meta.yml` (프로젝트 콘텐츠·설정)
* `m2slide.sh`, `run.sh` 등 빌드 스크립트

위 변경이 한 건이라도 발생하면 사용자에게 별도 확인 없이 검증 절차를 즉시 수행함.

# 핵심 절차 (필수 순서)

## 1. 대상 프로젝트 결정

`/run` 커맨드와 동일한 우선순위 적용:

| 순위 | 소스                  | 비고                                                                  |
| :--- | :-------------------- | :-------------------------------------------------------------------- |
| 1    | 사용자가 명시한 프로젝트명 | "MarkdownGraph 빌드해줘" 등 직접 지시                                |
| 2    | 수정한 파일이 속한 프로젝트 | `Projects/{Name}/...` 경로에서 `{Name}` 추출                          |
| 3    | IDE 컨텍스트          | `<ide_opened_file>` / `<ide_selection>`에서 `Projects/{Name}/` 캡처   |
| 4    | 영향 범위가 글로벌(`generate-slides.js`, `theme/default/`, `lib/css/base.css` 등) | 대표 프로젝트 다수 빌드 — `m2SlideStyle1_single`, `m2SlideStyle2_chapter`, `layoutTest` |

결정 근거를 한 줄로 사용자에게 알림.

## 2. 빌드 실행

```bash
./m2slide.sh {ProjectName}
```

* 변경 영향이 큰 경우(`base.css`, `generate-slides.js` 등)는 위 표 4번에 따라 대표 프로젝트 다수를 순차 빌드
* `--epub` 옵션은 사용자가 명시한 경우에만 추가
* 빌드 실패 시 즉시 사용자 보고 + 후속 절차 중단

## 3. HTML 산출물 직접 검증

빌드 성공 후 **반드시 결과 HTML 파일을 직접 Read하여** 다음을 확인:

| 검증 항목                                | 확인 방법                                                                |
| :--------------------------------------- | :----------------------------------------------------------------------- |
| HTML 파일 생성 여부                      | `ls Projects/{Name}/slide/*.html`                                        |
| 변경 의도가 산출물에 반영됐는지          | 수정 의도와 관련된 HTML 영역(섹션·class·data attribute 등) Read·Grep    |
| 파서 오류 흔적                           | `undefined`, `{{...}}` 미치환 placeholder, 빈 `<section></section>` 등   |
| 사용자 명시 layout/slot                  | `class="layout-*"`, `data-*` 속성, 슬롯 div 존재 여부                    |
| Cover/agenda 자동 주입 (해당 시)         | 첫 슬라이드의 cover/agenda 마커 존재                                     |

검증 통과 기준은 **"수정 사항이 HTML에 의도대로 나타났는가"** — 단순 빌드 성공만으로 종료 금지.

## 4. 브라우저·검증 채널 (Issue235 — 이중화)

검증 의도에 따라 두 채널 분기:

| 채널            | URL                                                                       | 도구                 | 용도                              |
| :-------------- | :------------------------------------------------------------------------ | :------------------- | :-------------------------------- |
| 시각 (file://)  | `file:///abs/.../slide/X.html?fwd=1#/N`                                   | AppleScript Chrome   | 사용자 직접 확인, 배포 시뮬레이션 |
| 헤드리스 — solo | `http://localhost:9877/p/<P>/s/<chap>/<slide>[?mode=text]`                | Playwright MCP, curl | 단일 슬라이드 design 검증         |
| 헤드리스 — deck | `http://localhost:9877/p/<P>/n/<chap>/<slide_or_id>`                      | Playwright MCP, curl | 전체 deck navigation 검증         |

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

Playwright 사용 (short form 필수):

```
# 단일 슬라이드 design 검증 (/s/ path = solo)
mcp__playwright__browser_navigate("http://localhost:9877/p/aTest_v1/s/8/6")
mcp__playwright__browser_take_screenshot(filename="_doc_work/capture/verify-aTest_v1-chap8-slide6.png")
mcp__playwright__browser_console_messages()

# deck navigation 검증 (/n/ path — 좌우 키, agenda 링크, reveal.js nav UI)
mcp__playwright__browser_navigate("http://localhost:9877/p/aTest_v1/n/8/6")

# deck navigation with named section id (reveal.js auto-id)
mcp__playwright__browser_navigate("http://localhost:9877/p/aTest_v1/n/1/toc-placeholder")
```

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

2. **Playwright MCP (`mcp__playwright__browser_*`)** — 페이지 콘텐츠 자동 검증 필요 시
    * `mcp__playwright__browser_navigate` / `browser_tabs new`
    * **주의**: playwright MCP 는 `file://` **차단** (보안 기본값). m2slide dev-server(port 9877) 경유 short form URL 사용:
        ```
        http://localhost:9877/p/{Name}/s/{chap}/{slide}
        ```
        ```bash
        # dev-server idempotent 시동 (빌드 시 자동, 수동 가능)
        ./m2slide.sh --serve start
        ```
        * legacy `http://localhost:9877/Projects/<P>/slide/<X>.html` 직접 진입은 차단됨 (Issue236.11 — 404)
        * 별도 `python3 -m http.server 8765` fallback 사용 금지 — dev-server 가 단일 진입점
    * stale Chrome 인스턴스 lock 시 `pkill -f "user-data-dir=.*ms-playwright"` 후 재시도
    * 페이지 snapshot·screenshot·console 캡처가 필요한 검증 단계에서만 사용 (단순 "열어보기"에는 과함)

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
* **AppleScript 또는 Playwright만 사용**: `open -a` shell 명령은 §4 정책으로 금지. AppleScript 사용 시 `URL:"..."` heredoc 내부 인용 자체로 `#` 안전, Playwright는 인수 직접 전달이라 인용 무관
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

## 5. 결과 보고

사용자에게 다음을 한 묶음으로 보고:

* 빌드 대상 프로젝트(들) + 결정 근거
* 빌드 결과 (성공/실패)
* HTML 검증 항목 + 통과 여부
* 검증 채널(시각/헤드리스) + 사용 도구 + 경로/URL
* 파일 단위 배포 lint 통과 여부 (§4.5 적용 시)

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
