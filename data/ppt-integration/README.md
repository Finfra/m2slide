---
name: README
description: m2slide 프로젝트에 ig-maker·ppt-* 글로벌 SCAR 를 붙일 때 쓰는 설정 템플릿 2종
date: 2026.08.11
---

설계 SSOT 는 [`_doc_arch/ig-ppt-integration.md`](../../_doc_arch/ig-ppt-integration.md) 다. 여기 있는 것은 **프로젝트에 복사해 쓰는 템플릿**뿐이다.

| 파일 | 복사 위치 | 무엇 |
| :--- | :--- | :--- |
| [`pptx.yml.template`](pptx.yml.template) | `Projects/<N>/.claude/pptx.yml` | ig-maker 경로 4키 |
| [`ig-selector.yml.template`](ig-selector.yml.template) | `Projects/<N>/.claude/ig-selector.yml` | 선별·비용 임계 **부분 재정의** |

```bash
mkdir -p Projects/<N>/.claude
cp data/ppt-integration/pptx.yml.template        Projects/<N>/.claude/pptx.yml
cp data/ppt-integration/ig-selector.yml.template Projects/<N>/.claude/ig-selector.yml   # 선택

# 4키가 의도대로 풀리는지 확인
python3 ~/.claude/skills/ig-maker/scripts/igpath.py resolve --start Projects/<N> --json
```

⚠️ **루트 `.claude/` 에 두지 말 것.** 상대경로 기준이 `.claude/` 의 부모라서, 루트에 두면 모든 덱이 같은 `ppt_root` 를 물어 서로의 산출물을 덮는다.

⚠️ 비용은 **장당 약 33만 토큰 · 25~30분**이다. 팬아웃을 늘리는 쪽은 임계를 **올리는** 재정의다 — 게이트가 늦게 걸리므로 그만큼 승인 없이 지나간다. 올릴 때는 왜 올리는지 프로젝트 이슈에 근거를 남긴다. (구 문구는 방향이 반대였다 — Issue313 에서 정정)

`ig-selector.yml` 은 **권장**이다(선택 아님). 기본 임계(warn 5 · hard 10)는 m2slide 덱에서 사실상 걸리지 않는다 — 35장 덱의 후보가 6장(198만 토큰)인데 통과한다(Issue313 실측). 템플릿은 이 값을 `warn 2 · hard 3` 으로 내려 둔 상태다.

게이트가 실제로 끊는지는 비용 0 으로 확인할 수 있다:

```bash
./z_test/ig-ppt/0.cost-gate.sh     # ig-maker 를 돌리지 않는다. 장수만 센다
```

## igTest 픽스처 재구축 시퀀스 (Issue324 실측 2026-08-18)

픽스처를 처음부터 다시 만들 때의 검증된 순서. 1~4는 분 단위·비용 0, 5의 팬아웃 1장만 약 32만 토큰·23분(sonnet 실측 — 글로벌 장당 실측치와 일치).

1. **보존**: 기존 `Projects/igTest` 는 삭제하지 말고 밖(스크래치)으로 이동
2. **원본 복사**: `~/.claude/playground/resource/m2slide` 에서 `markdown/`·`_config.yml`·`VERSION`·`Info.md` 만 (빌드 산출물·`_pipeline/` 제외 — Issue319 규약)
3. **템플릿 배치**: 본 폴더 2종 → `Projects/igTest/.claude/` (`pptx.yml` 의 `<덱이름>` → `strengths`) → `igpath resolve --start Projects/igTest --json` 으로 4키 확인
4. **회귀**: `./m2slide.sh igTest` → `./m2slide.sh igTest --pptx`(rc0 = 검증 통과) → `./z_test/ig-ppt/0.cost-gate.sh` → `./z_test/ig-ppt/2.deck.sh`
5. **E2E 1장** (게이트 임계 warn 2 미만):
    - `./lib/ig/capture-for-ig.sh igTest 4 3 --deck strengths` — 덱 투입구가 없으면 fail-loud 로 `ppt-init` 명령을 안내한다(`_org/` 생성은 ppt-init 소관, 설계 §5-3-a)
    - `python3 ~/.claude/skills/ppt-init/scripts/init.py strengths --lane b --root Projects/igTest/ppt --source <캡처>.png --theme strengths`
    - `Agent(subagent_type="ig-maker")` page 1 — 작업 기준 디렉토리를 `Projects/igTest` 로 명시(4키 해소), m2slide SVG 규약 5종(특히 슬라이드 크롬 미포함·원문 문구 보존)을 프롬프트에 동봉
    - `python3 ~/.claude/skills/ig-maker/scripts/igpublish.py --ppt strengths --pages 1 --start Projects/igTest`
    - `markdown/04-strengths.md` 의 `::: cards` 7항목 블록을 `![](./img/strengths-1.svg)` 로 교체 (+ AGENDA.md `release_date` 갱신)
    - `./z_test/ig-ppt/1.infographic.sh` — 검사 4(원문 보존)는 **렌더 텍스트·공백 무시** 기준이다: SVG 는 자동 줄바꿈이 없어 제목이 `<tspan>` 분절로 감싸이는데, raw `grep -F` 는 그것을 누락으로 오탐한다(2026-08-18 실측·교정)
