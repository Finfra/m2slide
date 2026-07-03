---
name: run
description: m2slide 프로젝트를 빌드하고 Google Chrome에서 자동 실행
date: 2026-05-01
---

# /run 커맨드

m2slide 프로젝트를 빌드하고 생성된 슬라이드를 Google Chrome에서 자동 실행하는 wrapper 커맨드.

## 사용법

```
/run [프로젝트명]
```

**인자**:
- `[프로젝트명]` (선택): `Projects/{프로젝트명}/` 경로의 프로젝트. 생략 시 IDE 컨텍스트 → default 순서로 자동 결정

## 프로젝트명 결정 우선순위

| 순위 | 소스                      | 조건                                                                       |
| :--- | :------------------------ | :------------------------------------------------------------------------- |
| 1    | `$ARGUMENTS`              | 사용자가 `/run xxx` 명시                                                   |
| 2    | IDE 컨텍스트              | `<ide_opened_file>` / `<ide_selection>` 경로에서 `Projects/([^/]+)/` 캡처 |
| 3    | default                   | `m2Slide_single_mode`                                                     |

## 실행 절차

1. **인자 확인**: `$ARGUMENTS`가 비어있지 않으면 그 값을 프로젝트명으로 채택 → 4로
2. **IDE 컨텍스트 검사**: 현재 메시지 컨텍스트의 `<ide_opened_file>` 또는 `<ide_selection>` 태그에서 절대경로 추출
   - 정규식 `lib/m2slide/Projects/([^/]+)/` 매칭 시 첫 캡처 그룹을 프로젝트명으로 채택 → 4로
3. **default 사용**: 위 둘 다 실패하면 `m2Slide_single_mode`
4. **결정 근거 1줄 보고**: ex) "IDE 컨텍스트에서 `layoutTest` 감지" / "인자 사용: `MarkdownGraph`" / "default 사용: `m2Slide_single_mode`"
5. **wrapper 스크립트 실행**: `.claude/skills/run.sh {프로젝트명}` 호출
6. **결과 보고**: 빌드 성공/실패 + 실행된 HTML 파일 경로 안내

## 동작

wrapper 스크립트(`.claude/skills/run.sh`)가 다음을 처리:

1. 프로젝트 디렉토리 존재 확인
2. 기존 `slide/` 폴더 정리 (`rm -rf`)
3. `./m2slide.sh {프로젝트명}` 빌드 실행
4. 생성된 HTML 자동 감지:
   - `index.html` 있으면 목차 페이지 (챕터 모드)
   - 없으면 첫 HTML 파일 (단일 페이지 모드)
5. Google Chrome으로 브라우저 실행

## 예시

```
/run layoutTest
/run m2Slide_single_mode
/run MarkdownGraph
/run                # 기본값: m2Slide_single_mode
```

## 에러 처리

- **프로젝트 없음**: 사용 가능한 프로젝트 목록 표시 후 종료
- **빌드 실패**: `m2slide.sh` 에러 출력 표시
- **HTML 누락**: 생성된 HTML 파일 없을 시 알림
- **Chrome 부재**: 시스템 기본 브라우저로 fallback

## 구현 위치

- 커맨드 정의: `.claude/commands/run.md`
- 실제 구현: `.claude/skills/run.sh`
- 원본 참조: `run.sh` (루트 wrapper, 하드코딩된 프로젝트명)

## Claude 실행 지침

이 커맨드 호출 시 위 "프로젝트명 결정 우선순위" 표를 따라:

1. `$ARGUMENTS` 비어있으면 IDE 컨텍스트(`<ide_opened_file>`/`<ide_selection>`) 검사
2. IDE 경로가 `lib/m2slide/Projects/{name}/...` 패턴이면 `{name}` 채택
3. 어느 단계에서 결정됐는지 한 줄로 사용자에게 알림
4. Bash 도구로 `.claude/skills/run.sh "${프로젝트명}"` 실행
5. 실행 결과(stdout/stderr) 사용자에게 전달
6. 추가 액션 없이 종료 (브라우저 실행은 스크립트가 처리)
