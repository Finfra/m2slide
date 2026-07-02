---
name: project-version-rules
description: m2slide 프로젝트 폴더 버전 관리 규칙 — 폴더명 무버전 + VERSION 파일 SSOT, z_done 아카이브 시 버전 복원
date: 2026-07-01
---

# 적용 범위

`Projects/<Name>/` 하위 각 프로젝트 폴더의 버전 관리. 저장소 루트 `VERSION`(`/deploy` 커맨드용, m2slide 도구 자체 버전)과는 **별개**임.

# 핵심 원칙

* **폴더명은 무버전**: `Projects/<Name>/` — 폴더명에 `_v{버전}` 접미사 금지
* **버전 SSOT는 `Projects/<Name>/VERSION` 파일**: 버전 번호 1줄만 기록 (ex: `1.1`, `2`, `1.0`)
* **빌드 임베드 (Issue253)**: `./m2slide.sh <Name>` 빌드 시 `lib/config.js loadProjectMeta` 가 VERSION 파일을 읽어 `projectMeta.version` 에 주입(VERSION 우선, frontmatter `version:` fallback). cover 템플릿 `{{version}}` 치환은 정적 문자열을 산출하므로 산출물 HTML 에 **컴파일 시점 값이 박제**됨(런타임 파일 참조 아님).
* **표 동기화 (Issue253)**: `Projects.md` 활성/비활성 표는 [`/sync-projects`](../commands/sync-projects.md)(`./m2slide.sh --sync-projects`)로 VERSION 파일·실제 폴더 기준 자동 갱신. 버전 열은 VERSION 값으로 덮고, 설명 등 사람 작성 열은 보존. 폴더 제거 시 `# 비활성 프로젝트 (z_done)` 표로 이동.
* **Projects.md gitignored + Projects/.gitignore 구동 (Issue254)**: `Projects.md` 는 루트 `.gitignore` 에 등록된 **로컬 인덱스**(git 미추적). 그 **publishing 열이 `Projects/.gitignore` 추적 허용목록의 SSOT** — publishing 이 `o`(affirmative)인 폴더만 `!/<Name>/` 로 커밋 대상, `x`·빈값은 제외. `--sync-projects` 가 publishing → `Projects/.gitignore` 자동 생성하며, publishing 미기입 폴더는 현재 `Projects/.gitignore` 허용 여부로 `o` 역시드(fresh clone·회귀 방지). 표 열 순서는 `분류·프로젝트·버전·설명·Manual Check·publishing·작업`(7열). 추적 on/off 는 publishing 열 편집 후 재동기화(`.gitignore` 수동 편집 금지). 이미 커밋된 폴더를 `x` 로 제외 시 실제 untrack 은 `git rm --cached -r Projects/<Name>` 별도 필요. 상세: [`/sync-projects`](../commands/sync-projects.md) "Projects.md ↔ Projects/.gitignore 관계".
* 폴더 basename = 프로젝트명 (빌드 산출물 경로·프로젝트 식별자). 버전이 폴더명에 섞이면 rename 시 참조 동기화 부담 → VERSION 파일로 분리

# VERSION 파일 형식

```
1.1
```

* 버전 번호 1줄 (개행 포함). 주석·다른 필드 없음
* 형식 제약 없음 (semver 강제 안 함). 기존 접미사 값 그대로 이관: `_v1.1` → `1.1`, `_v2` → `2`, `_v1.0` → `1.0`, `_v1` → `1`
* 신규 프로젝트는 필요 시 생성 (없으면 버전 미관리로 간주)

# z_done 아카이브 시 버전 복원 (핵심)

프로젝트를 `Projects/z_done/`으로 이동할 때는 **VERSION 파일 값을 읽어 폴더명에 버전 접미사를 복원**함. 아카이브에서는 여러 버전이 공존할 수 있으므로 버전 구분이 필요하기 때문.

## 절차 (사람이 prompt로 지시할 때 Claude가 수행)

1. 대상 프로젝트 `Projects/<Name>/VERSION` 읽어 `<ver>` 확보
2. `<Name>_v<ver>` 형태로 z_done에 이동:
    ```bash
    ver=$(cat "Projects/<Name>/VERSION")
    git mv "Projects/<Name>" "Projects/z_done/<Name>_v${ver}"   # 추적 폴더
    # 미추적 폴더는 plain mv
    ```
3. VERSION 파일은 이동된 폴더 안에 **그대로 유지** (버전 SSOT 이중화 — 폴더명 + 파일 양쪽에서 버전 확인 가능)
4. 이름 충돌(`z_done/<Name>_v<ver>` 이미 존재) 시 사용자에게 보고 후 결정 (덮어쓰기 금지)

## 예시

| Projects/ (작업 중) | VERSION | z_done 이동 후 |
| :------------------ | :------ | :------------- |
| `AgenticCoding`     | `1.1`   | `z_done/AgenticCoding_v1.1` |
| `LlmAndVibeCoding`  | `2`     | `z_done/LlmAndVibeCoding_v2` |
| `LlmFlow`           | `1.0`   | `z_done/LlmFlow_v1.0` |

## 자동화 범위

* **현재는 prompt 기반 수동 수행** (헬퍼 스크립트 없음). 사용자가 "z_done으로 옮겨줘" 등 지시할 때 Claude가 본 절차대로 처리
* z_done에 이미 존재하는 무버전/버전 혼재 폴더(기존 아카이브)는 소급 정규화하지 않음 — 신규 이동분부터 본 규약 적용

# 위반 시 대응

* `Projects/<Name>/` 폴더명에 `_v{버전}` 접미사가 재등장하면 즉시 무버전으로 rename + VERSION 파일로 이관 ([`~/.claude/rules/rename-reference-rules.md`](~/.claude/rules/rename-reference-rules.md) 5단계 절차 준수)
* z_done 이동 시 버전 접미사 누락 발견하면 VERSION 읽어 재rename

# 참조

* rename 참조 동기화: [`~/.claude/rules/rename-reference-rules.md`](~/.claude/rules/rename-reference-rules.md)
* 저장소 루트 VERSION(도구 자체 버전, 별개): [`.claude/commands/deploy.md`](../commands/deploy.md)
* 프로젝트 구조: [`CLAUDE.md`](../../CLAUDE.md)
