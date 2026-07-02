---
name: sync-projects
description: Projects.md 활성/비활성 표를 Projects/<Name>/VERSION 기준으로 자동 동기화
date: 2026-07-02
---

# /sync-projects — Projects.md 표 동기화

`Projects.md` 의 활성/비활성 프로젝트 표를 실제 `Projects/` 폴더 + 각 폴더의 `VERSION` 파일 기준으로 자동 갱신하는 커맨드. (Issue253)

## 동작

`m2slide.sh --sync-projects` (내부적으로 `lib/sync-projects-md.js`) 실행:

* **활성 표**: `Projects/` 하위 실제 폴더(단, `_*`·`z*` 제외)를 행으로. **버전 열 = 각 폴더 `VERSION` 파일 값**.
    - 설명·Manual Check·publishing·작업 열은 **기존 행 보존**(사람 작성 열 머지)
    - 신규 폴더는 행 추가(빈 사람 열)
* **제거**(표에 있으나 폴더 없음): `# 비활성 프로젝트 (z_done)` 표로 행 이동 — 버전·설명 등 마지막 값 보존
* **되살아남**(비활성 표에 있으나 폴더 재생성): 활성 표로 복귀, 메타 승계
* **idempotent**: 재실행 시 안정. 표 정렬은 East-Asian 표시 폭 기준 공백 패딩(md-rules Table 준수)

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
* 버전 규칙: [`.claude/rules/project-version-rules.md`](../rules/project-version-rules.md)
* VERSION 컴파일 임베드: `lib/config.js loadProjectMeta` (Issue253)
