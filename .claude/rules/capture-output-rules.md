---
name: capture-output-rules
description: m2slide 캡처·스크린샷 파일 출력 경로 의무 (_doc_work/capture/) 및 루트 오염 차단 절차
date: 2026-05-24
---

# 적용 트리거

m2slide 저장소(`lib/m2slide/`)에서 다음 동작 발생 시 자동 발동:

* 스크린샷·캡처 파일(`.png`, `.jpg`, `.jpeg`, `.webp`) 신규 생성
* Playwright MCP `mcp__playwright__browser_take_screenshot` 호출 (filename 지정 또는 default `page-{ts}.png`)
* `fcapture` / `capture-w` / `capture-m` 스킬 실행
* AppleScript `screencapture` 직접 실행
* 비교용 변종 캡처(`compare-*.png`, `v2-*.png`, `slide-*.png`, `htmlart-*.png` 등) 생성

# 핵심 규칙

## 1. 출력 경로 의무

**모든 캡처·스크린샷 파일은 `_doc_work/capture/` 하위에 저장**. 프로젝트 루트(`lib/m2slide/`) 직속 저장 절대 금지.

| 경로                                        | 허용 여부          | 비고                                    |
| :------------------------------------------ | :----------------- | :-------------------------------------- |
| `_doc_work/capture/{name}.png`              | ✅ 정식 위치       | 기본 출력 경로                          |
| `_doc_work/capture/{subdir}/{name}.png`     | ✅ 서브폴더 OK     | 비교 세션·프로젝트별 그룹화             |
| `lib/m2slide/{name}.png` (루트)             | ❌ 금지            | `.gitignore` `/*.png` 패턴으로 차단     |
| `Projects/{Name}/img/{name}.png`            | ✅ 정식 자산       | 슬라이드 본문용 (캡처/스크린샷 아님)    |
| `Projects/{Name}/slide/img/{name}.png`      | ✅ 빌드 산출물     | `make_video.sh` 자동 복사 결과          |

## 2. 호출 시 filename/output 인자 명시

캡처 도구 호출 시 **반드시** 출력 경로를 명시:

```python
## ✅ Playwright MCP — filename 인자에 _doc_work/capture/ 경로 명시
mcp__playwright__browser_take_screenshot(
    filename="_doc_work/capture/compare-slide-22.png"
)

## ❌ filename 생략 → cwd 루트에 page-{ts}.png 떨어짐 → .gitignore 차단됨
mcp__playwright__browser_take_screenshot()
```

```bash
## ✅ screencapture
screencapture -i _doc_work/capture/slide-overview.png

## ❌ 루트에 떨어뜨림
screencapture -i ./screenshot.png
```

## 3. 차단 메커니즘 (이중 안전망)

| 메커니즘           | 위치                                  | 효과                                            |
| :----------------- | :------------------------------------ | :---------------------------------------------- |
| `.gitignore`       | `/*.png`, `/*.jpg`, `/*.jpeg`, `/*.webp` (루트 한정) | git 추적 차단 — 잘못 생성돼도 commit 안 됨    |
| 본 룰              | `.claude/rules/capture-output-rules.md` | 생성 시점 가드 — Claude가 호출 전 경로 검증 |
| 사후 정리          | 발견 시 즉시 `mv` → `_doc_work/capture/` | 회귀 시 복구 절차                              |

## 4. 폴더 부재 시 자동 생성

```bash
mkdir -p _doc_work/capture
```

* 캡처 호출 직전 폴더 존재 확인. 없으면 `mkdir -p`로 생성 후 진행
* 신규 프로젝트·서브폴더 사용 시도 동일

# 보고 규칙

캡처 실행 시 응답에 다음 명시:

```
캡처 저장: _doc_work/capture/{filename}.png
```

여러 건이면 목록으로 나열. 사용자가 위치를 즉시 확인 가능해야 함.

# 위반 시 대응

* 루트에 캡처 파일 발견 즉시 `_doc_work/capture/`로 이동 + 사용자 보고
* 동일 회귀 발견 시 `~/.claude/learning_log.md`에 한 줄 기록 (`* YYYY-MM-DD: m2slide 캡처 파일 루트 오염`)
* 외부 도구(MCP·스킬)의 기본 경로가 루트로 떨어지는 케이스 발견 시 본 룰에 회피 패턴 추가

# 예외

* 사용자가 명시적으로 다른 경로를 지정한 경우 (`./test.png에 저장` 등)
* 빌드 산출물(`Projects/{Name}/slide/`, `Projects/{Name}/img/`) — 캡처 아닌 정상 자산

# 배경

2026-05-24 사용자가 `lib/m2slide/` 루트에 9개 캡처 PNG(`compare-slide-22.png`, `v2-*.png`, `htmlart-numbered.png`, `slide-component-4.png`, `slide-large-viewport.png` 등) 누적 발견. 이전 세션 다수에서 Playwright MCP `browser_take_screenshot` 호출 시 filename에 `_doc_work/capture/` prefix 누락 → cwd 루트에 떨어짐. memory의 "스크린샷 캡처 경로" feedback 만으로는 회귀 차단 부족. 본 룰 + `.gitignore /*.png` 이중 안전망으로 재발 방지.

# 참조

* memory: `feedback_screenshot_capture_dir` — 캡처 파일은 _doc_work/capture/ 에 저장
* 글로벌 캡처 스킬: `~/.claude/skills/capture-g/SKILL.md`, `capture-w`, `capture-m`, `fcapture`
* 빌드·검증 룰: [`apply-verify-rules.md`](apply-verify-rules.md)
* m2slide 자산 경로: [`CLAUDE.md`](../../CLAUDE.md)
