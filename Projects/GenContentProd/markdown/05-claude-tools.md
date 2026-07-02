# 03. Claude Artifacts·Design

#layout-contents-full
## Claude Artifacts vs Claude Design — 진입점 비교

![Claude Artifacts vs Claude Design — 진입점 비교](img/GenContetntsProd_v10_9.png)

---

## Claude Artifacts vs Design — 특징 비교

::: cards
* **Claude Artifacts**
  - 채팅 안에서 HTML·SVG·React를 즉석 렌더링
  - 진입: claude.ai 채팅창에서 “이걸 Artifact로” 요청
  - 적합: 1회용 데모·간단 위젯·즉석 시연
* **Claude Design**
  - 전용 디자인 워크스페이스 (claude.ai/design)
  - 진입: claude.ai/design 페이지
  - 적합: 1페이지 랜딩·인포그래픽·반복 수정 작업
:::

* 핵심 차이: Artifacts는 “대화 중 즉석”, Design은 “디자인 전용 캔버스”
* 두 도구 모두 SVG·HTML 출력 가능 — 결과물 자체는 호환됨

---

## Claude Artifacts 활용처

* HTML 페이지 즉석 렌더 — 미니 데모·튜토리얼
* SVG 다이어그램 — 발표 자료 삽입용
* React 컴포넌트 — 인터랙티브 데모 (버튼·폼·차트)
* 코드 시각화 — 알고리즘 단계별 애니메이션
* 한계: 복잡한 상태 관리·외부 API 호출 어려움 → 1회용 데모에 한정
* 본 강의 활용: 데모 시연 + 강의 인포그래픽 즉석 보완
* 강사 메모: 라이브로 1줄 입력 → SVG 차트 즉시 렌더링 시연. 청중의 “와” 반응 유도 포인트

---

## Claude Design 활용처

* 1페이지 랜딩 페이지 — 제품·이벤트 소개용
* 인포그래픽 SVG — 본 강의의 7장 인포그래픽이 모두 Claude Design 산출물
* 명함·포스터·소셜 카드 — 정형 디자인 템플릿
* 반복 수정 친화 — 색감·폰트만 바꾸는 수정에 강함
* Artifacts 대비 강점: 캔버스·버전·자산 관리 + 디자인 전용 UI
* 단점: 채팅 흐름에서 벗어남 — 워크스페이스 별도 이동 필요

---

## 🙋 Claude Design으로 SVG 인포그래픽 1장



* 작업: “본인 직무 1주일 일과 시간 배분” 인포그래픽 1장
* 절차:
  * Step 1: claude.ai/design 접속
  * Step 2: 프롬프트 입력 — “주간 일과 시간 배분, 도넛 차트, 5개 항목”
  * Step 3: 데이터 입력 (회의/개인작업/이메일/학습/기타 등 5쌍)
  * Step 4: 톤·색감 수정 → 1차 결과 확정
  * Step 5: SVG 다운로드 + PNG 변환 옵션 확인
* 시간: 7분
* 평가: 도넛 5조각이 명확히 구분되고 비율이 의미를 전달하는지


---

## Q&A + Claude 도구 정리



* Artifacts vs Design 선택 가이드:
  * 채팅 중 즉석 시연 → Artifacts
  * 정밀 디자인·반복 수정 → Design
* 본 강의 권장: Design을 주력, Artifacts는 채팅 도중 보조
* 두 도구 모두 SVG 출력 → Markdown 문서에 그대로 삽입 가능
* 다음 단원: 결과물을 다룰 도구 (VSCode) 학습으로 이동


