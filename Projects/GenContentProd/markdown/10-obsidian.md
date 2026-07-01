# 10. Obsidian 지식 베이스

#layout-contents-full
## 왜 Obsidian인가?

![왜 Obsidian인가?](img/GenContetntsProd_v10_27.png)

---

## Obsidian 핵심 특징

* **로컬 우선**: 모든 노트가 디스크에 .md 파일로 — 외부 서비스 종속 0
* **AI 친화 포맷**: Markdown 그대로 ChatGPT·Claude·NotebookLM·Pandoc에 즉시 입력
* **영구 소유**: Vault 폴더 백업 = 데이터 백업, 마이그레이션 자유
* **양방향 링크**: 노트 간 연결을 자동 추적 → 시간이 지날수록 지식이 누적 결합
* **무료(개인 사용)** — Sync·Publish만 유료, 본 강의 범위에서는 모두 무료 기능

---

#layout-contents-full
## 볼트(Vault) — 폴더가 곧 지식 단위

![볼트(Vault) — 폴더가 곧 지식 단위](img/GenContetntsProd_v10_28.png)

![볼트(Vault) — 폴더가 곧 지식 단위](img/GenContetntsProd_v10_29.png)

---

## Vault 구조·관리

* Vault = 하나의 폴더, 그 안의 모든 .md 파일이 노트
* 1 Vault = 1 도메인 권장 (강의 / 업무 / 연구 등 도메인별 분리)
* 첫 실행 시 빈 폴더 지정 → Obsidian이 `.obsidian/` 설정 디렉토리 자동 생성
* 폴더 구조는 자유 — `0.Inbox / 1.Projects / 2.Areas / 3.Resources / 4.Archive` (PARA 권장)
* Vault 이동·복제: 폴더 통째로 복사만 하면 완료 — 클라우드 동기화는 Dropbox·iCloud로 위임 가능

---

## 🙋 직접 따라 하세요 — 볼트 생성·노트 작성

* 1단계: Obsidian 실행 → “Create new vault” → 빈 폴더 지정 (ex: `~/Documents/lec-vault`)
* 2단계: 좌측 새 노트 아이콘 → 제목 `welcome` 입력 → 본문에 `# 오늘 배운 것` + 줄 3개 입력
* 3단계: 두 번째 노트 `prompt-engineering` 생성 → 본문에 Part1 6대 패턴 중 1개를 메모
* 4단계: `Cmd/Ctrl+E`로 미리보기 토글하여 렌더링 확인
* ✅ 통과 조건: Vault 폴더 안에 .md 파일 2개 + `.obsidian/` 폴더 생성 확인

---

## 🙋 직접 따라 하세요 — [[링크]]·#태그 실습

* 1단계: `welcome` 노트에서 `[[prompt-engineering]]` 입력 → 자동완성으로 링크 생성
* 2단계: 본문 끝에 `#lec` `#day1` 태그 2개 추가
* 3단계: `prompt-engineering` 노트 열기 → 우측 백링크 패널에서 `welcome` 자동 등록 확인
* 4단계: 좌측 사이드바에서 태그 패널 열기 → `#lec` 클릭 → 해당 태그 포함 노트 목록 확인
* ✅ 통과 조건: 백링크 패널에 1건 + 태그 패널에 `#lec` 표시 + 그래프 뷰에 노드 2개·엣지 1개
* 강사 메모: 백링크가 안 보이면 우측 사이드바 토글 확인

---

## Obsidian 필수 플러그인

| 플러그인 | 역할 | 추천 이유 |
| :-: | :-: | :-: |
| Smart Connections | 노트 의미 유사도 자동 연결·볼트 Q&A | 본 강의 시연 우선, 로컬 임베딩 지원 |
| Dataview | Frontmatter·태그를 쿼리 언어로 집계 | 학습 로그·과제 추적 등 동적 목록 |
| Templater | Frontmatter·본문 템플릿 자동 채우기 | 노트 작성 마찰 감소 |
| Excalidraw | .excalidraw 파일을 노트 안에 임베드 | Part1 Excalidraw 결과를 볼트에 보존 |

---

## Obsidian 플러그인 설치

* 설치 경로: 설정 → Community plugins → Browse → 이름 검색 → Install → Enable
* 첫 실행 시 안전 모드(Safe mode) 해제 필요 — 1회만 클릭

![Obsidian 플러그인 설치](img/GenContetntsProd_v10_30.png)

---

## 🙋 직접 따라 하세요 — Smart Connections로 AI 자동 연결

* 1단계: Smart Connections 설치·활성화 → 좌측 사이드바 새 아이콘 등장 확인
* 2단계: `welcome` 노트 열고 Smart Connections 패널 클릭 → 유사 노트 자동 추천 목록 확인
* 3단계: Smart Chat 패널에서 “이 볼트의 핵심 주제 3가지” 입력 → 출처 인용과 함께 답변 받기
* 4단계: 답변의 출처 링크 클릭 → 해당 노트 원문으로 점프 확인
* ✅ 통과 조건: Smart Chat 응답에 출처 인용 2건 이상 + 클릭 시 노트 점프 동작

---

## Obsidian 정리 — Q&A·트러블슈팅



* 핵심 정리: 폴더(Vault) → 파일(Note) → 연결(Link·Tag) → 시각화(그래프) → 증강(플러그인)
* 자주 묻는 질문
  * Q. iCloud·OneDrive 동기화 가능? — A. 가능하나 .obsidian/ 충돌 주의, Obsidian Sync 유료가 가장 안정
  * Q. 노트가 1000개 넘으면? — A. 폴더보다 태그·Dataview로 횡단 탐색 권장
  * Q. 모바일도 되나? — A. iOS·Android 앱 무료, Vault 동기화 별도 구성 필요
* 트러블슈팅: 첫 실행 시 macOS Gatekeeper·Windows SmartScreen 차단 → 우클릭 “열기”로 우회


