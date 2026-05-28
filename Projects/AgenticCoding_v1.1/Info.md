# AgenticCoding_v1.0

Agentic Coding 강의 자료 (4시간 핸즈온) — ppt2m2slide 자동 변환 (md_first 모드).

## 변환 정보

* 원본 PPT: `Projects/_ppt/AgenticCoding_v1.0/AgenticCoding_V1.0-참고용.pptx`
* 변환 모드: md_first (텍스트·이미지 의미 단위 재구성, PDF 페이지 PNG fallback 금지)
* 총 슬라이드: 88장 (Part1: 39장 + Part2: 49장)
* palette: office_rainbow (PPT 테마 6색 정확 매칭)

## 후속 작업 가이드

1. **수동 마크다운 작성 필요 슬라이드** — `data/_proposals/AgenticCoding_v1.0-2026-05-27.md` 참조
2. **frontmatter 식별자 필드** — `AGENDA.md`의 `instructor_name`, `author` 비어있음. 같은 레포 grep 후 채울 것
3. **빌드**: `./m2slide.sh AgenticCoding_v1.0`
