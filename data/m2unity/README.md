---
name: README
description: m2unity 계약 fixture — 덱 IR 스키마 + 골든 덱. 설계 정본은 _doc_arch/m2unity-contract.md
date: 2026-07-13
---

# m2unity 계약 데이터

m2unity(markdown→Unity 렌더 백엔드)가 추종하는 m2slide 측 계약 자산. 설계 정본(3종 계약 정의)은 [`_doc_arch/m2unity-contract.md`](../../_doc_arch/m2unity-contract.md).

| 파일 | 역할 |
| :--- | :--- |
| `deck-ir.schema.json` | 덱 IR(JSON) 계약 스키마 (draft-07) |
| `golden-deck/golden.md` | 공용 골든 덱 소스 |
| `golden-deck/golden.ir.json` | 동결 기대 IR — 양측 파서 회귀 타깃 |

* 거버넌스: m2slide 가 계약 마스터, m2unity 는 추종. 변경은 m2slide 발 단방향.
* `golden.ir.json` 은 하드 오소링 동결 파일 — m2slide 발 PR 로만 변경.
