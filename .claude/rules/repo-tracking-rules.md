---
name: repo-tracking-rules
description: git push 용량 초과 재발 방지 — 배포 불필요 자산 gitignore 정책 + 신규 자산 추가 시 판정 절차
date: 2026-07-03
---

# 배경

2026-07-02 push 실패(190M → 원인: `_pipeline/`·`refs/`·`pdf`·미발행 `epub`·`_doc_arch`·`_doc_work` 등이 장기간 git 추적되며 history 누적). `git filter-repo`로 31.77M까지 축소 + force-push 후 해결. 본 룰은 같은 재발을 방지하기 위해 "무엇을 왜 추적 안 하는지"를 SCAR 레벨에 고정함 (`.gitignore` 주석만으로는 미래 세션이 정책을 다시 발견하기 어려움).

# 현재 gitignore 정책 (루트 `.gitignore` 하단)

| 카테고리 | 패턴 | 근거 |
| :--- | :--- | :--- |
| ppt2m2slide 역변환 스캐치 | `**/_pipeline/` | raw-media·img-fullext·pptx2md-out 등 원본 pptx로 재생성 가능한 중간 산출물 |
| 리서치 스크랩 | `Projects/*/refs/` | 배포 자산 아님, 사람이 참고만 하는 원본 자료 |
| PDF | `*.pdf` | m2slide는 html/epub만 배포 산출물로 인정. PDF 필요 시 `deploy_formats: [pdf]`로 빌드 시점에만 생성 |
| EPUB | `*.epub` + `!/Projects/{name}/slide/*.epub` + `!/docs/{name}/*.epub` 화이트리스트 | `docs/`(Pages)에 실제 발행되는 프로젝트만 추적. 미발행 프로젝트의 epub는 히스토리에 쌓이면 안 됨 |
| 영속 설계 문서 | `_doc_arch` | 로컬 전용 — 팀 공유 필요해지면 재검토(현재는 로컬 세션 산출물로 간주) |
| nPTiR 작업 문서 | `_doc_work` | plan/task/report 포함 전체가 로컬 전용. `_doc_work/capture`(스크린샷)·`_doc_work/z_htm`(hub 렌더)도 동일 |
| 사람 메모 | `noteForHuman.md`, `noteForHuman*.md` | AI 미사용, 로컬 전용 |
| vendor 런타임 자산 | **`lib/vendor/` = 추적**(gitignore 안 함), `Projects/*/slide/vendor/` = 제외(`Projects/.gitignore /*`) | Issue270 오프라인 self-contained. `lib/vendor/`(~21M)는 배포 필수(clone→오프라인 즉시 작동)라 추적. 빌드 산출 `slide/vendor/`는 `lib/vendor/`에서 재복사되는 중간물이라 제외. woff2/woff만 보관(.ttf 제외)로 용량 절감. 재생성: `node lib/vendor/fetch-vendor.js` |

# 신규 자산 추가 시 판정 절차

새로운 파일 유형·폴더를 프로젝트에 추가하기 전에 다음 질문으로 추적 여부를 결정:

1. **`docs/`(GitHub Pages)에서 실제로 서빙되는가?** → Yes: 추적. No: 2번으로.
2. **원본(pptx/pdf 등)에서 재생성 가능한 중간 산출물인가?** → Yes: gitignore. No: 3번으로.
3. **팀 전체가 공유해야 하는 설계/정책 문서인가, 아니면 이 세션·이 로컬에서만 쓰는 작업 메모인가?** → 후자면 gitignore.
4. 판단이 애매하면 일단 추적하지 않고(gitignore) 필요해지면 화이트리스트 추가 — 지우는 것보다 나중에 추가하는 게 history 오염 없이 쉬움.

**대용량 미디어(mp4 등)**: git에 넣지 말고 `finfra.kr:/nowage/www/<path>/` 로 업로드 후 `https://finfra.kr/<path>/<file>` URL로 참조 (fPmIntro 데모 mp4 선례, `.gitignore`의 `*.mp4` 규칙 참조).

# `_pipeline/`류 스캐치 폴더 생성 규칙

ppt2m2slide 등 신규 파이프라인 도구가 `_pipeline/`·`_cache/`·`_tmp/` 등 이름의 중간 산출물 폴더를 새로 만드는 경우, **도구 작성 시점에 바로 `**/{새폴더명}/` 패턴을 루트 `.gitignore`에 추가**할 것. "일단 만들고 나중에 정리"하면 history에 누적된 뒤에는 `git filter-repo` 같은 파괴적 작업(force-push 필요, 협업자 재clone 필요)이 아니면 되돌릴 수 없음.

# 정기 점검 (선택)

push 용량 문제 재발 징후 감지 시:

```bash
git count-objects -vH                              # pack 크기 확인
du -sh Projects/*/                                  # 로컬 디스크 기준 큰 프로젝트 찾기
git ls-files -z | xargs -0 du -k | sort -rn | head  # 현재 tracked 대용량 파일
```

pack이 비정상적으로 크면(예: 50M 초과) 위 표의 카테고리부터 재확인.

# 참조

* GitHub Pages Actions 전환·배포 트러블슈팅: [`.claude/commands/deploy-docs.md`](../commands/deploy-docs.md)
* 대용량 파일 이관 선례: `Projects/fPmIntro/markdown/01-what-is-fpm.md` (mp4 → finfra.kr URL)
* 발행 여부 확인용 프로젝트 인덱스: [`Projects_org.md`](../../Projects_org.md), [`.claude/commands/sync-projects.md`](../commands/sync-projects.md)
