# Changelog

All notable changes to this project. m2slide follows [SemVer](https://semver.org/).

## [v0.8.0] - 2026-07-13

### What's new

#### 📄 라이선스 정책 — MIT → 이중 라이선스 (CC BY 4.0 + 상업)

`LICENSE.md` 신설. 생성 프레젠테이션 첫 장·마지막 장에 "Powered by finfra.kr, Made by m2slide" 표기 유지 시 무료(CC BY 4.0), 표기 제거는 유료 상업 라이선스. 문의: finfra@gmail.com / https://finfra.kr

#### 🖥 dev-server 대폭 확장

- URL semantic 분리 — `/s/`(solo design view)·`/n/`(deck navigation) path-based (Issue248), `/pd/` 덱 목록 + proxy 전 기능 (Issue281·290)
- 프로젝트 카드 `_config.yml` 설정 GUI (Issue275·276), overview 장표 hover 확대·Tab 고정 (Issue291)
- 슬라이드 피드백 UI + `/feedback-process` 일괄 처리 (Issue261·264)

#### 🎨 테마·비주얼

- `default_dark` 테마 (`stellar_dark` rename, Issue277) + layout 배경 테마 변수화 (Issue271·272·274)
- 컬러 팔레트 시스템 — `palette:` 키 + `{.palette-X}`/`{.accent-N}` override (Issue210)
- htmlArt timeline overflow 보정 (Issue283), columns width 합 자동 축소 (Issue285), 슬라이드 세로 밸런싱 (Issue284)

#### 🤖 authoring-pipeline·학습 루프

- note-writer agent — 발표자 노트 분리 관리 + 빌드 병합 (Issue256·257)
- slide-tuner — 원본 PDF/PPTX ↔ 웹 캡처 side-by-side 피드백 (Issue244·245), ppt2m2slide 학습 라운드 (Issue233·234·246)
- media-creater 이미지 백엔드 3종(svg_direct·free_image·local_image_gen) + 큐 경유 전환 (Issue287·289)

#### 📦 배포·기타

- SCAR·런타임 자산 self-contained 배치 (vendor, Issue270)
- 영문판 프로젝트 3종 — m2Slide_en·m2slide_info_en·fPmIntro_en (Issue267~269)
- m2unity 출력 백엔드 IR 계약 (Issue286)

### All resolved issues (159)

- Issue291. dev-server overview 장표 hover 확대 + Tab 고정 + 힌트 (등록: 2026-07-13, 해결: 2026-07-13, commit: 456d6cb) ✅
- Issue290. dev-server `/pd/` 덱에 `/p/` proxy 전 기능 부여 — 단일 root resolver 통합 (등록: 2026-07-13, 해결: 2026-07-13, commit: 5bd3efb) ✅
- Issue289. local_image_gen 큐 경유 전환 — 직접 실행 폐지, mflux-enqueue+폴링 (등록: 2026-07-13, 해결: 2026-07-13, commit: 427fb61, 5344e09) ✅
- Issue288. RamyeonCooking 덱에 mflux T5 라면 이미지 추가 (등록: 2026-07-13, 해결: 2026-07-13, commit: 8d874c0 [deck repo]) ✅
- Issue287. media-creater 이미지 생성 백엔드 확장 — svg_direct·free_image·local_image_gen (등록: 2026-07-12, 해결: 2026-07-13, commit: 87b7cf7, d9ae44b, d0bfa24) ✅
- Issue286. m2unity 출력 백엔드 계약 3종 정의 — IR 스키마·`--unity` dispatch·골든 덱 (등록: 2026-07-12, 해결: 2026-07-13, commit: 3deaf8b) ✅
- Issue285. columns 명시 width 합 100% + .m2-cols gap:4% → 우측 넘침·짤림 (등록: 2026-07-12, 해결: 2026-07-12, commit: 57ff687) ✅
- Issue284. 슬라이드 세로 밸런싱 — 텍스트 slide 상단 몰림 + 컴포넌트↔텍스트 간격 부족 (등록: 2026-07-12, 해결: 2026-07-12, commit: c8f912c, 8bf294f, 83a8d3b) ✅
- Issue283. htmlArt timeline 노드 라벨이 길거나 4개 이상이면 박스 overflow·겹침·클리핑 (등록: 2026-07-12, 해결: 2026-07-12, commit: 83a8d3b) ✅
- Issue282. markmap 목차·agenda가 heading의 Font Awesome 마커(:fa-*:)를 변환 안 함 — 원문 노출 (등록: 2026-07-12, 해결: 2026-07-12, commit: 83a8d3b) ✅
- Issue281. dev-server /pd/ — Projects_deck 덱 목록 페이지 (등록: 2026-07-12, 해결: 2026-07-12, commit: e31da3c) ✅
- Issue280. agenda 카드 모드 상단 장식(고양이 마스코트·제목 위 라인) 부재 + 상단 테두리 paint 소실 + 로딩 blank (등록: 2026-07-12, 해결: 2026-07-12, commit: 526cfce) ✅
- Issue279. default_dark standalone agenda 카드 평상시 라이트·hover 시 다크+어두운 텍스트로 가독성 붕괴 (등록: 2026-07-11, 해결: 2026-07-11, commit: b90f029) ✅
- Issue278. agenda 카드 모드 노란 테두리 소실 + default_dark 비카드 agenda 헤더 불투명 (등록: 2026-07-11, 해결: 2026-07-11, commit: 3192afd) ✅
- Issue277. 테마 stellar_dark → default_dark rename + StellarEvolution 참조 수정 (등록: 2026-07-11, 해결: 2026-07-11, commit: c7852be) ✅
- Issue272. htmlArt 컴포넌트 다크(black) 테마 대비 미흡 — 시각검증상 Issue274로 실질 해결 (등록: 2026-07-10, 해결: 2026-07-11, commit: 35c5870) ✅
- Issue271. layout 배경 하드코딩(#ffffff !important)이 다크 테마를 덮음 — 배경 테마 변수화 (등록: 2026-07-10, 해결: 2026-07-11, commit: cee8334) ✅
- Issue276. 설정 GUI 테마 콤보박스에 사용 가능한 테마 목록 미표시 (등록: 2026-07-11, 해결: 2026-07-11, commit: a2cb13b) ✅
- Issue275. dev-server 프로젝트 목록(/p/) 카드별 _config.yml 설정 GUI + Open settings file (등록: 2026-07-10, 해결: 2026-07-11, commit: 1f18955) ✅
- Issue274. htmlArt 선/지시 도형 색 config(_config.yml) + 테마 변수화 (nav_color 패턴) (등록: 2026-07-10, 해결: 2026-07-10, commit: 3b7dd06) ✅
- Issue273. StellarEvolution 고퀄화 + stellar_dark 다크 테마 + agenda_card_mode (등록: 2026-07-10, 해결: 2026-07-10, commit: fe8acdc) ✅
- Issue270. SCAR·런타임 자산 self-contained 배치 + 중첩 하위 프로젝트 상위 호출 해결 (등록: 2026-07-09, 해결: 2026-07-10, commit: 9ba6278) ✅
- Issue269. fPmIntro 영문판 프로젝트 생성 (fPmIntro_en) (등록: 2026-07-06, 해결: 2026-07-06, commit: a819b3a) ✅
- Issue268. m2slide_info 영문판 프로젝트 생성 (m2slide_info_en) (등록: 2026-07-06, 해결: 2026-07-06, commit: 211cc96) ✅
- Issue267. m2Slide 영문판 프로젝트 생성 (m2Slide_en) (등록: 2026-07-06, 해결: 2026-07-06, commit: 211cc96) ✅
- Issue266. default_lec 텍스트 전용 슬라이드 세로 중앙 정렬 제거 — top 정렬로 통일 (등록: 2026-07-06, 해결: 2026-07-06, commit: bcd9cad) ✅
- Issue264. dev-server 피드백 수동 처리 커맨드 + 개요 페이지 복붙 커맨드 박스 (등록: 2026-07-06, 해결: 2026-07-06, commit: b278aea) ✅
- Issue263. Safari 진입 시 렌더링 오류 가능 경고 배너 (등록: 2026-07-06, 해결: 2026-07-06, commit: 5a37266) ✅
- Issue262. H1 없는 챕터 파일 TOC markmap 링크 off-by-one — `#/1`이 TOC 자신을 가리킴 (등록: 2026-07-06, 해결: 2026-07-06, commit: ef69ab2) ✅
- Issue261. dev-server 개요 페이지 슬라이드 목록 피드백 UI — bytes 이동 + 의견 입력 + policy 체크 전송 (등록: 2026-07-05, 해결: 2026-07-05, commit: 320d2cd) ✅
- Issue259. TOC 슬라이드(h>0)에서 ← 키가 이전 챕터로 점프 — deck 내 이전 슬라이드로 가야 함 (등록: 2026-07-05, 해결: 2026-07-05, commit: e72a11c, 4e07c6b, 0ec84cd) ✅
- Issue260. GmarketSans webfont CDN 404 — 제목 폰트 깨짐 (등록: 2026-07-05, 해결: 2026-07-05, commit: 87feeb1, 4e07c6b, 0ec84cd) ✅
- Issue258. authoring-pipeline.md 단계 10 데이터 접근 표 불일치 (등록: 2026-07-03, 해결: 2026-07-03, commit: 9b57808) ✅
- Issue251. config 가 AGENDA frontmatter theme 미반영 — chapter mode 조용한 테마 불일치 (등록: 2026-06-30, 해결: 2026-07-03, commit: 6925ccd) ✅
- Issue250. layout 제목 폰트 누락 — base.css title SSOT 통합 (등록: 2026-06-30, 해결: 2026-07-03, commit: 01ad51a) ✅
- Issue257. note-writer agent 실장 + authoring-pipeline 단계 재번호(9=note-writer, 10=md2tts-txt, 11=외부) (등록: 2026-07-03, 해결: 2026-07-03, commit: e09bb16) ✅
- Issue256. 발표자 노트 `{md파일명}_note.md` 분리 관리 — slide-id 매칭 + 빌드 병합 (등록: 2026-07-03, 해결: 2026-07-03, commit: e09bb16) ✅
- Issue255. 모든 PPT 메타에 github_url·homepage 글로벌 기본값 주입 (등록: 2026-07-02, 해결: 2026-07-03, commit: 01ad51a) ✅
- Issue254. Projects.md gitignored + publishing 열 SSOT 로 Projects/.gitignore 자동 생성 (등록: 2026-07-02, 해결: 2026-07-02) ✅
- Issue253. VERSION 파일 컴파일 시점 임베드 + Projects.md 표 자동 동기화 SCAR (등록: 2026-07-02, 해결: 2026-07-02, commit: efea317) ✅
- Issue252. dev-server cross-page `?last=1` 진입 실패 — chapter-nav 변수에 `#/1` 오주입으로 이전 챕터 마지막 슬라이드 대신 toc-placeholder 착지 (등록: 2026-07-02, 해결: 2026-07-02, commit: 72ec356) ✅
- Issue249. layout-contents-full 이미지/SVG 세로 overflow — contents 영역 초과 (등록: 2026-05-28, 해결: 2026-05-28, commit: TBD)
- Issue248. dev-server URL semantic 분리 — `/s/` = solo design view (단일 슬라이드), `/n/` = deck navigation (path-based) (등록: 2026-05-28, 해결: 2026-05-28, commit: ebbca88, 91ea9db, b7d7a3d, 95d431c, 7ce2bf5) ✅
- Issue246. ppt2m2slide 사후 diff 학습 — 변환본 vs 사용자 수정본 차이 자동 추출 (등록: 2026-05-27, 해결: 2026-05-27, commit: 31aa92d) ✅
- Issue247. data-access-rules backup·lint 강화 — promotion 머지 시 자동 backup + 일관성 검증 (등록: 2026-05-27, 해결: 2026-05-27, commit: e53b0bf) ✅
- Issue245. 피드백 → `data/<stage>/` 학습 루프 v1 — slide-tuner · ppt2m2slide 사용자 피드백 자동 분류·격리·promotion (등록: 2026-05-27, 해결: 2026-05-27, commit: e53b0bf) ✅
- Issue244. slide-tuner — source(PDF/PPTX) ↔ 웹 캡처 side-by-side 일괄 피드백 자동화 (등록: 2026-05-26, 해결: 2026-05-27, commit: 3ae083a) ✅
- Issue243. _config.yml `agenda_enabled: false` 옵션 — agenda.html 생성·네비게이션 fallback 차단 (등록: 2026-05-27, 해결: 2026-05-27, commit: b256042) ✅
- Issue241. BasicKnowledgeForAI_small_model 슬라이드 7건 PDF 정합 + data 정책 보강 (등록: 2026-05-26, 해결: 2026-05-26, commit: TBD) ✅
- Issue238. palette --m2-accent-1이 --kn-accent를 오염시켜 theme 구조색 변경 (등록: 2026-05-26, 해결: 2026-05-26, commit: cefe39e) ✅
- Issue239. dev-server /p/P/s/ — chapter mode에서 agenda로 리다이렉트되어 #hash 소실 (등록: 2026-05-26, 해결: 2026-05-26, commit: 12baaa6, f1400ca, fbabfc2) ✅
- Issue237. explicit #layout-* H1 슬라이드 End/Home 키 sibling 점프 불가 — headingLevel 누락 (등록: 2026-05-26, 해결: 2026-05-26, commit: f330c5b) ✅
- Issue230. Single mode 중간 H1 슬라이드가 cover로 분류되어 →/↓/End 시 agenda.html 점프 — isCoverSlide() deck 위치 한정 누락 (등록: 2026-05-25, 컨텐츠 잘못 만들어진 것이 문제 였음. 기능에 문제 없음.)
- Issue236. dev-server /_dev/raw + /_dev/list endpoint — curl-friendly section view (등록: 2026-05-25, 해결: 2026-05-25, commit: 58de985) ✅
- Issue235. 슬라이드 dev-server + 파일 단위 배포 rule (등록: 2026-05-25, 해결: 2026-05-25, commit: 6a65b1d) ✅
- Issue234. ppt2m2slide 학습 round 3 — PPT 색 강조 → **bold** + 출처 텍스트박스 → ::: source 슬롯 (등록: 2026-05-25, 해결: 2026-05-25, commit: 0d1f8c0) ✅
- Issue233. ppt2m2slide data 폴더 학습 — BasicKnowledgeForAI_small.pptx 슬라이드별 분석 + office_rainbow palette + PPT 보존 정책 보강 (등록: 2026-05-25, 해결: 2026-05-25, commit: 41b5e5a) ✅
- Issue232. H1 슬라이드 contents-header 누락 + 백틱 인라인 코드 link 침범 + H1/H2 puffer 비대칭 (등록: 2026-05-25, 해결: 2026-05-25, commit: 8215612) ✅
- Issue231. graphify CLI 미활용 회귀 — slide 코드 추적 시 grep 우선 + 자동 트리거 부재 (등록: 2026-05-25, 해결: 2026-05-25, commit: b80e4c5) ✅
- Issue229. default 테마에 sub-chapter(`_chapter`) layout 추가 — chapter divider page (등록: 2026-05-24, 해결: 2026-05-24, commit: 6ed4ca8) ✅
- Issue223. `open-slide` 스킬 신규 — 임의 슬라이드 자동 진입 + Chrome 포커스 강제 (등록: 2026-05-24, 해결: 2026-05-24, commit: b72c7dc) ✅
- Issue214. ppt2m2slide 에이전트 설계 — 기존 PPT를 m2slide 프로젝트로 역변환 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
- Issue228. agenda.js·html-builder.js cross-page navigation `.ppt.md` 미정규화 — PREV_CHAPTER/NEXT_CHAPTER/subsections lookup 실패 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
- Issue227. ppt2m2slide·layout-selector 산출물 슬라이드 구분자 `---` 누락 — 챕터 내 모든 H1이 1슬라이드로 병합 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
- Issue225. .ppt.md 빌드 결과 파일명 미일치 — agenda.html cross-page 링크 404 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
- Issue217. ppt2m2slide chapter 검출 H1-only 한계 + agenda 확정 전 사용자 컨펌 의무화 (등록: 2026-05-24, 해결: 2026-05-24, commit: b897367) ✅
- Issue219. htmlArt `callout` 타입 추가 — 중앙 hub + 다방향 callout arrow (등록: 2026-05-24, 해결: 2026-05-24, commit: 596d564) ✅
- Issue218. htmlArt `bend_process` 타입 추가 — N단계 줄바꿈 serpentine 흐름 (등록: 2026-05-24, 해결: 2026-05-24, commit: 596d564) ✅
- Issue220. ESC overview thumbnail 1장만 표시 회귀 — `.reveal.overview .slides { overflow:hidden }` clip (등록: 2026-05-24, 해결: 2026-05-24, commit: dd6b009) ✅
- Issue226. ESC 키 reveal.js overview 진입 실패 — keyboard config에 27:'toggleOverview' 명시 (등록: 2026-05-24, 해결: 2026-05-24, commit: 8ae3e9c) ✅
- Issue221. htmlArt nodeBox 영문 long token clip — width cap + overflow-wrap fallback (등록: 2026-05-24, 해결: 2026-05-24, commit: 1430cc0) ✅
- Issue222. htmlArt cycle 중앙 ↻ 심볼 더블 이스케이프 회귀 — `↻` 6글자 텍스트로 출력 (등록: 2026-05-24, 해결: 2026-05-24, commit: 1430cc0) ✅
- Issue224. `::: cards` 다수 카드 슬라이드 overflow clip — px 고정값 em 전환 (등록: 2026-05-24, 해결: 2026-05-24, commit: ea777cb, b14f748, 05d25ff, 502015f) ✅
- Issue215. ESC overview 모드 슬라이드 1개만 표시 회귀 — width/height 문자열 전달로 spacing 100배 비정상 (등록: 2026-05-24, 해결: 2026-05-24, commit: df96409, e63c1b3) ✅
- Issue216. p5.js 슬라이드 진입 시 캔버스 크기 깨짐 — `renderAll`이 비활성 슬라이드까지 사전 렌더 (등록: 2026-05-24, 해결: 2026-05-24, commit: 3db86ef) ✅
- Issue209. htmlArt `workflow` 타입 추가 — 사람 endcap + 단계 박스 체인 (등록: 2026-05-24, 해결: 2026-05-24, commit: 71c382b) ✅
- Issue208. htmlArt `compare` 타입 추가 — 2분할 좌우 비교 (등록: 2026-05-24, 해결: 2026-05-24, commit: 83dfe2a, 71c382b) ✅
- Issue213. _contents body video·img 풀폭 표시 — media-container fit 규칙 확장 (등록: 2026-05-24, 해결: 2026-05-24, commit: 7724ccc) ✅
- Issue212. model3d GLB `file://` 로딩 실패 — 빌드 타임 base64 data URI 자동 인라인 (등록: 2026-05-24, 해결: 2026-05-24, commit: 965bdc1) ✅
- Issue211. htmlArt `explain` 타입 추가 — 중앙 명제 + 사방 풀이 phrase (등록: 2026-05-24, 해결: 2026-05-24, commit: 83dfe2a) ✅
- Issue210. 컬러 팔레트 시스템 — theme variant + htmlArt 객체 단위 컬러 override (등록: 2026-05-24, 해결: 2026-05-24, commit: 83dfe2a) ✅
- Issue207. Simulation View(p5.js) 컴포넌트 추가 (등록: 2026-05-24, 해결: 2026-05-24, commit: 4e75e96, cf8b76e, e42ae02, 4752f0a, 00b5435, fc0262a, 9e5c957) ✅
- Issue206. m2slide 3D 모델 뷰어 컴포넌트 추가 — model-viewer 3.5.0 (등록: 2026-05-22, 해결: 2026-05-22, commit: 43c3fbe) ✅
- Issue204. htmlArt list 타입군 5종 신설 — numbered·hexagon·bracket·block·tab (등록: 2026-05-22, 해결: 2026-05-22, commit: 03de042) ✅
- Issue205. htmlArt arrow 화살표 깨짐 + pyramid 상세 패널 분리·글자크기 (등록: 2026-05-22, 해결: 2026-05-22, commit: 702af67) ✅
- Issue202. 슬라이드 전역 한글 어절 중간 줄바꿈 금지 (word-break: keep-all) (등록: 2026-05-22, 해결: 2026-05-22, commit: 9f31dba) ✅
- Issue203. cards title-only 항목 가로 행(rows) 자동 레이아웃 (등록: 2026-05-22, 해결: 2026-05-22, commit: d6f963f) ✅
- Issue201. htmlArt pyramid 우측 패널 제목 중복 (등록: 2026-05-22, 해결: 2026-05-22, commit: 7431c97) ✅
- Issue200. htmlArt 노드 글자 크기 — 박스 비례 폰트로 확대 (등록: 2026-05-21, 해결: 2026-05-21, commit: e5824b5) ✅
- Issue199. htmlArt columns 슬롯 안 도해 높이 0 붕괴 (등록: 2026-05-21, 해결: 2026-05-21, commit: 123e12c) ✅
- Issue198. htmlArt 도해 letterbox — viewBox aspect 슬라이드 영역 미정합 + 컨테이너 fill 통일 (등록: 2026-05-21, 해결: 2026-05-21, commit: 6bd083a) ✅
- Issue197. htmlArt 도해 크기 산정이 상단 텍스트 미반영 — 컨테이너 잔여공간 채움 (등록: 2026-05-21, 해결: 2026-05-21, commit: 412c194) ✅
- Issue196. 카드 컴포넌트 여백 과다 (등록: 2026-05-21, 해결: 2026-05-21, commit: 81b57b3) ✅
- Issue195. htmlArt hierarchy 연결선 카드 관통 + 도해 크기 (등록: 2026-05-21, 해결: 2026-05-21, commit: c0cc712) ✅
- Issue193. htmlArt 렌더 백엔드 CSS → d3 SVG 전환 (등록: 2026-05-21, 해결: 2026-05-21, commit: 20cc48e) ✅
- Issue194. htmlArt pyramid — 적층 밴드 → 단일 삼각형 + 상세 패널 (등록: 2026-05-21, 해결: 2026-05-21, commit: a7d026b) ✅
- Issue192. htmlArt hierarchy — 가로 트리 → 상하 조직도 전환 (등록: 2026-05-21, 해결: 2026-05-21, commit: 5301ca9) ✅
- Issue191. 공통 컴포넌트 CSS 중복 제거 — theme/_shared/components.css 추출 + @import (등록: 2026-05-21, 해결: 2026-05-21, commit: 96e5861) ✅
- Issue190. htmlArt 도해 시각 정밀 조정 — process 간격, cycle 중심·노드, hierarchy 연결선 (등록: 2026-05-21, 해결: 2026-05-21, commit: e438512) ✅
- Issue189. htmlArt 도해 시각 개선 — process 간격·화살표, cycle 비율, hierarchy 가로 트리 (등록: 2026-05-21, 해결: 2026-05-21, commit: aa7cbae) ✅
- Issue188. htmlArt core 구현 — `::: htmlart <type>` 파서 + theme CSS 4종 (등록: 2026-05-21, 해결: 2026-05-21, commit: 9b154b0) ✅
- Issue187. authoring-pipeline 전 agent의 사용자-변동 콘텐츠 data 외부화 커버리지 점검 (등록: 2026-05-21, 해결: 2026-05-21, commit: 865c4fc) ✅
- Issue186. 심벌·이모지 사용 정의 data 파일 신설 — data/symbol-usage.yml + data/emoji-usage.yml (등록: 2026-05-21, 해결: 2026-05-21, commit: 865c4fc) ✅
- Issue184. 시각화 4도구 통합 — React artifact·HTML artifact(WordArt)·excalidraw·d3 콘텐츠 기반 자동 선택 (등록: 2026-05-21, 해결: 2026-05-21, commit: 2df139e) ✅
- Issue185. authoring-pipeline 정책 글로벌↔프로젝트 cascade — L1 data/<단계>/*.yml + L2 Projects/<N>/_pipeline/policy/<단계>.yml (등록: 2026-05-21, 해결: 2026-05-21, commit: 050a60c, 586d339, 825bcbe, 3874521, cbe0cf9) ✅
- Issue183. media-container 슬롯 설계 결함 — diagram/component 슬롯 분리 (등록: 2026-05-20, 해결: 2026-05-20, commit: 6bbaa8e) ✅
- Issue182. 슬라이드 구성요소 라이브러리 Phase 2 — 지도·인포그래픽 (등록: 2026-05-20, 해결: 2026-05-20, commit: ef8baef) ✅
- Issue181. 슬라이드 구성요소 라이브러리 Phase 1 — 수식·아이콘·차트 (등록: 2026-05-20, 해결: 2026-05-20, commit: ef8baef) ✅
- Issue180. 슬라이드 구성요소 라이브러리 Phase 0 — 레지스트리·generic fenced 디스패처 인프라 (등록: 2026-05-20, 해결: 2026-05-20, commit: ef8baef) ✅
- Issue179. default_lec summary layout — 학습 정리·요약 전용 layout 분리 (등록: 2026-05-19, 해결: 2026-05-19, commit: 07b02b1) ✅
- Issue178. graphify mermaid syntax — `[/graphify . 빌드]` 평행사변형 토큰 충돌 fix (등록: 2026-05-19, 해결: 2026-05-19, commit: 9f70f93) ✅
- Issue177. default_lec 전체 재구성 — default 구조 통일 + md-builder 단계 4 호환 (등록: 2026-05-19, 해결: 2026-05-19, commit: e501eed) ✅
- Issue176. default_lec contents-split layout — H2 title 미주입 + bullet 마커 중복 fix (등록: 2026-05-19, 해결: 2026-05-19, commit: 3786fd7) ✅
- Issue175. Info.md `design_mood` 필드 추가 — 그래픽 디자인 톤 SSOT (등록: 2026-05-19, 해결: 2026-05-19, commit: fd6f458) ✅
- Issue174. slot-designer 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
- Issue173. layout-selector 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
- Issue172. media-creater 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
- Issue171. md-builder 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
- Issue170. agenda-designer 데이터-주도 SCAR 전환 (등록: 2026-05-19, 해결: 2026-05-19) ✅
- Issue169. info-filler v2 패턴 전환 — 데이터-주도 SCAR (등록: 2026-05-19, 해결: 2026-05-19, commit: 2529153) ✅
- Issue168. authoring-pipeline v1/v2 명명 제거 — 단일 SSOT 일원화 (등록: 2026-05-18, 해결: 2026-05-18, commit: d8f0a65) ✅
- Issue167. authoring-pipeline v1 제거 — v2 단독 SSOT 통합 (등록: 2026-05-18, 해결: 2026-05-18, commit: d4ca868) ✅
- Issue165. `/m2` 라우터 기준 authoring-pipeline 단계 1~9 전체 통합 추적 umbrella task (등록: 2026-05-18, 해결: 2026-05-18, commit: f704852) ✅
- Issue166. authoring-pipeline v2 구현 — 데이터-주도 SCAR + /pm 무중단 History/Artifacts (등록: 2026-05-18, 해결: 2026-05-18, commit: dac9db9) ✅
- Issue164. authoring-pipeline 진입점 `/m2` 라우터 커맨드 신규 (등록: 2026-05-18, 해결: 2026-05-18, commit: f2b2b5e) ✅
- Issue157. authoring-pipeline 단계 1~9 전체 통합 추적 umbrella task (등록: 2026-05-17, 해결: 2026-05-18, 승계: Issue165) ✅
- Issue156. new-project SCAR 업데이트 + authoring-pipeline 오케스트레이션 agent 추가 (등록: 2026-05-17, 해결: 2026-05-17, commit: 624d201) ✅
- Issue163. authoring-pipeline 단계 7 — slot-designer agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
- Issue162. authoring-pipeline 단계 5 — media-creater agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
- Issue161. authoring-pipeline 단계 4 — md-builder skill 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
- Issue160. authoring-pipeline 단계 3 — agenda-designer agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
- Issue159. authoring-pipeline 단계 2 — refs-collector agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
- Issue158. authoring-pipeline 단계 1 — info-filler agent 신설 (등록: 2026-05-17, 해결: 2026-05-17, commit: acb4816) ✅
- Issue155. m2slide layout-selector LLM agent 구현 (단계 6) (등록: 2026-05-17, 해결: 2026-05-17, commit: 4d82d13) ✅
- Issue154. theme HTML layout 파일에 description frontmatter 주입 (등록: 2026-05-17, 해결: 2026-05-17, commit: 605e479) ✅
- Issue153. authoring-pipeline.md에 slot 카탈로그 4 yml + 통합 guide 반영 (등록: 2026-05-16, 해결: 2026-05-16, commit: 94cbef1) ✅
- Issue152. slot_animation.yml에서 reveal.js 자체 fragment 클래스 카탈로그 제거 (등록: 2026-05-16, 해결: 2026-05-16, commit: 5fbe41a) ✅
- Issue151. slot guide 4 md → 1 md 통합 (등록: 2026-05-16, 해결: 2026-05-16, commit: db27074) ✅
- Issue150. `data/slot.yml` 4분할 + guide md 분리 (등록: 2026-05-16, 해결: 2026-05-16, commit: 5e9070d) ✅
- Issue149. reveal.js 표준 `<!-- .element: class="..." -->` 주석 syntax 지원 (등록: 2026-05-16, 해결: 2026-05-16, commit: 7a76d62) ✅
- Issue148. 지원 slot을 `data/slot.yml`로 카탈로그화 (열린 구조) (등록: 2026-05-16, 해결: 2026-05-16, commit: 26324d4) ✅
- Issue147. `cards_placeholder: false` + `toc_placeholder: true` 조합에서 `id="toc-placeholder"` 중복 생성 (등록: 2026-05-10, 해결: 2026-05-10, commit: 2300788) ✅
- Issue146. inline code 백틱 내 HTML 미이스케이프로 `<!-- ... -->`·`<div ...>` 내용 누락 (등록: 2026-05-10, 해결: 2026-05-10, commit: 2eefd8b) ✅
- Issue143. `_contents` puffer2s 마스코트가 `head_right` 텍스트를 가림 (등록: 2026-05-10, 해결: 2026-05-10, commit: d83a113) ✅
- Issue129. `default_background_transition` 회귀 테스트 (등록: 2026-05-06, 해결: 2026-05-10, commit: e214b43) ✅
- Issue144. `cards_placeholder: false` 옵션이 parser 단계 autoToc 변환을 막지 못함 (등록: 2026-05-10, 해결: 2026-05-10, commit: b2bd80a, <후속 splice 변경>) ✅
- Issue132. ePub 분할 레이아웃(2/3분할 카드) 렌더링 버그 (등록: 2026-05-06, 해결: 2026-05-10, commit: 9d3de29) ✅
- Issue131. `_contents` 레이아웃 제목 폰트를 소제목 크기와 동일하게 (등록: 2026-05-06, 해결: 2026-05-10, commit: 843cc4e) ✅
- Issue142. `head_breadcum` master toggle 코드 구현 (등록: 2026-05-10, 해결: 2026-05-10, commit: 88bfa08) ✅
- Issue141. _contents head_left/head_right 시스템 슬롯 + outline depth + breadcrumb (등록: 2026-05-10, 해결: 2026-05-10, commit: 7f9a416..e79357a) ✅
- Issue140. `toc_placeholder: true` Map Slide 미삽입 회귀 (Issue58 도입) (등록: 2026-05-10, 해결: 2026-05-10, commit: 453f423) ✅
- Issue139. End 키 → agenda fallback 제거 (모든 모드) (등록: 2026-05-10, 해결: 2026-05-10, commit: bcdd2ad) ✅
- Issue138. Cards Page / Map Slide 의미 분리 — `_cards.html` 신규 + Map Slide layout 제거 + 두 옵션 분리 (등록: 2026-05-09, 해결: 2026-05-10, commit: 2044cc5) ✅
- Issue137. `toc_placeholder` 옵션 vs `id="toc-placeholder"` 마커 이름 충돌 + 빈 placeholder 잔여 슬라이드 (등록: 2026-05-09, 해결: 2026-05-09, commit: 7c4adda) ✅
- Issue136. Chapter 모드 ⇤/⇥ 계층 인식 sibling 점프 (main/sub 구분) (등록: 2026-05-09, 해결: 2026-05-09, commit: ef8e2a6) ✅
- Issue133. Single 모드 ⇤/⇥ boundary fallback (Chapter Issue114 대칭) (등록: 2026-05-09, 해결: 2026-05-09, commit: ef8e2a6) ✅
- Issue130. Cover instructor(author+contact) 영역 노란 테두리 (등록: 2026-05-06, 해결: 2026-05-09, commit: 06aa280) ✅
- Issue135. _toc 슬라이드 markmap이 동일 페이지 슬라이드 이동 시 작게 다시 그려지는 문제 (등록: 2026-05-09, 해결: 2026-05-09, commit: 35221b2) ✅
- Issue134. _toc 슬라이드 markmap이 reveal.js 안에서 작게 그려지는 문제 (등록: 2026-05-09, 해결: 2026-05-09, commit: c41e988) ✅

## [v0.7.0] - 2026-05-06

### What's new

#### 🚀 `/deploy-docs` 커맨드 신규 — multi-project GitHub Pages 배포 (Issue127)

`docs/` 하위에 다수 프로젝트를 카드 형태로 한 곳에 모아 배포하는 워크플로우 도입.

- **`/deploy-docs <project>`**: docs/<project>/ 존재 시 update, 없으면 new 자동 분기
- **`/deploy-docs <project> delete`**: 폴더 + 메인 인덱스 카드 제거 (사용자 승인 필수)
- **`/deploy-docs`**: 사용법 + 현재 docs/ 배포 목록 출력
- 카드 제목 자동 추출(`<title>` 태그) + `data-project` 속성 unique 매칭 + stale 파일 제거 + 검증 5종

#### 📦 다양한 출력 형식 통합 — `_config.yml: deploy_formats` (Issue127)

프로젝트 `_config.yml`에 한 줄 추가하면 `/deploy-docs`가 m2slide.sh에 옵션 자동 전달.

```yaml
deploy_formats: [epub, pdf, pptx]   # 모든 형식 (HTML 기본 + 추가)
deploy_formats: [epub]               # EPUB만
## 키 생략 또는 [] → HTML만
```

- 빌드 후 산출물(`<project>.epub`/`.pdf`/`.pptx`)이 docs/ 자동 동기화
- 메인 인덱스 카드에 다운로드 배지 동적 노출 (📚 EPUB amber / 📄 PDF red / 📊 PPTX emerald)
- 의존성 누락 시 graceful degradation (mmdc·decktape·pandoc 안내 출력 후 빌드 계속)

#### 🎨 agenda 다운로드 버튼 우하단 이동 (Issue128, Issue80 후속)

마스코트(우상단)와 시각적 충돌 회피.

- 위치: `header > .toc-page-downloads` (float right) → `.layout-_agenda > .toc-page-downloads` (position absolute, bottom 3% + 5px / right 3%)
- Issue113 frame 변수(--frame-h/--frame-w) 재사용 — viewport letterbox 변화 무관
- z-index 5로 마스코트(z-index 0) 위에 표시되어 클릭 가능
- Issue80 §2.2 `margin-right: 16%` 회피 마진 제거 (불필요)

### Issues 종결

- **Issue127** (commit: 477da13): /deploy-docs 신규 커맨드 + deploy_formats 옵션 + 카드 다운로드 배지 + README 업데이트
- **Issue128** (commit: 477da13): agenda 다운로드 버튼 우하단 이동 (Issue80 후속)
- **v0.6.x 시리즈 (Issue71-126, 56건)** 누적 z_old 아카이브 — 본 release에 누적 정리

### 변경 파일

- 신규: `.claude/commands/deploy-docs.md` (340줄)
- 수정: `theme/default/layouts/_agenda.html`, `theme/default/slide.css`, `lib/html-builder.js`, `docs/index.html`, `README.md`, `Issue.md`, `VERSION`
- 아카이브: `z_old/old_issue.md`에 v0.7.0 섹션 prepend (Issue127-128 + v0.6.x 누적)

## [v0.6.0] - 2026-05-05

### Issues 종결 (36건, Issue71-106)

#### 키보드 네비게이션 — 9키 체계 정립 + 트리 탐색 (Issue71, 87-92, 99-106)

- **Issue71**: ↑ 키 H1 section anchor 단위 이동 + Home 키 도입 (d54eab7)
- **Issue87**: key_navigation 설계 반영 — 9키 네비게이션 체계 구현 (a44b7b6)
- **Issue88**: key_navigation.md 정합성 후속 수정 (a44b7b6)
- **Issue89**: ⇤ Home / ⇥ End 키 동작 안 함 — Reveal.js hijack 수정 (ba4e084)
- **Issue92**: Home/End sibling 점프가 H2 sub-section까지 매칭 + 일부 환경에서 Home/End keydown 미전달 (b9610bb)
- **Issue99**: Chapter 모드 본문(leaf)에서 ↓ 키 무동작 — 다음 챕터 fall-through (68eb82b)
- **Issue100**: 본문 leaf에서 ↑ 키가 직속 부모(H2 sub-anchor) 건너뛰고 H1 anchor로 점프 (68eb82b)
- **Issue102**: H2 sub-anchor에서 ↑ 시 직속 부모 H1 anchor로 이동 (Issue100 후속) (354d142)
- **Issue103**: Single 모드 본문(leaf)에서 ↓ 키 무동작 — 다음 H1 anchor fall-through (7570cf0)
- **Issue104**: Chapter ← 이전 챕터 진입 시 backward 트랜지션 애니메이션 반영 (48f63e2)
- **Issue105**: ⇤/⇥ Single 모드 sibling을 H1 전용에서 레벨 인식 트리 탐색으로 확장 (2e188b5)
- **Issue106**: anchor에서 ↓ 누름 시 자식 sub-anchor 우선 — H1 → 첫 H2로 점프 (dc60188)

#### 시각·CSS 개선 (Issue72, 80, 85-86, 90-91, 94-98, 101)

- **Issue72**: CSS `!important` 과도 사용 1차 최적화 (05b7782)
- **Issue80**: theme_layout_default.md §2 레이아웃 변경 결정사항 default theme 적용 (a268ad4)
- **Issue85**: slide_outer_padding 4면 균등 적용 + agenda 반영 + unitless 0 calc 회귀 수정 (1a9d78d)
- **Issue86**: default theme 시각 개선 — 가로선 hr.png 통일 + 페이지 UI를 outer padding 바깥으로 (582d064)
- **Issue90**: title_contents_gap이 .contents-title에 적용 안 됨 (2b1c3d9)
- **Issue91**: 제목 underline이 contents-header 안쪽에 있어 위/아래 갭 비대칭 (2b1c3d9)
- **Issue94**: 테이블 슬라이드에 layout-_contents 클래스 미적용 (45cedeb)
- **Issue95**: Pandoc `::: rows` 행이 contents-body 채우지 못하고 height 비례 미적용 (09babdf)
- **Issue96**: 2x2 그리드 (columns 안에 rows 중첩) 균등 분할 미적용 (fdbe8da)
- **Issue97**: default_lec theme를 default theme의 Issue80/86 시각 변경과 동기화 (8883e2e)
- **Issue98**: 코드 블록 좌측 정렬 + HTML escape + hljs 클래스 누락 (d567d53)
- **Issue101**: 코드 박스 시각 안정화 — CDN github.css 의존 제거 + 자체 .code-wrapper 박스 (42979cf)

#### 기능 추가 / Pandoc 호환 (Issue73-74, 76, 79, 81, 93)

- **Issue73**: theme/default/layouts/ 번호 prefix layout 6종 신규 추가 (da0cc88)
- **Issue74**: AGENDA title Format A/B 통일 + cover 강사 label 미세 개선 (67222eb)
- **Issue76**: lib/combine-pdfs.py 신규 — macOS Quartz 기반 PDF 병합 (1cb45ba)
- **Issue79**: `_meta.yml` 폐기 + 메타데이터를 슬라이드 소스 frontmatter로 통합 (d49f9bb)
- **Issue81**: 슬라이드 layout 메타 `#layout-` prefix 정식 지원 (c27ae5d)
- **Issue93**: Pandoc `::: columns` / `::: rows` 본문 누락 (09babdf)

#### 설계 문서 정합성 (Issue75, 77-78, 82-84)

- **Issue75**: _agenda.html instructor div 제거 + CLAUDE.md base.css 가드 섹션 추가 (8d47945)
- **Issue77**: markmap fold 인디케이터 원 크기 30% 축소 (a29a0fa)
- **Issue78**: 번호 prefix layout 6종 폐기 + layout_default.md를 theme_layout_default.md에 머징 (afdb361)
- **Issue82**: lib/layout.js dead `_WARNED_MISSING_LAYOUTS` 제거 + 설계 문서 §4.4 정정 (ee70b2a)
- **Issue83**: 설계 문서 `theme_layout.md` §5.1·§11.2·§15 `_toc` 자동 적용 조건 정정 (568f456)
- **Issue84**: 설계 문서 `theme.md` §2 `slide_css:` 우선순위 표 정정 (568f456)

### 주요 변화 요약

- **9키 네비게이션 SSOT 정립**: `_doc_arch/key_navigation.md` — ←/→/↑/↓ 4방향 + ⇤/⇥/⇞/⇟ 4단축. Single/Chapter 모드 매트릭스 + K1~K11 결정사항
- **트리 탐색 의미 도입**: ⇤/⇥는 enclosing anchor 레벨 N 기준 prev/next anchor at `level ≤ N` (H1↔H1, H2↔H2, …). leaf ↓는 fall-through (다음 챕터/다음 H1). anchor ↓는 자식 sub-anchor 우선
- **Backward 트랜지션 애니메이션**: ← 챕터 이동 시 우측에서 슬라이드 진입(좌측 모션). `?back=1`/`?fwd=1` URL 시그널 + 자체 CSS keyframe
- **Pandoc fenced div 호환**: `::: columns` / `::: rows` 정상 처리 + 2x2 그리드 균등 분할
- **메타데이터 SSOT 통합**: `_meta.yml` 폐기, 슬라이드 소스 frontmatter로 통합 (Issue79). cover/agenda 자동 주입 정책

## [v0.5.0] - 2026-05-03

### Issues 종결 (71건)

- **Issue70**: 키 네비게이션 체계 정리 — Single ←·Chapter ↑·Chapter 챕터 간 ← (fa43351)
- **Issue66**: cover 페이지 Reveal.initialize 하드코딩으로 slide_ratio 무효화 (bffd865)
- **Issue69**: agenda.html이 _config.yml의 slide_ratio를 적용하지 않음 (84a2fbe)
- **Issue68**: single-page mode PDF 미생성 + 프로젝트 루트 stale EPUB 누적 (0cec27f)
- **Issue67**: cover layout 빈 메타 변수 → 빈 박스/래퍼 잔존 (b3a486e)
- **Issue65**: slide_ratio: none 값 제거 — 유효값 단일화 (9c83d87)
- **Issue63**: slide_ratio 기반 슬라이드 레이아웃 크기 체계 정립 (c34d560, 33d4cc1)
- **Issue64**: lib/css/base.css 도입 — _config.yml + slide.css 슬림화 (7a10b81)
- **Issue62**: cover-title 반응형 크기 조정 및 CSS 구현 설계 문서화 (b12a8db, 789947d)
- **Issue61**: title_contents_gap이 media-enlarge-fit 모드 + H3 슬라이드에서 미적용 (4e418c2, 789947d, 8db51ae)
- **Issue60**: generate-slides.js 모듈 분리 리팩터링 (05c1299)
- **Issue59**: cover_enabled=true 시 커버 페이지 복원 (bba0104)
- **Issue58**: Cover Slide 제거 및 TOC 통합 (9ed3298)
- **Issue57**: Agenda/TOC 페이지 ArrowLeft 키 누락 (c730a5c)
- **Issue52**: m2SlideStyle2_chapter 프로젝트 구조 정비 (c57e016)
- **Issue51**: 장표 드래그 네비게이션 (c57e016)
- **Issue50**: Orientation 슬라이드 + TOC 제외 메타 (c57e016)
- **Issue55**: chapter/single 모드 출력 구조 통일 — 3페이지 모델 (71841f5)
- **Issue56**: theme/nowage markmap 링크 밑줄 제거 (542ed18)
- **Issue49**: 제목 페이지 자동 생성 — Frontmatter 기반 cover 슬라이드 (71b5fc5, 6d42c37)
- **Issue48**: meta.yml 운영 — 프로젝트 메타데이터 분리 SSOT (0a2f75a)
- **Issue54**: 자동 layout 슬라이드 화면 밖 렌더링 — `position: relative` 가 reveal.js 스택 깨뜨림 (6141a6c)
- **Issue53**: 페이지 번호 링크 비활성화 — prev arrow 클릭 영역 침범 해결 (f67aff6)
- **Issue46**: TOC markmap 노드 클릭 시 슬라이드 인덱스 1칸 어긋남 — `_toc` 자동 prepend 미반영 (1d20fdb)
- **Issue47**: keynote-nowage-theme 시각 디자인 적용 (1dc825a)
- **Issue45**: layout 이름 정규화 정책 문서·회귀 검증 정합성 점검 (ea56fa1)
- **Issue44**: raw HTML `<video>`/`<audio>` multi-line block이 `<p>` wrap으로 깨짐 (2f90ee8)
- **Issue26**: 동영상 지원 기능 (2f90ee8)
- **Issue27**: 제목 없는 단독 이미지 페이지 자동 확대 (bde5f69)
- **Issue27_1**: 전체 이미지 단독 슬라이드 → `_blank.html` 적용 (bde5f69)
- **Issue27_2**: 제목 비어있는 슬라이드 → `_contents_no_title.html` 적용 (bde5f69)
- **Issue27_3**: 자동 layout 감지 ON/OFF 옵션을 `_config.yml`에 추가 (bde5f69)
- **Issue27_4**: `_blank` full-image 이미지 크기 확대 (bde5f69)
- **Issue41**: theme_default_layout 값 정규화 + 경고 dedup (2f90ee8)
- **Issue43**: `_config.org.yml` video 기본 옵션 정리 + `![] (2f90ee8)
- **Issue40**: PPT 슬라이드 마크다운 규칙 정립 — md-slide-rules + md-m2slide-rules 2계층
- **Issue39**: TOC markmap 초기 렌더링 누락 — tocData 빈 wrapper + `#toc-mindmap` ID 중복 (4567248)
- **Issue28**: 베이스 폴더 변경
- **Issue37**: H 제목 내 특수문자 처리 버그 (9d160e5)
- **Issue38**: layout 파일명 표준화 + default 테마 fallback 시스템 (b58b563)
- **Issue36**: theme/{name}/ + HTML 템플릿 layout 시스템 도입 (687ce22)
- **Issue36_1**: 첫 페이지 렌더링 오작동 (a95cd61)
- **Issue36_2**: nowage 테마로 재테스트 (a95cd61)
- **Issue35**: chapter-list TOC 카드 블록 레이아웃 전환 (30181b9)
- **Issue34**: 다분할 레이아웃 마크다운 단축 표기 지원 (bfdd1c0)
- **Issue34_1**: 다분할 레이아웃 렌더링 버그 수정 (bfdd1c0)
- **Issue32**: m2slide.sh -h/--help 옵션 추가 (2bbb15a)
- **Issue31**: top_align 버그 수정 및 title_contents_gap 옵션 추가 (8ca0915)
- **Issue30**: _config.org.yml을 기본값 SSOT로 변경 (6805b6d)
- **Issue29**: convert.sh → m2slide.sh 이름 변경 (c5030fb)
- **Issue24**: Slide 폴더 포터블화 (40e8bc4)
- **Issue20**: PPTX 생성 옵션 (40e8bc4)
- **Issue23**: 단일 페이지 모드에서 ePub 생성 지원 (40e8bc4)
- **Issue18**: PDF 생성 옵션 (40e8bc4)
- **Issue22**: 테이블 내 이미지 크기 자동 조절 (40e8bc4)
- **Issue21**: 번호 있는 리스트 (0310884)
- **Issue19**: 단일 페이지 모드용 종합 샘플 프로젝트 (40e8bc4)
- **Issue17**: 단일 페이지 모드 시 markdown 폴더 없이 루트 md 파일 인식 지원 (103203c)
- **Issue16**: 단일 페이지 프로젝트 (3603790)
- **Issue15**: 챕터별 페이지 markmap depth 별도 설정 (3603790)
- **Issue14**: 챕터별 프로젝트 (3603790)
- **Issue13**: Markmap Depth 설정 및 표시 오류 수정 (eaa5870)
- **Issue12**: font_size_auto 미작동 수정 (7bbeaac)
- **Issue11**: 스타일 상세 설정 (84ddacb)
- **Issue10**: 개요 페이지 컬럼 수 제한 (2982855)
- **Issue7**: 개요1 페이지 반응형 다단 레이아웃 (a0f7f03)
- **Issue8**: index.html 네비게이션 개선 (2d6421a)
- **Issue9**: 챕터 간 네비게이션 개선 (2d6421a)
- **Issue6**: 이미지/SVG 크기 옵션 추가 (f047fbb)
- **Issue4**: 리스트 (08e8483)
- **Issue5**: 제목 크기 및 패딩 설정 (08e8483)
