---
title: free-image
description: 저작권 프리(CC 라이선스) 이미지를 Openverse API로 주제 검색·다운로드하고 CREDITS.md에 출처·라이선스를 자동 기록. 슬라이드·문서 이미지 삽입 시 사용.
date: 2026-07-12
---

# 목적

저작권 걱정 없이 쓸 수 있는 이미지를 주제로 검색해 내려받고, 저작자 표시 의무(CC-BY/BY-SA)를 위해 출처를 자동 기록한다. m2slide 덱·문서에 이미지가 필요할 때 사용.

* 소스: [Openverse](https://openverse.org) — CC0/CC-BY/CC-BY-SA 이미지 aggregator (API 키 불요)
* 산출: 대상 폴더에 이미지 파일 + `CREDITS.md` (출처·라이선스)

# 트리거

* "저작권 없는/프리 이미지 다운로드", "이미지 받아서 적용", "CC 이미지 넣어줘"
* 슬라이드·문서에 실제 사진이 필요한 경우

# 사용법

```bash
python3 .claude/skills/free-image/fetch.py \
  --query "ramen noodles" \
  --out Projects_deck/decks/misc/RamyeonCooking/img \
  --count 3 \
  --prefix ramen
```

| 옵션 | 설명 | 기본 |
| :--- | :--- | :--- |
| `--query` / `-q` | 검색어 (영어 권장 — 결과 풍부) | 필수 |
| `--out` / `-o` | 저장 폴더 (없으면 생성) | 필수 |
| `--count` / `-n` | 다운로드 장수 | 3 |
| `--prefix` / `-p` | 파일명 prefix (`<prefix>_NN.jpg`) | query 첫 단어 |
| `--license` | 허용 라이선스 CSV | `cc0,by,by-sa` |
| `--orientation` | `tall`/`wide`/`square` | 무관 |
| `--min-width` | 최소 가로 픽셀 | 800 |

* 종료 코드: `0`=1장 이상 성공, `3`=결과 없음/전부 실패, `2`=인자 오류
* 여러 주제를 순차 실행하면 `CREDITS.md`에 주제별로 누적 기록됨

# 실행 절차 (Claude)

1. 필요한 주제별로 `fetch.py` 를 1회씩 실행 (예: 표지·재료·완성 컷)
2. 실패(rc 3) 시 검색어를 바꿔 **1회 재시도** — 2회 연속 실패면 사용자 보고 후 중단 (opus-4-8 재시도 정책)
3. 다운로드한 파일명을 슬라이드 마크다운의 `./img/<파일>` 상대경로로 참조
4. CC-BY/BY-SA 가 포함되면 **덱 마지막에 출처(credits) 슬라이드**를 두고 `CREDITS.md` 내용을 요약 표기
5. 결과 보고: 저장 장수·폴더·라이선스 구성·CREDITS.md 경로

# 라이선스 주의

* `cc0` = 표시 의무 없음(자유). `by`·`by-sa` = **저작자 표시 필수**, `by-sa` 는 2차 저작물도 동일 라이선스 유지
* 상업·공개 배포 저장소면 `--license cc0,by` 로 좁혀 표시 부담을 줄일 수 있음
* 인물·상표·로고가 담긴 이미지는 라이선스와 별개로 초상권·상표권 이슈 가능 — 배경/사물 위주 검색 권장

# 제약 (opus-4-8-execution-rules 준수)

* 네트워크 호출은 주제당 **1회 요청 + over-fetch**(결과 5배 조회 후 상위 N장 저장)로 재시도 최소화
* 다운로드 실패 이미지는 skip 하고 다음 후보로 대체 (조용한 실패 없음 — stderr 로그)
* 대상 폴더 외부에 파일을 쓰지 않음

# 참조

* 배포 검증 룰(상대경로 이미지): [`../../rules/file-deployment-rules.md`](../../rules/file-deployment-rules.md)
* m2slide 이미지 삽입: [`../../rules/md-m2slide-rules.md`](../../rules/md-m2slide-rules.md) "이미지·자산"
* Openverse API: https://api.openverse.org/v1/
