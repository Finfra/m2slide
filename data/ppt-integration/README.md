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
