---
name: sync-projects
description: Projects.md 활성/비활성 표 동기화 + publishing 열 SSOT 로 Projects/.gitignore·Projects_org.md 자동 생성
date: 2026-07-03
---

# /sync-projects — Projects.md 표 + Projects/.gitignore 동기화

`Projects.md` 의 활성/비활성 프로젝트 표를 실제 `Projects/` 폴더 + 각 폴더의 `VERSION` 파일 기준으로 자동 갱신하고, `Projects.md` 의 **publishing 열을 SSOT** 로 삼아 `Projects/.gitignore` 추적 허용목록을 자동 생성하는 커맨드. (Issue253 / Issue254)

## 동작

`m2slide.sh --sync-projects` (내부적으로 `lib/sync-projects-md.js`) 실행:

* **활성 표**: `Projects/` 하위 실제 폴더(단, `_*`·`z*` 제외)를 행으로. **버전 열 = 각 폴더 `VERSION` 파일 값**.
    - 설명·Manual Check·publishing·작업 열은 **기존 행 보존**(사람 작성 열 머지)
    - 신규 폴더는 행 추가(빈 사람 열)
* **제거**(표에 있으나 폴더 없음): `# 비활성 프로젝트 (z_done)` 표로 행 이동 — 버전·설명 등 마지막 값 보존
* **되살아남**(비활성 표에 있으나 폴더 재생성): 활성 표로 복귀, 메타 승계
* **`Projects/.gitignore` 자동 생성 (Issue254)**: `Projects.md` **publishing 열이 `o`(affirmative: o·y·yes·✓ 등)인** 활성 폴더만 `!/<Name>/` 로 추적 허용. **`x`·빈값은 제외**(ignore). publishing 은 o/x yes-no 마커
    - 열 순서: `분류` · `프로젝트` · `버전` · `설명` · `Manual Check` · `publishing` · `작업` (7열). `분류`(PR/lec/m2 등)는 사람 작성 열로 보존
    - 고정 프리앰블(`/*` 전체 ignore + 특수 파일 `!/.gitignore`·`!/README.md`·`!/slide.css.md`) 뒤에 폴더 허용목록을 sort 하여 생성
    - **publishing 시드(회귀 방지)**: publishing 값이 비어 있고 폴더가 **현재 `Projects/.gitignore` 에 이미 허용**돼 있으면 `publishing='o'` 로 자동 채움 — 기존 추적 상태를 그대로 보존. `Projects.md` 는 gitignored 로컬 파일이라 fresh clone 시 publishing 값이 사라지므로, 커밋된 `Projects/.gitignore` 로부터 역시드
    - **이미 커밋된 폴더를 `x` 로 제외 시**: gitignore 재생성은 새 파일만 무시함. 기존 추적을 실제로 끊으려면 `git rm --cached -r Projects/<Name>` 별도 실행(파일 디스크 보존, 다음 push 시 github 제거)
    - 실행 로그에 추적 추가/제외 diff 출력
* **`Projects_org.md` 자동 생성**: `publishing` 이 affirmative 인 행만 `분류`·`프로젝트`·`버전`·`설명` 4열로 추출해 공개용 문서로 파생. `Manual Check`·`작업` 등 내부 메모 열은 제외. 표 내용이 그대로면 date 갱신도 skip(노이즈 방지). **직접 편집 금지** — SSOT 는 `Projects.md`
* **idempotent**: 재실행 시 안정(Projects.md + Projects/.gitignore + Projects_org.md 전체). 표 정렬은 East-Asian 표시 폭 기준 공백 패딩(md-rules Table 준수)

## Projects.md ↔ Projects/.gitignore 관계 (Issue254)

* `Projects.md` 는 **gitignored 로컬 인덱스**(루트 `.gitignore` 에 `Projects.md` 등록). Issue.md·CLAUDE.md 처럼 추적하지 않음
* `Projects/.gitignore` 는 **커밋되는 산출물** — `Projects.md` publishing 열이 구동하는 추적 결정의 영속 형태(SSOT 는 Projects.md, 커밋 스냅샷은 .gitignore)
* 프로젝트 추적 on/off: `Projects.md` publishing 열을 편집 → `--sync-projects` 재실행 (`Projects/.gitignore` 직접 수동 편집 금지)
* 데이터 흐름: `Projects/` 폴더 + `VERSION` + `Projects/.gitignore`(publishing 시드) → **Projects.md** → **Projects/.gitignore** + **Projects_org.md**
* `Projects.md` = 개인용(전체, gitignored) / `Projects_org.md` = 공개용(publishing=o 만, git 추적, README.md 에서 링크) — 역할 분리

## 사용

```bash
# 동기화 실행 (파일 갱신)
./m2slide.sh --sync-projects

# 변경 필요 여부만 판정 (파일 미수정, 변경 필요 시 exit 1 — CI/pre-commit 용)
./m2slide.sh --sync-projects --check
```

## 적용 시점

* 프로젝트 폴더 신설·제거 후
* 프로젝트 `VERSION` 파일 값 변경 후
* `Projects.md` 표와 실제 폴더 상태가 어긋났다고 의심될 때

## 참조

* 스크립트: [`lib/sync-projects-md.js`](../../lib/sync-projects-md.js)
* 공개 프로젝트 목록: [`Projects_org.md`](../../Projects_org.md) (README.md 에서 링크)
* dev-server `/p/` 페이지: `Projects.md` 활성 표를 읽기 전용으로 미러링 (`lib/dev-server/server.py` `_read_projects_md_active_rows`)
* 버전 규칙: [`.claude/rules/project-version-rules.md`](../rules/project-version-rules.md)
* VERSION 컴파일 임베드: `lib/config.js loadProjectMeta` (Issue253)
