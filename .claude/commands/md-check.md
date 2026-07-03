---
name: md-check
description: m2slide 슬라이드 마크다운(.md)에서 default _contents layout 적용 시 발생하는 title 추출 누락 문제 검출·수정
date: 2026-05-10
---

# /md-check 커맨드

m2slide 빌드 결과에서 슬라이드 제목 밴드(노란 밑줄·puffer)가 사라지는 문제를 사전 차단하는 검사 도구. 슬라이드 마크다운(`type: ppt`) 파일을 분석하여 default `_contents` layout 적용 시 title 추출이 누락되는 패턴을 찾는다.

## 사용법

```
/md-check [--fix] <파일_또는_디렉토리>...
```

**인자**:
- `<파일_또는_디렉토리>` (1개 이상): 검사 대상. `.md` 파일 또는 폴더(재귀 탐색)
- `--fix` (선택): 검출된 문제 자동 수정 (H1 → H2 변환)

생략 시 IDE 컨텍스트(`<ide_opened_file>`)에서 `Projects/{name}/` 패턴 추출하여 자동 결정.

## 검출 항목

| 코드     | 의미                                                                                                       | 자동 수정      |
| :------- | :--------------------------------------------------------------------------------------------------------- | :------------- |
| `M2C001` | 슬라이드 제목으로 H1 사용 — children H2 없음. default `_contents` layout에서 title 추출 실패 → 제목 밴드/divider 미표시 | H1 → H2 변환   |

## 진단 배경

`lib/slide-parser.js` line 359-370:
```js
let slideTitle = '';
if (layout) {                              // ← layout이 null이면 추출 skip
    const extracted = extractFirstH1(textForSlide);
    slideTitle = extracted.title;
}
```

`#layout-*` 디렉티브 없고 autoLayoutDetect 미해당이면 `layout = null` → `slideTitle = ''` → 빈 contents-header가 Issue90 cleanup으로 삭제 → 제목 밴드 사라짐.

`html-builder.js` line 443-447의 lift-out 로직은 `h[2-6]`만 처리하므로 H2 슬라이드 제목은 정상 동작 → **슬라이드 제목은 H2 권장** (md-m2slide-rules 컨벤션과 일치).

## 실행 절차

1. **인자 결정 우선순위**:
    - `$ARGUMENTS` 비어있지 않으면 그 값 채택
    - 비어있으면 IDE 컨텍스트(`<ide_opened_file>`/`<ide_selection>`) 검사 → `Projects/{name}/` 캡처
    - 그래도 없으면 사용자에게 인자 요구 후 종료
2. **결정 근거 1줄 보고**: ex) "IDE 컨텍스트에서 `ramyeon` 감지 → `Projects/ramyeon` 검사"
3. **wrapper 실행**: `.claude/skills/md-check.sh [--fix] <경로>` 호출
4. **결과 보고**:
    - 검출 0건: ✅ 통과 안내
    - 검출 N건 (--fix 없음): 파일별 라인·코드·메시지 + "자동 수정: --fix 추가" 안내
    - 수정 적용: 변경 파일 목록 + 재빌드 권장 (`/run <ProjectName>`)

## 예시

```
/md-check Projects/ramyeon                           # 검사만 (dry-run)
/md-check --fix Projects/ramyeon/ramyeon.md          # 자동 수정
/md-check Projects/                                  # 전체 프로젝트 일괄 검사
/md-check                                            # IDE 컨텍스트 자동 감지
```

## 종료 코드 (Bash 스크립트 동작)

| 코드 | 의미                                            |
| :--- | :---------------------------------------------- |
| 0    | 문제 없음 (또는 --fix 적용 후 모두 수정 완료)   |
| 1    | 문제 검출 (--fix 없음) 또는 인자 오류           |
| 2    | 내부 오류                                       |

## 검사 제외

- `AGENDA.md` (chapter mode 메타 파일 — slide-parser 경로 다름)
- frontmatter `type: ppt` 미지정 파일
- `slide/`, `node_modules/`, `.git/`, `res/`, `wav/`, `img/`, `kroki/`, `_doc_work/`, `z_done/`, `z_old/`, `try0/`, `graphify-out/` 디렉토리

## 후속 작업

수정 적용 후:
1. `/run <ProjectName>` 으로 재빌드 + 브라우저 검증 권장
2. frontmatter에 `release_date` 필드 있으면 release-date-rules에 따라 오늘 날짜로 갱신

## 구현 위치

- 커맨드 정의: `.claude/commands/md-check.md`
- wrapper 스크립트: `.claude/skills/md-check.sh`
- 실제 로직: `.claude/skills/md-check.js` (Node.js)

## 관련 룰·문서

- [`md-m2slide-rules.md`](../rules/md-m2slide-rules.md) — m2slide 슬라이드 마크다운 컨벤션
- [`apply-verify-rules.md`](../rules/apply-verify-rules.md) — 빌드·검증 절차
- [`release-date-rules.md`](../rules/release-date-rules.md) — frontmatter release_date 자동 갱신

## Claude 실행 지침

이 커맨드 호출 시:

1. `$ARGUMENTS`가 `--fix`만 있고 경로가 없으면 IDE 컨텍스트에서 경로 추출
2. 경로 + 옵션 결정 후 한 줄로 사용자에게 알림
3. Bash 도구로 `.claude/skills/md-check.sh` 호출 (인자 그대로 전달)
4. 표준 출력을 그대로 사용자에게 전달
5. 종료 코드 1(검출됨, --fix 없음)이면 "자동 수정 원하면 `--fix` 추가" 안내
6. 수정 적용 후 종료 코드 0이면 재빌드 권장 (`/run <ProjectName>`)
