---
title: 이미지·애니메이션·이모지
type: ppt
release_date: 2026-06-30
---

# 6. 이미지·애니메이션·이모지
#layout-chapter

---

## 6.1 이미지 삽입
#layout-contents

`![alt](./img/파일명)` — 상대 경로. `Projects/{Name}/img/` 배치 → `slide/img/` 자동 복사.
alt 텍스트 필수 (접근성 + 이미지 누락 시 표시).

**샘플 이미지 (placeholder)**

아래 이미지는 단계 5(media-creater)에서 생성된 `placeholder.png` 참조.
실제 이미지 파일이 없으면 alt 텍스트로 표시됨.

![샘플 이미지](./img/sample-image.png)

**이미지 자동 복사 경로**

| 소스 경로 | 빌드 후 경로 |
| :--- | :--- |
| `Projects/{Name}/img/*.png` | `slide/img/*.png` |
| `Projects/{Name}/markdown/img/*.png` | `slide/img/*.png` (병합) |

---

## 6.1b 이미지 + 텍스트 2분할
#layout-contents

이미지 + 텍스트 공존 슬라이드는 자동 2분할 (휴리스틱 auto-split).
`<!-- nosplit -->` 주석으로 비활성화.

::: columns
::: {.column width="50%"}
**자동 복사 지원 포맷**

* PNG — 권장 (ffmpeg 호환, 투명도 지원)
* JPG / JPEG — 사진
* SVG — 벡터 (일부 미지원 환경 주의)
* GIF — 정적 전용 (애니 GIF는 reveal.js 미지원)
* WebP — 최신 브라우저 지원
:::
::: {.column width="50%"}
![이미지 데모](./img/sample-image.png)
:::
:::

---

## 6.2 슬라이드 전환 효과 (#transition-*)
#layout-contents

슬라이드 첫 비공백 라인 또는 제목 다음 줄에 디렉티브를 작성하면 파서가 reveal.js `data-transition` 속성으로 변환한다. 디렉티브 줄은 출력에서 자동 제거되며, 슬라이드별 설정이 글로벌 설정보다 우선한다.

::: columns
::: {.column width="50%"}
**전환 종류**

* `none` — 즉시 전환
* `fade` — 페이드 인/아웃
* `slide` — 좌우 슬라이드 (기본값)
* `convex` — 볼록 뒤집기
* `concave` — 오목 뒤집기
* `zoom` — 줌 인
:::
::: {.column width="50%"}
**전환 속도**

* `default` — 기본 속도
* `fast` — 빠르게
* `slow` — 느리게

**결합 표기** (`효과-속도`)

* `#transition-zoom-fast`
* `#transition-fade-slow`
:::
:::

---

## 6.2 전환 효과 데모 (zoom)
#layout-contents
#transition-zoom

이 슬라이드는 `#transition-zoom` 디렉티브 적용.
이전 슬라이드에서 이 슬라이드로 전환 시 zoom 효과가 적용됨.

**사용 가능 전환 효과**

| 디렉티브 | 효과 |
| :--- | :--- |
| `#transition-fade` | 페이드 인/아웃 |
| `#transition-slide` | 좌우 슬라이드 (기본) |
| `#transition-convex` | 볼록 뒤집기 |
| `#transition-concave` | 오목 뒤집기 |
| `#transition-zoom` | 줌 인 |
| `#transition-none` | 즉시 전환 |

---

## 6.2b 배경색 + 전환 속도
#layout-contents

## 배경색 데모
#transition-fade-slow
#background-color-1a2a4a

이 슬라이드는 다음 디렉티브가 적용됨:

* `#transition-fade-slow` — 느린 페이드 전환
* `#background-color-1a2a4a` — 진한 남색 배경 (hex 값, `#` 자동 prepend)

배경 이미지도 디렉티브로 지정 가능:
`#background-image-./img/placeholder.png` + `#background-size-cover`

---

## 6.3 단계별 등장 ({.fragment})
#layout-contents

