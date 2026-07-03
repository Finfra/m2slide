---
name: release-date-rules
description: 슬라이드 소스 .md frontmatter 수정 시 release_date를 수정한 날짜로 자동 갱신하는 규칙
date: 2026-05-09
---

# 적용 트리거

m2slide 저장소(`lib/m2slide/`) 내 다음 파일의 **frontmatter 또는 본문 콘텐츠를 수정**하면 자동 발동:

* `Projects/{Name}/{Name}.md` (단일 페이지 모드 슬라이드 소스)
* `Projects/{Name}/markdown/AGENDA.md` (다중 챕터 모드 메타 출처)
* `Projects/{Name}/markdown/*.md` (챕터 모드 개별 챕터 소스)

위 파일을 한 건이라도 수정한 경우, 같은 응답 내에서 해당 파일 frontmatter `release_date` 필드를 **오늘 날짜(YYYY-MM-DD)**로 갱신함.

# 핵심 규칙

## 1. 갱신 대상

* frontmatter에 `release_date:` 필드가 **이미 존재**하는 경우만 갱신 (필드 신규 추가는 본 룰의 책임 밖)
* 챕터 모드의 메타 출처는 `markdown/AGENDA.md` — 챕터 개별 파일(`01-*.md` 등)에 `release_date`가 있으면 함께 갱신, 없으면 무시
* 단일 페이지 모드는 슬라이드 소스 `.md` 자체

## 2. 갱신 형식

```yaml
release_date: YYYY-MM-DD
```

* 시스템 컨텍스트 `currentDate` 또는 `date +%Y-%m-%d` 결과를 사용
* 시각·타임존 표기 금지 (날짜만)
* 따옴표 없이 일반 문자열로 작성 (기존 패턴 유지)

## 3. 갱신 시점

* 콘텐츠 수정과 **같은 응답 내**에서 처리 (다음 턴으로 이월 금지)
* `instructor_contact`·`version`·`title` 등 **다른 frontmatter 필드만** 수정한 경우에도 적용 (frontmatter 변경도 콘텐츠 변경으로 간주)
* 동일 응답 내에서 여러 프로젝트를 수정하면 **각 프로젝트의 메타 출처 파일을 모두** 갱신

## 4. 예외 (갱신 생략)

다음 조건 중 하나라도 해당하면 갱신 생략:

* 사용자가 명시적으로 "release_date 갱신 안 해도 돼", "날짜 유지" 등 우회 지시
* `release_date` 자체를 사용자가 직접 다른 값으로 지정 (사용자 지정 우선)
* 변경 대상이 슬라이드 소스가 아닌 보조 파일만인 경우 (`_config.yml` 단독, `Issue.md`, `_doc_arch/`, `_doc_work/`, `CLAUDE.md`, `README.md` 등)
* 빌드 산출물(`slide/*.html`)만 직접 수정한 경우 (소스 .md 미변경 시)

## 5. version 필드 동기화 (선택)

`version` 필드도 함께 변경하는 작업이라면 `release_date`는 그 변경과 한 묶음으로 갱신함. 단 본 룰은 `version` 자동 증가는 강제하지 않음 (사용자 결정).

# 보고 규칙

`release_date`를 갱신한 경우 응답 말미에 다음 형식으로 명시:

```
release_date 갱신: <파일 경로> (이전값 → YYYY-MM-DD)
```

여러 파일이면 목록으로 나열. 누락 시 사용자가 추적할 수 없으므로 보고 의무.

# 위반 시 대응

* 슬라이드 소스 수정 후 본 룰 누락이 발견되면 즉시 갱신 + 사용자 보고
* 사용자가 누락을 지적하면 `~/.claude/learning_log.md`에 한 줄 기록

# 참조

* 메타데이터 SSOT: [`_doc_arch/meta-yml.md`](../../_doc_arch/meta-yml.md)
* 빌드·검증 룰: [`apply-verify-rules.md`](apply-verify-rules.md)
* 슬라이드 마크다운 규칙: [`md-m2slide-rules.md`](md-m2slide-rules.md)
