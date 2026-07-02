---
title: 차트·지도·인포그래픽
type: ppt
release_date: 2026-06-28
---

# 3. 차트·지도·인포그래픽
#layout-chapter

---

## 3.1 Chart.js — 막대 차트 (bar)
#layout-contents

렌더 백엔드: Chart.js (CDN 조건부 주입). fenced lang `chart`. 본문 = Chart.js config JSON.
config 파싱 실패 시 에러 메시지 표시 (빌드 중단 없음).

```chart
{
  "type": "bar",
  "data": {
    "labels": ["1월", "2월", "3월", "4월", "5월", "6월"],
    "datasets": [
      {
        "label": "슬라이드 생성 수",
        "data": [12, 19, 8, 25, 32, 41],
        "backgroundColor": [
          "rgba(78,201,176,0.7)",
          "rgba(78,201,176,0.7)",
          "rgba(78,201,176,0.7)",
          "rgba(206,145,120,0.7)",
          "rgba(206,145,120,0.7)",
          "rgba(206,145,120,0.7)"
        ],
        "borderColor": "rgba(78,201,176,1)",
        "borderWidth": 1
      }
    ]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "legend": { "position": "top" },
      "title": { "display": true, "text": "월별 슬라이드 생성 현황" }
    },
    "scales": {
      "y": { "beginAtZero": true }
    }
  }
}
```

---

## 3.1b Chart.js — 선 차트 (line)
#layout-contents

```chart
{
  "type": "line",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [
      {
        "label": "방문자 수 (천명)",
        "data": [120, 190, 150, 280],
        "fill": false,
        "borderColor": "rgba(78,201,176,1)",
        "backgroundColor": "rgba(78,201,176,0.2)",
        "tension": 0.4,
        "pointRadius": 6,
        "pointBackgroundColor": "rgba(206,145,120,1)"
      },
      {
        "label": "전환율 (%)",
        "data": [3.2, 4.1, 3.8, 5.5],
        "fill": false,
        "borderColor": "rgba(206,145,120,1)",
        "backgroundColor": "rgba(206,145,120,0.2)",
        "tension": 0.4,
        "pointRadius": 6
      }
    ]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "title": { "display": true, "text": "분기별 방문자·전환율 추이" }
    }
  }
}
```

---

## 3.1c Chart.js — 원형 차트 (pie)
#layout-contents

```chart
{
  "type": "pie",
  "data": {
    "labels": ["htmlArt", "Chart.js", "Mermaid", "React", "p5.js", "기타"],
    "datasets": [
      {
        "label": "구성요소 사용 비중",
        "data": [35, 20, 18, 15, 8, 4],
        "backgroundColor": [
          "rgba(78,201,176,0.8)",
          "rgba(206,145,120,0.8)",
          "rgba(86,156,214,0.8)",
          "rgba(220,220,170,0.8)",
          "rgba(197,134,192,0.8)",
          "rgba(150,150,150,0.8)"
        ],
        "borderColor": "#1e1e1e",
        "borderWidth": 2
      }
    ]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "legend": { "position": "right" },
      "title": { "display": true, "text": "시각 구성요소 사용 비중" }
    }
  }
}
```

---

## 3.2 Leaflet — 서울 지도
#layout-contents

렌더 백엔드: Leaflet.js + OpenStreetMap (CDN 조건부 주입). fenced lang `map`.
`center`: `[위도, 경도]`, `zoom`: 1~18, `markers[].popup`: 팝업 텍스트.

```map
{
  "center": [37.5665, 126.9780],
  "zoom": 12,
  "markers": [
    { "coords": [37.5665, 126.9780], "popup": "서울 시청" },
    { "coords": [37.5796, 126.9770], "popup": "경복궁" },
    { "coords": [37.5512, 126.9882], "popup": "남산타워" },
    { "coords": [37.5172, 127.0473], "popup": "강남구청" }
  ]
}
```

---

## 3.2b Leaflet — 판교 테크노밸리
#layout-contents