reveal.js fragment. 항목 끝에 `{.fragment}` 또는 `{.fragment .fade-up}` 작성.
클릭(→ 키)마다 한 항목씩 등장.

**fragment 클래스 예시 (클릭하며 확인)**

* 첫 번째 항목 — 즉시 표시
* 두 번째 항목 {.fragment}
* 세 번째 항목 — fade-up {.fragment .fade-up}
* 네 번째 항목 — highlight-blue {.fragment .highlight-blue}
* 다섯 번째 항목 — highlight-red {.fragment .highlight-red}

---

## 6.3b fragment — <!-- .element: --> 문법
#layout-contents

reveal.js 표준 `<!-- .element: class="..." -->` 주석 문법 (Issue149 지원).
Pandoc `{.fragment}` 와 동등, 병용 가능.

* 첫 번째 — 즉시 표시
* 두 번째 <!-- .element: class="fragment fade-up" -->
* 세 번째 <!-- .element: class="fragment fade-in-then-out" -->
* 네 번째 <!-- .element: class="fragment grow" -->
* 다섯 번째 <!-- .element: class="fragment shrink" -->

**단락 fragment**

이 단락은 즉시 표시됩니다.

이 단락은 클릭 후 fade-up으로 등장합니다. {.fragment .fade-up}

---

## 6.4 자동 애니메이션 (#auto-animate)
#layout-contents

인접 슬라이드에 `#auto-animate` 작성 시 reveal.js가 공통 요소를 자동 모핑.
같은 텍스트 / 동일 `data-id` 요소 간 트랜지션 자동 계산.

---

## 6.4 auto-animate — before
#layout-contents
#auto-animate

::: cards
* **단계 1**
  - 아이디어 수집
:::

---

## 6.4b auto-animate — after
#layout-contents
#auto-animate

::: cards
* **단계 1**
  - 아이디어 수집
* **단계 2**
  - 프로토타입
* **단계 3**
  - 검증
:::

---

## 6.5 자동 재생 (#autoslide-*)
#layout-contents

`#autoslide-<ms>` — 지정 밀리초 후 자동 다음 슬라이드 진행.
발표 자동 진행·키오스크 모드·루프 데모에 활용.

---

## 6.5 autoslide 데모
#layout-contents
#autoslide-4000
#transition-fade

이 슬라이드는 **4초** 후 자동으로 다음 슬라이드로 이동합니다.

`#autoslide-4000` = 4,000ms = 4초

**활용 시나리오**

* 자동 진행 프레젠테이션 (키오스크)
* 광고·소개 루프 슬라이드
* 타임박스 제한 발표

---

## 6.6 이모지
#layout-contents

유니코드 이모지 직접 삽입. 추가 CDN·라이브러리 없음.
폰트 렌더링은 OS/브라우저 기본 이모지 폰트 사용.

**감정·반응**

😀 😂 🥹 😎 🤔 😤 🥳 🤖 👻 🎃

**업무·생산성**

📋 계획 · 🔍 분석 · 💡 아이디어 · ⚙️ 설정 · 🚀 배포 · ✅ 완료 · ❌ 실패 · ⚠️ 경고

**기술·개발**

💻 코드 · 🗄️ DB · 🌐 네트워크 · 🔐 보안 · 📊 차트 · 📦 패키지 · 🐛 버그 · 🔧 수정

**자연·시각**

🌊 파도 · 🌸 꽃 · ⭐ 별 · 🔥 불꽃 · ❄️ 눈송이 · 🌈 무지개

---

## 6.6b 이모지 + 텍스트 혼합 슬라이드
#layout-contents

::: cards
* **🎯 목표 설정**
  - 명확한 KPI 정의
  - 측정 가능한 지표
  - 현실적 타임라인
* **🔍 현황 분석**
  - 데이터 수집
  - 갭 분석
  - 우선순위 결정
* **🚀 실행·배포**
  - 단계별 롤아웃
  - 모니터링 강화
  - 롤백 플랜 준비
* **📊 성과 측정**
  - 지표 추적
  - A/B 테스트
  - 피드백 루프
:::
