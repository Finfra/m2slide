---
title: slide-compare
description: m2slide 빌드 슬라이드와 원본 PDF/PPTX를 페이지 단위로 캡처·매칭·**side-by-side review** HTML을 생성하는 재사용 스킬. slide-tuner agent의 캡처·페어링·폼 단계, ppt2m2slide agent의 round-trip 검증 단계가 공유 사용. 피드백 회수·md 수정 루프는 호출 agent 책임 (본 스킬은 side-by-side review 장치만 제공).
date: 2026-05-27
---

# 책임 범위

side-by-side review 장치(capture + pairing + side-by-side review HTML 생성) **만** 담당. 호출 agent별 책임 분리:

| Agent | 본 스킬 사용 시점 | 후속 책임 |
| :--- | :--- | :--- |
| `slide-tuner` | Step 4(캡처·페어링) + Step 5(폼 HTML 작성) 대체 | 피드백 회수·분류·md 수정·재빌드 루프 |
| `ppt2m2slide` | 변환 완료 후 round-trip 검증 옵션 | 후속 보고 (비교 결과를 사용자에게 단순 제시) |
| 임의 사용자 | 외부 도구 변환 결과를 시각 비교 | 별도 |

본 스킬은 비교 결과를 화면에 띄우고 (선택적으로) 피드백 endpoint를 노출만 함. **피드백 분류·md 수정·재빌드는 호출 agent의 책임**.

# 입력 인터페이스

```
slide-compare <project> --original <pdf_or_pptx_path> [--out <dir>] [--viewport WxH] [--mode init|batch|end|all] [--hwm-file <path>] [--batch <N>] [--form] [--no-form]
```

| 인자 | 필수 | 기본 | 설명 |
| :--- | :--: | :--- | :--- |
| `<project>` | 필수 | — | `Projects/<Name>` 또는 `<Name>` |
| `--original <path>` | 필수 | — | 비교 원본 — PDF 직접 또는 PPTX (PPTX는 내부에서 libreoffice 거쳐 PDF 변환) |
| `--out <dir>` | 선택 | `_doc_work/capture/tuner/<TS>/` | 캡처 출력 디렉토리 |
| `--viewport WxH` | 선택 | `_config.yml slide_ratio` 기반 자동 | Playwright 캡처 viewport (1920x1080 / 1920x1280 등) |
| `--mode <m>` | 선택 | `all` | `init`(첫 10) / `batch`(HWM..HWM+N) / `end`(마지막 10) / `all`(전체) |
| `--hwm-file <path>` | 선택 | `_doc_work/tuner/<project>/hwm.yml` | HWM 진행 파일 — batch/init 모드에서 사용 |
| `--batch <N>` | 선택 | 20 | batch 모드의 카드 수 |
| `--form` | 선택 | (자동 on) | 비교 HTML form 생성 + Firefox open |
| `--no-form` | 선택 | — | form 생략 — pairing.yml 만 출력 (round-trip 검증용) |

# 단계 (6단계)

## Step 1 — dev-server 시동

```bash
./m2slide.sh --serve start
```

idempotent. 이미 떠 있으면 skip. port 9877.

## Step 2 — 빌드 (선택)

호출 agent가 책임. 본 스킬은 이미 빌드된 산출물(`Projects/<P>/slide/*.html`)을 가정. 빌드 자동화 필요 시 호출 agent에서 `./m2slide.sh <project>` 사전 실행.

## Step 3 — 원본 PDF 추출

원본이 PDF면 그대로 사용. PPTX면 libreoffice로 PDF 변환:

```bash
mkdir -p {out}/pdf-pages
if [[ "$ORIG" == *.pptx ]]; then
  libreoffice --headless --convert-to pdf --outdir {out} "$ORIG"
  PDF="{out}/$(basename $ORIG .pptx).pdf"
else
  PDF="$ORIG"
fi
pdftoppm -r 150 -png "$PDF" "{out}/pdf-pages/pdf"
```

출력: `{out}/pdf-pages/pdf-NNN.png` (1-base, zero-padded 3자리).

## Step 4 — viewport 결정

```bash
python3 << 'EOF'
import yaml, re, json, sys
cfg = open('Projects/<P>/_config.yml').read()
m = re.search(r'^slide_ratio:\s*["\']?([^"\'\n]+)', cfg, re.M)
ratio = m.group(1).strip() if m else 'auto'
table = {'16:9': (1920, 1080), '3:2': (1920, 1280), '4:3': (1920, 1440), 'fill': (1920, 1080)}
vp = table.get(ratio, (1920, 1080))
print(json.dumps({'width': vp[0], 'height': vp[1], 'ratio': ratio}))
EOF
```

`--viewport WxH` 명시 시 우선.

## Step 5 — m2slide 슬라이드 캡처 (Playwright MCP)

`Projects/<P>/markdown/AGENDA.md` 또는 `slide/*.html` 목록으로 chapter list 산출. 각 챕터의 슬라이드 수는 `http://localhost:9877/p/<P>/s/<chap>` JSON endpoint로 확인.

각 슬라이드:
```
mcp__playwright__browser_navigate("http://localhost:9877/p/<P>/s/<chap>/<slide>?_=${TS}")
mcp__playwright__browser_take_screenshot(filename="{out}/slide-c<chap>-s<slide>.png")
```

cache-bust 위해 `?_=${TS}` 쿼리 추가.

## Step 6 — pairing.yml 생성

