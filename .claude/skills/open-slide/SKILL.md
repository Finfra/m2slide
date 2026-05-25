---
title: open-slide
description: m2slide 슬라이드를 정확한 URL로 열고 포커스 강제 또는 헤드리스 검증. 트리거 — "슬라이드 N번 열어줘", "X.Y #N 보여줘", "검증해줘", "open slide". 인자 `{project} {chapter_prefix} {N} [--firefox] [--build] [--verify]`. 기본 = 시각 채널(AppleScript Chrome + file:// + `?fwd=1#/N`). `--verify` = 헤드리스 채널(HTTP dev-server + Playwright + screenshot + console).
date: 2026-05-25
---

# 목적

m2slide 코드/콘텐츠 수정 후 특정 슬라이드(예: `aTest_v1` 08.4 #/6) 직접 검증 시 매번 절대경로·쿼리·hash 수작업 + macOS `open` 동일 URL 재호출 시 새 탭만 추가되고 foreground 안 오는 마찰 제거. apply-verify-rules §4 의무 절차에서 "슬라이드 열기" 단계 자동화.

# 트리거 (자동 발동)

다음 발화 또는 작업 흐름 감지 시 자동 호출:

* "슬라이드 N번 열어줘", "X.Y #N 보여줘", "08.4 6번 확인"
* "검증해줘", "verify slide", "open slide"
* 코드/콘텐츠 수정 후 빌드 완료 + 특정 슬라이드 진입 필요 시 (apply-verify-rules §4 흐름)
* "재오픈", "Chrome 포커스 안 옴"

# 입력 형식

```
{project} {chapter_prefix} {N} [--firefox] [--build] [--verify]
```

| 인자 | 의미 | 예시 |
| :--- | :--- | :--- |
| `project` | `Projects/<name>/` 의 name | `aTest_v1` |
| `chapter_prefix` | 챕터 prefix (glob 매칭) | `08.4` → `08.4.ratio-compare-explain` |
| `N` | reveal.js horizontal slide index (0-base) | `6` |
| `--firefox` | (옵션) Chrome 대신 Firefox 사용 | |
| `--build` | (옵션) open 전 `./m2slide.sh <project>` 실행 | |
| `--verify` | (옵션, Issue235) 헤드리스 검증 모드 — HTTP dev-server + Playwright navigate + screenshot + console 캡처 | |

# 동작 순서

## 1. 인자 검증

* `project`: `Projects/<project>/` 디렉토리 존재 확인. 없으면 에러 + 사용 가능한 project 목록 안내
* `chapter_prefix`: glob `Projects/<project>/slide/<prefix>*.html` 실행
    - 0개 매칭 → 에러 + 동일 디렉토리 `.html` 목록 안내
    - 2개 이상 매칭 → 에러 + 매칭 목록 표시 후 더 구체적 prefix 요구
    - 1개 매칭 → 해당 파일을 `resolved` 로 사용
* `N`: 정수 0 이상. 음수·비정수면 에러

## 2. (옵션) `--build` 처리

```bash
./m2slide.sh <project>
```

* exit code ≠ 0 시 에러 즉시 보고 + open 단계 skip

## 3. URL 조립

기본 (시각 채널, AppleScript file://):

```
file://<absolute_path>/Projects/<project>/slide/<resolved>.html?fwd=1#/<N>
```

`--verify` (헤드리스 채널, HTTP dev-server — Issue235):

```
http://localhost:9877/Projects/<project>/slide/<resolved>.html#/<N>
```

* `<absolute_path>`: `pwd -P` 결과 또는 git root
* `?fwd=1` 쿼리는 `#hash` 앞에 배치 (Reveal.js hash 파싱 충돌 회피 — apply-verify-rules §4.1)
* `?fwd=1`은 시각 채널에서만 사용 (m2slide 내부 fade-in 트랜지션 cue). 헤드리스에서는 hash 단독으로 충분
* URL 전체 single-quote 인용 (zsh `#` 주석 회피)

## 4. 브라우저 실행 + 포커스 강제

**⚠️ shell `open -a` 명령 금지** — 동일 URL 재호출 시 새 탭만 추가되고 foreground 안 와서 컨텐츠 슬라이드 접속 검증 실패. AppleScript 또는 Playwright만 사용 (apply-verify-rules §4 정책).

기본 (Chrome) — AppleScript:

```bash
osascript <<'EOF'
tell application "Google Chrome"
    activate
    if (count of windows) = 0 then
        make new window
    end if
    tell window 1
        set newTab to make new tab at end of tabs
        set URL of newTab to "<URL>"
        set active tab index to (count of tabs)
    end tell
end tell
EOF
```

* `make new tab` 으로 빈 탭 먼저 생성 → `set URL of newTab` 으로 분리 navigate (file:// 회귀 회피 — `with properties {URL:...}` 단일 호출은 빈 New Tab 으로 떨어짐, 2026-05-24 확인)
* `set active tab index to (count of tabs)` 새 탭을 포커스 활성 탭으로 강제
* `activate` Chrome 자체를 foreground 로 끌어옴 (open `--new` 대비 신뢰성↑)
* `file://` URL heredoc 내부 큰따옴표로 안전 인용

`--firefox` 옵션:

```bash
osascript <<'EOF'
tell application "Firefox"
    activate
    open location "<URL>"
end tell
EOF
```

Playwright 대안 (`--firefox` 없이 페이지 콘텐츠 자동 검증 필요 시):
* `mcp__playwright__browser_navigate` 사용
* **주의**: file:// 차단됨 — `--verify` 사용하여 dev-server 경유 (아래)
* stale Chrome lock 시 `pkill -f "user-data-dir=.*ms-playwright"` 후 재시도

## 4-V. --verify 헤드리스 검증 모드 (Issue235)

`--verify` 플래그 사용 시 §4 AppleScript 대신 다음 흐름 수행:

1. dev-server 살아있는지 확인 → 없으면 자동 시동:
    ```bash
    "$REPO_ROOT/m2slide.sh" --serve start
    ```
2. URL 조립: `http://localhost:9877/Projects/<project>/slide/<resolved>.html#/<N>`
3. Playwright MCP navigate:
    ```
    mcp__playwright__browser_navigate("<URL>")
    ```
4. 스크린샷 저장:
    ```
    mcp__playwright__browser_take_screenshot(
        filename="_doc_work/capture/verify-<project>-<chapter_prefix>-<N>.png"
    )
    ```
5. console 메시지 캡처:
    ```
    mcp__playwright__browser_console_messages()
    ```
6. console에서 ERROR·WARN 추출하여 §5 결과 보고에 포함

기존 시각 채널과 병행 가능 — `--verify` 후 같은 응답 내에서 §4 시각 채널도 호출 시 사용자에게 결과를 보여줄 수 있음.

## 5. 결과 보고

* 열린 URL (markdown 링크 형식)
* resolve 된 chapter 파일명
* 빌드 실행 여부 (옵션 사용 시)
* `--verify` 사용 시: 스크린샷 경로 + console ERROR/WARN 요약

# 에러 처리

| 상황 | 대응 |
| :--- | :--- |
| project 디렉토리 없음 | `ls Projects/` 결과 표시 + 정확한 이름 요청 |
| chapter prefix 다중 매칭 | 매칭 목록 bullet 표시 + 더 구체적 prefix 요구 |
| chapter prefix 미매칭 | `ls Projects/<project>/slide/*.html` 결과 안내 |
| `N` 부적합 | 정수 0 이상 요구 |
| `--build` 빌드 실패 | 빌드 에러 출력 + open skip |
| Chrome/Firefox 미설치 | 다른 브라우저 사용 권유 |

# 예시

## 정상 케이스

```
입력: aTest_v1 08.4 6
```

1. 매칭: `Projects/aTest_v1/slide/08.4.ratio-compare-explain.html`
2. URL: `file:///Users/nowage/_git/__all/videoMaker/lib/m2slide/Projects/aTest_v1/slide/08.4.ratio-compare-explain.html?fwd=1#/6`
3. 실행: §4 AppleScript heredoc (`tell application "Google Chrome" → make new tab + set URL of newTab + set active tab index + activate`)
4. 보고:
    ```
    Chrome 포커스 + 슬라이드 진입.
    - 파일: 08.4.ratio-compare-explain.html
    - 슬라이드: #/6
    ```

## 빌드 + open

```
입력: aTest_v1 08.4 6 --build
```

1. `./m2slide.sh aTest_v1` → 빌드
2. 위 정상 케이스 진행

## Firefox 강제

```
입력: aTest_v1 08.4 6 --firefox
```

* §4 `--firefox` AppleScript heredoc 실행 (`tell application "Firefox" → activate + open location`)

## 다중 매칭 에러

```
입력: aTest_v1 08 6
```

* 매칭 다수: `08-htmlart.html`, `08.1.basic-chain.html`, `08.2.relation-visual.html`, ...
* 응답:
    ```
    chapter prefix '08' 다중 매칭 — 더 구체적으로:
    - 08-htmlart
    - 08.1
    - 08.2
    - 08.3
    - 08.4
    - 08.5
    ```

# 적용 제외

* `Projects/` 외부 임의 HTML 열기 — 본 스킬 적용 범위 밖
* 슬라이드가 아닌 일반 웹 페이지 — `open -a` 직접 사용

# 참조

* URL 규약 SSOT: [`../../rules/apply-verify-rules.md`](../../rules/apply-verify-rules.md) §4.1
* 빌드 wrapper: [`../../../m2slide.sh`](../../../m2slide.sh)
* `/run` 커맨드 (빌드+cover 진입): [`../../commands/run.md`](../../commands/run.md)