```map
{
  "center": [37.3947, 127.1116],
  "zoom": 14,
  "markers": [
    { "coords": [37.3947, 127.1116], "popup": "판교 테크노밸리" },
    { "coords": [37.3990, 127.1078], "popup": "카카오 판교아지트" },
    { "coords": [37.3920, 127.1130], "popup": "네이버 1784" }
  ]
}
```

---

## 3.3 d3 인포그래픽 — 가로 막대
#layout-contents

렌더 백엔드: d3.js (markmap 의존성 재사용 — 추가 CDN 없음). fenced lang `d3`.
인자: `d3` (라이브러리), `el` (컨테이너 div). `el.clientWidth/clientHeight` 참조 권장.

```d3
const data = [
  { label: 'htmlArt', value: 35, color: '#4ec9b0' },
  { label: 'Chart.js', value: 20, color: '#ce9178' },
  { label: 'Mermaid',  value: 18, color: '#569cd6' },
  { label: 'React',    value: 15, color: '#dcdcaa' },
  { label: 'p5.js',    value: 8,  color: '#c586c0' },
  { label: '기타',     value: 4,  color: '#888' }
];

const w = el.clientWidth || 600;
const h = el.clientHeight || 280;
const margin = { top: 20, right: 30, bottom: 20, left: 80 };
const width = w - margin.left - margin.right;
const height = h - margin.top - margin.bottom;

const svg = d3.select(el).append('svg')
  .attr('width', w).attr('height', h)
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().domain([0, 40]).range([0, width]);
const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, height]).padding(0.2);

svg.append('g').call(d3.axisLeft(y).tickSize(0))
  .selectAll('text').style('fill', '#ccc').style('font-size', '13px');

svg.selectAll('rect')
  .data(data).enter().append('rect')
  .attr('x', 0)
  .attr('y', d => y(d.label))
  .attr('width', d => x(d.value))
  .attr('height', y.bandwidth())
  .attr('fill', d => d.color)
  .attr('rx', 3);

svg.selectAll('.label')
  .data(data).enter().append('text')
  .attr('x', d => x(d.value) + 5)
  .attr('y', d => y(d.label) + y.bandwidth() / 2 + 4)
  .text(d => `${d.value}%`)
  .style('fill', '#ccc').style('font-size', '12px');
```

---

## 3.3b d3 — 버블 차트
#layout-contents

```d3
const nodes = [
  { id: 'htmlArt', r: 50, color: '#4ec9b0' },
  { id: 'Mermaid', r: 35, color: '#569cd6' },
  { id: 'Chart.js', r: 30, color: '#ce9178' },
  { id: 'React', r: 28, color: '#dcdcaa' },
  { id: 'KaTeX', r: 20, color: '#c586c0' },
  { id: 'Leaflet', r: 20, color: '#4fc1ff' },
  { id: 'p5.js', r: 18, color: '#f44747' },
  { id: 'model3d', r: 15, color: '#888' }
];

const w = el.clientWidth || 700;
const h = el.clientHeight || 320;

const svg = d3.select(el).append('svg').attr('width', w).attr('height', h);

const simulation = d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(5))
  .force('center', d3.forceCenter(w / 2, h / 2))
  .force('collision', d3.forceCollide(d => d.r + 4));

const circles = svg.selectAll('circle')
  .data(nodes).enter().append('circle')
  .attr('r', d => d.r)
  .attr('fill', d => d.color)
  .attr('opacity', 0.8);

const labels = svg.selectAll('text')
  .data(nodes).enter().append('text')
  .text(d => d.id)
  .attr('text-anchor', 'middle')
  .attr('dy', '0.35em')
  .style('fill', '#fff')
  .style('font-size', d => `${Math.max(9, d.r / 3.5)}px`)
  .style('pointer-events', 'none');

simulation.on('tick', () => {
  circles.attr('cx', d => d.x).attr('cy', d => d.y);
  labels.attr('x', d => d.x).attr('y', d => d.y);
});
```