페이지 순서 매칭. 기본 규칙:

* m2slide 슬라이드 수가 PDF 페이지 수와 같으면 1:1 매핑
* m2slide 슬라이드 수 < PDF 페이지 수: PDF 일부 페이지가 m2slide cover/agenda로 흡수됐을 가능성 → 첫 PDF 페이지부터 순차 매칭, 잉여 페이지는 마지막 슬라이드에 다중 매핑
* m2slide 슬라이드 수 > PDF 페이지 수: m2slide가 PDF 1페이지를 여러 슬라이드로 분리한 경우 (`03-prompt-engineering` 사례) → 호출 agent가 명시 매핑 제공 또는 마지막 PDF 페이지에 중복 매핑

출력 형식:
```yaml
# _doc_work/capture/tuner/<TS>/pairing.yml
project: GenContentProd_v1.1
original: Projects/_ppt/GenContentsProd_v1.0/GenContetntsProd_v1.1.key.pdf
total_slides: 112
total_pdf_pages: 104
slides:
  - chap: 1
    slide: 1
    pdf: p001        # null 가능 (매칭 없음)
    slide_capture: slide-c1-s1.png
    pdf_capture: pdf-001.png
  - chap: 1
    slide: 2
    pdf: p002
    ...
```

호출 agent가 명시 매핑 dict를 인자로 줄 수 있는 경로 옵션은 v2 (현재 자동 순차).

## Step 7 — side-by-side review HTML 생성 (선택)

`--form` 또는 기본 — `_doc_work/z_htm/tuner-form-<TS>.html` 작성 (파일명 `tuner-form` 은 코드 식별자로 유지, UI 공식 명칭은 "side-by-side review"). 단계 구조:

1. 모드·HWM 결정 (init/batch/end/all) → 슬라이드 범위 산출
2. side-by-side review 카드 배열 작성 — 각 카드는 m2slide 캡처(좌) + PDF 캡처(우) + "정상" 체크박스 + 자유 텍스트 영역
3. ___pm htm-server `/answer` endpoint POST 코드 주입 (기존 `fpm-ask-form-template.js` 패턴 — hub 생태계 optional)
4. `open -a Firefox` 호출

`--no-form` 시 본 단계 skip. pairing.yml만 산출 → 호출 agent가 자체 렌더 또는 결과 텍스트 사용.

# 출력

```
{out}/
├── pdf-pages/                       # PDF 페이지 PNG (1-base)
│   ├── pdf-001.png
│   ├── pdf-002.png
│   └── ...
├── slide-c<chap>-s<slide>.png       # m2slide 슬라이드 PNG
├── pairing.yml                      # 페이지 매칭 SSOT
└── (선택) ../z_htm/tuner-form-<TS>.html  # side-by-side review (UI 명칭)
```

# 호출 agent 통합 가이드

## slide-tuner (전체 워크플로우)

slide-tuner의 Step 4·5를 본 스킬로 위임:

```bash
# slide-tuner agent 본문 내부
{
  invoke slide-compare \
    --project <P> \
    --original <pdf> \
    --mode batch \
    --hwm-file _doc_work/tuner/<P>/hwm.yml \
    --batch 20 \
    --form
}
# 본 스킬 종료 후 form_path + inbox 시그니처 회수 → 본 폴 polling 진행
```

slide-tuner Step 6(피드백 회수)·Step 7(재빌드·재캡처)은 그대로 slide-tuner 책임. 재캡처 시 다시 본 스킬 호출.

## ppt2m2slide (변환 후 round-trip 검증)

변환 완료 후 빌드 + round-trip 검증:

```bash
# ppt2m2slide agent 변환 완료 후
{
  invoke slide-compare \
    --project <Name> \
    --original <pptx> \
    --mode all \
    --no-form
}
# pairing.yml 분석 → 보고서에 페이지 매칭 통계 추가
```

`--no-form` 으로 사용자 폼 없이 자동 매핑만 수행. 결과 통계(매칭 성공·실패·누락 페이지)를 `_proposals/<Name>-YYYY-MM-DD.md` round-trip 검증 섹션에 기록.

`--form` 사용 시 사용자가 즉시 비교 후 추가 피드백 가능 (체크포인트 3 대체).

# 제약

* 본 스킬은 **비교 장치 전용**. md 수정·재빌드·피드백 분류 책임 없음
* PDF 페이지 통째 PNG 변환 = 본 스킬 출력의 정상 동작. 단 호출 agent가 이 PNG를 m2slide markdown 본문에 풀스크린 삽입하면 md_first 정책 위반 — 본 스킬은 비교 자료로만 PNG 제공
* dev-server 시동은 idempotent. 종료는 호출 agent 또는 사용자 책임
* `--mode batch` 사용 시 HWM 갱신 책임은 호출 agent에 위임 (본 스킬은 HWM 읽기만)

# 참조

* slide-tuner agent: [`../../agents/slide-tuner.md`](../../agents/slide-tuner.md) Step 4~5를 본 스킬로 위임
* ppt2m2slide agent: [`../../agents/ppt2m2slide.md`](../../agents/ppt2m2slide.md) round-trip 검증 옵션
* htm form template: `~/.claude/hooks/fpm-ask-form-template.js` (form 작성 시 참조 — hub 생태계 제공. m2slide standalone 무관 optional. Issue270)
* apply-verify-rules: [`../../rules/apply-verify-rules.md`](../../rules/apply-verify-rules.md) §4.5 헤드리스 검증
