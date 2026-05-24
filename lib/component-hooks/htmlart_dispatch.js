'use strict';

// htmlart_dispatch — htmlArt 구조 도해 d3 SVG 렌더 클라이언트 훅 (Issue193).
// component-libraries.yml 의 htmlart.init_hook 가 본 모듈을 지정.
//
// 배경: htmlArt 4타입(process/cycle/hierarchy/pyramid)은 순수 CSS 구현이었다.
//   cycle 원형 배치·hierarchy 연결선은 CSS 로 좌표·곡선 계산이 불가능해
//   nth-child 하드코딩(8개 한계)·고정 px·화살표 부재 등 한계가 누적됐다(Issue188~192).
//   → 렌더 백엔드를 d3 SVG 로 전환. 사용자 결정(2026-05-21): 4타입 전부 d3 API 통일.
//   preprocessPandocDiv 가 낸 `data-htmlart` div + 내부 `<ul>` 은 그대로 두고
//   (graceful degradation — JS 미동작 시 list 표시), 본 훅이 reveal ready 후
//   ul 트리를 파싱하여 d3 로 SVG 도해를 생성해 교체한다.
//
// 진행: v1 4 + v2 10 + v3 list 5 + v4 비율·균형 2 = 21타입 전부 d3 SVG 렌더.
//   v4 (pie·balance) — Basic Pie·Pie Process·Balance(미구현 ❌) 흡수.
//   theme `_shared/components.css` 의 타입별 htmlArt CSS 블록은 전부 제거됨
//   (`.m2-htmlart` 공통 컨테이너 — CSS 변수·component-error 만 잔존).
//
// d3 API 사용:
//   - 공통: d3.select(DOM 구성) · d3.range(순회) · d3.scaleLinear(비례)
//   - cycle·radial·arrow: d3.pointRadial(원형 좌표) · d3.path().arc(순환 곡선)
//   - hierarchy: d3.hierarchy + d3.tree(트리 레이아웃) · d3.linkVertical(연결선)
//   - pyramid·funnel: d3.scaleLinear(층 너비 비례)
//   - process·timeline·chevron·step·matrix: 박스/polygon 체인
//   - venn·target·gear: circle/path 도형
//   d3@7.9.0 는 html-builder.js 정적 블록이 무조건 로드. 색상은 .m2-htmlart 가
//   정의한 CSS 변수(--htmlart-accent 등)를 SVG 요소가 상속한다.
// 설계 SSOT: _doc_arch/htmlArt.md / 타입 카탈로그: data/htmlart/types.yml
//   전체 SmartArt 카탈로그·구현 현황: _doc_arch/htmlArt_list.md

const script = `
(function(){
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  // li 직속 텍스트 (중첩 ul/ol 제거 후). hierarchy 는 ha-node span 우선.
  function nodeText(li){
    var span=li.querySelector(':scope > span.ha-node');
    if(span)return (span.textContent||'').trim();
    var c=li.cloneNode(true);
    c.querySelectorAll('ul,ol').forEach(function(n){n.remove();});
    return (c.textContent||'').trim();
  }

  // 평면 타입(cycle·pyramid)용 — 최상위 li 를 {title, subs[]} 배열로 수집.
  function collectItems(ul){
    var items=[];
    ul.querySelectorAll(':scope > li').forEach(function(li){
      var title=nodeText(li), subs=[];
      var sub=li.querySelector(':scope > ul, :scope > ol');
      if(sub){
        sub.querySelectorAll(':scope > li').forEach(function(s){
          var t=nodeText(s);
          if(t)subs.push(t);
        });
      }
      if(title)items.push({title:title,subs:subs});
    });
    return items;
  }

  // hierarchy 용 — 중첩 ul 을 {name, children[]} 트리로 재귀 파싱.
  function parseNode(li){
    var node={name:nodeText(li),children:[]};
    var sub=li.querySelector(':scope > ul, :scope > ol');
    if(sub)sub.querySelectorAll(':scope > li').forEach(function(c){node.children.push(parseNode(c));});
    return node;
  }
  function parseTree(ul){
    var roots=[];
    ul.querySelectorAll(':scope > li').forEach(function(li){roots.push(parseNode(li));});
    return roots;
  }

  // 노드 박스 foreignObject 헬퍼 — 제목 + 선택적 부제 행.
  function nodeBox(parent, x, y, w, h, title, subs, accentBg, subFsOverride){
    var fo=parent.append('foreignObject')
      .attr('x',x).attr('y',y).attr('width',w).attr('height',h);
    var bg=accentBg?'var(--htmlart-accent,#2b8a9d)':'var(--htmlart-surface,#f4f4f5)';
    var fg=accentBg?'var(--htmlart-fg,#fff)':'inherit';
    var box=fo.append('xhtml:div')
      .attr('style','box-sizing:border-box;width:100%;height:100%;display:flex;'
        +'flex-direction:column;align-items:center;justify-content:center;text-align:center;'
        +'background:'+bg+';color:'+fg+';'
        +'border:2px solid var(--htmlart-accent,#2b8a9d);border-radius:14px;'
        +'padding:6px 12px;overflow:hidden');
    // Issue200: 폰트를 박스 크기(h·w) 비례로 — 텍스트가 박스를 카드처럼 채움.
    //   노드 박스를 키워도 viewBox 가 함께 커져 화면 글자 크기는 불변 →
    //   폰트/노드 비율 자체를 키워야 함(h 의 30%, 단 폭 제약·상한 적용).
    var titleFs=Math.min(Math.round(h*0.30), Math.round(w*0.21), 44);
    // Issue201: title 없는 박스(pyramid 상세 패널)는 subs 가 본문이므로 크게.
    // Issue205: subFsOverride 전달 시 그 값을 강제 (pyramid 상세를 밴드 라벨보다 작게).
    var subFs=subFsOverride||Math.max(Math.round(titleFs*(title?0.66:0.92)), 12);
    if(title){
      box.append('xhtml:div')
        .attr('style','font-weight:700;font-size:'+titleFs+'px;line-height:1.2;'
          +'word-break:keep-all')    // 한글 어절 단위 줄바꿈 (글자 중간 끊김 방지)
        .text(title);
    }
    if(subs&&subs.length){
      box.append('xhtml:div')
        .attr('style','font-weight:400;font-size:'+subFs+'px;line-height:1.3;'
          +'word-break:keep-all'+(title?';opacity:.85;margin-top:3px':''))
        .html(subs.map(esc).join('<br/>'));
    }
    return fo;
  }

  // ── cycle — N노드 원형 등간격 + 순환 곡선 화살표 ───────────────────────
  function renderCycle(el){
    var ul=el.querySelector(':scope > ul');
    if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){
      el.innerHTML='<div class="component-error">htmlArt cycle: 노드 2개 이상 필요</div>';
      return;
    }
    var N=items.length;
    var nodeW=212, nodeH=108, margin=16;
    var Rr=236;                                   // 노드 중심 링 반지름
    // viewBox 를 노드 박스 외곽까지 정확히 맞춤 — 사방 여백 제거(Issue195: 도해 채움)
    var cx=Rr+nodeW/2+margin, cy=Rr+nodeH/2+margin;
    var W=cx*2, H=cy*2;
    var step=(2*Math.PI)/N;
    // gap: arc 끝이 다음 노드 박스 각폭을 벗어나도록 — 박스 반폭+여유를 Rr 기준 각으로
    //   환산. 노드 수가 많아 step 이 좁으면 step*0.42 로 상한(arc 가시성 보존).
    var gap=Math.min(step*0.42, (nodeW/2+24)/Rr);

    el.innerHTML='';
    var svg=d3.select(el).append('svg')
      .attr('viewBox','0 0 '+W+' '+H)
      .attr('class','ha-cycle-svg')
      .attr('style','width:100%;height:100%;max-height:92vh;display:block;margin:0 auto');

    // 순환 화살표 — 곡선 shaft + 화살촉을 단일 채움 path 로 구현(Issue203).
    //   기존: 반투명 stroke 호 + 별도 삼각형 marker. 둘이 겹치는 끝부분에서
    //   opacity 가 중첩돼 얼룩이 생김. 단일 path 1회 채움이면 중첩이 없다.
    var gArrows=svg.append('g');
    d3.range(N).forEach(function(i){
      var cA0=i*step-Math.PI/2+gap;
      var cA1=(i+1)*step-Math.PI/2-gap;
      gArrows.append('path')
        .attr('d', curvedArrowPath(cx, cy, Rr, cA0, cA1, 13, 0.17, 38))
        .attr('style','fill:var(--htmlart-arrow,rgba(0,0,0,.5));stroke:none');
    });

    // 중심 순환 심벌(↻) — dominant-baseline:central 로 크기 무관 정확 중앙정렬
    svg.append('text')
      .attr('x',cx).attr('y',cy).attr('text-anchor','middle')
      .attr('style','font-size:200px;dominant-baseline:central;'
        +'fill:var(--htmlart-accent,#2b8a9d);opacity:.38')
      .text('\\u21BB');

    var gNodes=svg.append('g');
    d3.range(N).forEach(function(i){
      var pos=d3.pointRadial(i*step, Rr);
      nodeBox(gNodes, cx+pos[0]-nodeW/2, cy+pos[1]-nodeH/2, nodeW, nodeH,
        items[i].title, items[i].subs, false);
    });
  }

  // ── hierarchy — 상하 조직도 (d3.tree 레이아웃 + d3.linkVertical 연결선) ──
  function renderHierarchy(el){
    var ul=el.querySelector(':scope > ul');
    if(!ul)return;
    var roots=parseTree(ul);
    if(!roots.length){
      el.innerHTML='<div class="component-error">htmlArt hierarchy: 노드 필요</div>';
      return;
    }
    // 다중 루트 → 가상 루트로 묶어 단일 트리화 (가상 노드는 렌더 제외)
    var data=roots.length===1 ? roots[0] : {name:'',children:roots,_virtual:true};
    var root=d3.hierarchy(data);
    // Issue198 P2: nodeH·세로 nodeSize 확대 → 트리 H 증가로 viewBox aspect 4.07:1 → ~3:1
    var nodeH=90;
    // 노드 너비 — 라벨 길이 비례 가변(고정 152 폐기). 짧은 라벨은 좁게,
    //   긴 라벨은 넓혀 overflow:hidden 클립 방지. minW~maxW 범위로 클램프.
    //   titleFs 는 h·0.30(=27) 이 지배하므로 char 폭 ≈ 26 으로 추정.
    var minW=130, maxW=300;
    function nodeWFor(name){
      if(!name)return minW;
      return Math.max(minW, Math.min(maxW, name.length*26+30));
    }
    root.descendants().forEach(function(n){ n._w=nodeWFor(n.data&&n.data.name); });
    var maxNodeW=root.descendants().reduce(function(m,n){return Math.max(m,n._w);},minW);
    // 형제 간격은 최대 노드 폭 기준(겹침 방지). 각 박스는 자기 _w 로 렌더.
    var tree=d3.tree().nodeSize([maxNodeW+44, nodeH+96]);
    tree(root);

    var nodes=root.descendants().filter(function(n){return !(n.data&&n.data._virtual);});
    var links=root.links().filter(function(l){return !(l.source.data&&l.source.data._virtual);});
    var xs=nodes.map(function(n){return n.x;}), ys=nodes.map(function(n){return n.y;});
    var minX=Math.min.apply(null,xs), maxX=Math.max.apply(null,xs);
    var minY=Math.min.apply(null,ys), maxY=Math.max.apply(null,ys);
    var pad=maxNodeW/2+24;
    var W=(maxX-minX)+pad*2, H=(maxY-minY)+nodeH+48;
    var offX=-minX+pad, offY=-minY+nodeH/2+24;

    el.innerHTML='';
    var svg=d3.select(el).append('svg')
      .attr('viewBox','0 0 '+W+' '+H)
      .attr('class','ha-hierarchy-svg')
      .attr('style','width:100%;height:100%;max-height:92vh;display:block;margin:0 auto');

    // 연결선 — 부모 박스 하단 ↔ 자식 박스 상단 (edge-to-edge, 박스 내부 관통 제거)
    var linkGen=d3.linkVertical()
      .x(function(d){return d.x+offX;})
      .y(function(d){return d.y+offY;});
    var gLinks=svg.append('g');
    links.forEach(function(l){
      var src={x:l.source.x, y:l.source.y+nodeH/2};
      var tgt={x:l.target.x, y:l.target.y-nodeH/2};
      gLinks.append('path')
        .attr('d', linkGen({source:src,target:tgt}))
        .attr('style','fill:none;stroke:var(--htmlart-box-border,rgba(0,0,0,.2));stroke-width:2');
    });

    var gNodes=svg.append('g');
    nodes.forEach(function(n){
      var isRoot=!n.parent||(n.parent.data&&n.parent.data._virtual);
      nodeBox(gNodes, n.x+offX-n._w/2, n.y+offY-nodeH/2, n._w, nodeH,
        n.data.name, null, isRoot);
    });
  }

  // ── pyramid — 적층 사다리꼴 (d3.scaleLinear 너비 비례) + 우측 상세 패널 ─
  function renderPyramid(el){
    var ul=el.querySelector(':scope > ul');
    if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){
      el.innerHTML='<div class="component-error">htmlArt pyramid: 층 2개 이상 필요</div>';
      return;
    }
    var N=items.length;
    var hasPanel=items.some(function(it){return it.subs.length;});
    // Issue198 P2: bandH 확대 → 피라미드 세로 비중 증가
    var bandH=88, gap=8, padT=16;
    var H=padT*2+N*bandH+(N-1)*gap;
    var pyrX=30, pyrMaxW=440, pyrCx=pyrX+pyrMaxW/2;
    var panelX=pyrX+pyrMaxW+36, panelW=270;
    var W=hasPanel ? (panelX+panelW+30) : (pyrX*2+pyrMaxW);
    var wScale=d3.scaleLinear().domain([0,N]).range([0,pyrMaxW]);

    el.innerHTML='';
    var svg=d3.select(el).append('svg')
      .attr('viewBox','0 0 '+W+' '+H)
      .attr('class','ha-pyramid-svg')
      .attr('style','width:100%;height:100%;max-height:92vh;display:block;margin:0 auto');

    // Issue205: 행 배경 띠 — 밴드+상세박스를 한 행으로 묶어 매칭을 명확히 한다.
    //   밴드·상세박스보다 먼저 그려서 뒤(배경)에 깔리도록 함.
    var rowBg=svg.append('g');
    var gBands=svg.append('g');
    d3.range(N).forEach(function(i){
      var y0=padT+i*(bandH+gap), y1=y0+bandH;
      if(hasPanel){
        rowBg.append('rect')
          .attr('x',pyrX).attr('y',y0)
          .attr('width',(panelX+panelW)-pyrX).attr('height',bandH).attr('rx',14)
          .attr('style','fill:var(--htmlart-rowband,rgba(0,0,0,.05))');
      }
      var tw=wScale(i), bw=wScale(i+1);
      var pts=[
        (pyrCx-tw/2)+','+y0, (pyrCx+tw/2)+','+y0,
        (pyrCx+bw/2)+','+y1, (pyrCx-bw/2)+','+y1
      ].join(' ');
      gBands.append('polygon')
        .attr('points', pts)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);stroke:#fff;stroke-width:2');
      // Issue205: 밴드 라벨(핵심 개념)을 상세 텍스트보다 크게 — 글자크기 위계 정정.
      gBands.append('text')
        .attr('x',pyrCx).attr('y',y0+bandH/2+9).attr('text-anchor','middle')
        .attr('style','font-size:26px;font-weight:800;fill:var(--htmlart-fg,#fff)')
        .text(items[i].title);
      if(hasPanel&&items[i].subs.length){
        // Issue201: 패널 제목 생략 — 삼각형 밴드 라벨과 중복. 같은 y 로 매칭됨.
        // Issue205: 상세 텍스트 18px — 밴드 라벨(26px)보다 작게 (위계).
        nodeBox(svg, panelX, y0, panelW, bandH, '', items[i].subs, false, 18);
      }
    });
  }

  // ── process — 가로 박스 체인 + 진행 방향 삼각 화살표 ───────────────────
  function renderProcess(el){
    var ul=el.querySelector(':scope > ul');
    if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){
      el.innerHTML='<div class="component-error">htmlArt process: 단계 1개 이상 필요</div>';
      return;
    }
    var N=items.length;
    // Issue198 P2: boxH 확대 + boxW/arrowGap 축소 → viewBox aspect 를 슬라이드
    //   콘텐츠 영역(~3:1)에 근사화. 가로 6.97:1 letterbox 축소.
    var boxW=196, boxH=230, arrowGap=52, padY=28;
    var W=N*boxW+(N-1)*arrowGap, H=boxH+padY*2;

    el.innerHTML='';
    var svg=d3.select(el).append('svg')
      .attr('viewBox','0 0 '+W+' '+H)
      .attr('class','ha-process-svg')
      .attr('style','width:100%;height:100%;max-height:92vh;display:block;margin:0 auto');

    // 진행 방향 삼각 화살표 (단계 박스 사이)
    var gArrows=svg.append('g');
    d3.range(N-1).forEach(function(i){
      var gx=i*(boxW+arrowGap)+boxW+arrowGap/2, cy=padY+boxH/2;
      var pts=[(gx-13)+','+(cy-16),(gx+15)+','+cy,(gx-13)+','+(cy+16)].join(' ');
      gArrows.append('polygon').attr('points',pts)
        .attr('style','fill:var(--htmlart-arrow,rgba(0,0,0,.45))');
    });

    // 순차 단계 박스
    var gBoxes=svg.append('g');
    d3.range(N).forEach(function(i){
      nodeBox(gBoxes, i*(boxW+arrowGap), padY, boxW, boxH, items[i].title, items[i].subs, false);
    });
  }

  // ── 공통 헬퍼 (Issue202 확장 타입) ─────────────────────────────────────
  function mkSvg(el, W, H, cls){
    el.innerHTML='';
    return d3.select(el).append('svg')
      .attr('viewBox','0 0 '+W+' '+H).attr('class',cls)
      .attr('style','width:100%;height:100%;max-height:92vh;display:block;margin:0 auto');
  }
  function errBox(el, msg){ el.innerHTML='<div class="component-error">'+msg+'</div>'; }
  // 곡선 화살표 — shaft(일정 폭 ribbon) + 화살촉을 잇는 단일 닫힌 path.
  //   반투명 stroke 호 + 별도 marker 조합은 겹침부 opacity 가 중첩돼 얼룩이
  //   생긴다. 한 path 를 1회 채우면(fill) 그 문제가 사라진다.
  //   a0→a1 = 각도 증가 방향(SVG 시계방향). headLen = 화살촉 각길이(rad).
  //   shaftW = shaft 폭(px), headW = 화살촉 밑변 폭(px). 화살촉 끝(tip)=a1, R.
  function curvedArrowPath(cx, cy, R, a0, a1, shaftW, headLen, headW){
    var aH=a1-headLen;                        // 화살촉 밑변 각도
    if(aH<a0)aH=a0;                           // shaft 가 사라질 만큼 짧으면 클램프
    var ro=R+shaftW/2, ri=R-shaftW/2;
    function pt(a,r){return (cx+Math.cos(a)*r).toFixed(2)+' '+(cy+Math.sin(a)*r).toFixed(2);}
    var steps=Math.max(6, Math.round((aH-a0)/0.045));
    var d='M'+pt(a0,ro);
    for(var i=1;i<=steps;i++)d+='L'+pt(a0+(aH-a0)*i/steps, ro);  // 외곽 호 a0→aH
    d+='L'+pt(aH, R+headW/2);                 // 화살촉 바깥 날개
    d+='L'+pt(a1, R);                         // 화살촉 끝(tip)
    d+='L'+pt(aH, R-headW/2);                 // 화살촉 안쪽 날개
    for(var j=steps;j>=0;j--)d+='L'+pt(a0+(aH-a0)*j/steps, ri);  // 내곽 호 aH→a0
    return d+'Z';
  }

  // 톱니바퀴 외곽 path — 잇수*2 꼭짓점이 외경/내경을 교대 (별 모양 실루엣).
  function gearPath(cx, cy, R, teeth){
    var ro=R, ri=R*0.82, steps=teeth*2, p='';
    for(var k=0;k<steps;k++){
      var a=(k/steps)*2*Math.PI, r=(k%2===0)?ro:ri;
      p+=(k===0?'M':'L')+(cx+Math.cos(a)*r).toFixed(1)+' '+(cy+Math.sin(a)*r).toFixed(1);
    }
    return p+'Z';
  }
  // 도형 내부 중앙 텍스트 (제목 + 선택적 부제) — foreignObject div.
  function centerLabel(svg, x, y, w, h, title, subs, fg, titleFs, subFs){
    var fo=svg.append('foreignObject').attr('x',x).attr('y',y).attr('width',w).attr('height',h);
    fo.append('xhtml:div')
      .attr('style','width:100%;height:100%;display:flex;flex-direction:column;'
        +'align-items:center;justify-content:center;text-align:center;'
        +'color:'+fg+';word-break:keep-all;padding:0 6px;box-sizing:border-box')
      .html('<div style="font-weight:700;font-size:'+titleFs+'px;line-height:1.2">'+esc(title)+'</div>'
        +(subs&&subs.length?'<div style="font-size:'+subFs+'px;opacity:.85;margin-top:3px">'
          +subs.map(esc).join('<br/>')+'</div>':''));
    return fo;
  }

  // ── timeline — 가로 타임라인 (축 + 마커 + 교대 라벨) ────────────────────
  function renderTimeline(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt timeline: 노드 2개 이상 필요'); return; }
    var N=items.length;
    var nodeW=212, nodeH=112, segW=Math.max(nodeW+44,252), axisGap=72, padX=32, padY=26;
    var W=padX*2+nodeW+(N-1)*segW, H=padY*2+nodeH*2+axisGap;
    var axisY=padY+nodeH+axisGap/2;
    var svg=mkSvg(el,W,H,'ha-timeline-svg');
    svg.append('line').attr('x1',padX).attr('y1',axisY).attr('x2',W-padX-18).attr('y2',axisY)
      .attr('style','stroke:var(--htmlart-accent,#2b8a9d);stroke-width:7;stroke-linecap:round');
    svg.append('polygon')
      .attr('points',(W-padX)+','+axisY+' '+(W-padX-26)+','+(axisY-15)+' '+(W-padX-26)+','+(axisY+15))
      .attr('style','fill:var(--htmlart-accent,#2b8a9d)');
    d3.range(N).forEach(function(i){
      var mx=padX+nodeW/2+i*segW, up=(i%2===0);
      var boxY=up?padY:(padY+nodeH+axisGap);
      svg.append('line').attr('x1',mx).attr('y1',axisY)
        .attr('x2',mx).attr('y2',up?(boxY+nodeH):boxY)
        .attr('style','stroke:var(--htmlart-box-border,rgba(0,0,0,.3));stroke-width:3');
      svg.append('circle').attr('cx',mx).attr('cy',axisY).attr('r',16)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);stroke:#fff;stroke-width:4');
      nodeBox(svg, mx-nodeW/2, boxY, nodeW, nodeH, items[i].title, items[i].subs, false);
    });
  }

  // ── venn — 겹친 원 (2·3개 정형 배치, 4개+ 선형 벤) ──────────────────────
  function renderVenn(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt venn: 원 2개 이상 필요'); return; }
    var N=items.length, R=182, W, H, centers=[];
    if(N===2){
      W=R*3.0; H=R*2.2; centers=[[R,H/2],[R*2.0,H/2]];
    } else if(N===3){
      W=R*3.24; H=R*3.04; var cv=W/2;
      centers=[[cv,R*1.04],[cv-R*0.62,R*1.96],[cv+R*0.62,R*1.96]];
    } else {
      var ov=R*0.66; W=R*2+(N-1)*ov+R*0.2; H=R*2.2;
      for(var i=0;i<N;i++)centers.push([R+R*0.1+i*ov,H/2]);
    }
    var svg=mkSvg(el,W,H,'ha-venn-svg');
    centers.forEach(function(c){
      svg.append('circle').attr('cx',c[0]).attr('cy',c[1]).attr('r',R)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);fill-opacity:.4;'
          +'stroke:var(--htmlart-accent,#2b8a9d);stroke-width:3');
    });
    var gx=0,gy=0; centers.forEach(function(c){gx+=c[0];gy+=c[1];}); gx/=N; gy/=N;
    centers.forEach(function(c,i){
      var dx=c[0]-gx, dy=c[1]-gy, d=Math.hypot(dx,dy)||1;
      var lx=c[0]+dx/d*R*0.46, ly=c[1]+dy/d*R*0.46;
      centerLabel(svg, lx-R*0.72, ly-48, R*1.44, 96, items[i].title, items[i].subs, 'inherit', 28, 18);
    });
  }

  // ── matrix — 2×2 사분면 격자 (4항목, 부족 시 빈칸·초과 시 절단) ─────────
  function renderMatrix(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt matrix: 항목 1개 이상 필요'); return; }
    var q=items.slice(0,4);
    while(q.length<4)q.push({title:'',subs:[]});
    var cell=320, gap=22, pad=26, W=pad*2+cell*2+gap, H=W, mid=pad+cell+gap/2;
    var svg=mkSvg(el,W,H,'ha-matrix-svg');
    svg.append('line').attr('x1',mid).attr('y1',pad-10).attr('x2',mid).attr('y2',H-pad+10)
      .attr('style','stroke:var(--htmlart-accent,#2b8a9d);stroke-width:4');
    svg.append('line').attr('x1',pad-10).attr('y1',mid).attr('x2',W-pad+10).attr('y2',mid)
      .attr('style','stroke:var(--htmlart-accent,#2b8a9d);stroke-width:4');
    [[pad,pad],[pad+cell+gap,pad],[pad,pad+cell+gap],[pad+cell+gap,pad+cell+gap]]
      .forEach(function(p,i){
        nodeBox(svg, p[0], p[1], cell, cell, q[i].title, q[i].subs, false);
      });
  }

  // ── target — 동심원 (바깥→안 = 작성 순서, 포함·점층 관계) ───────────────
  function renderTarget(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt target: 항목 1개 이상 필요'); return; }
    var N=items.length, maxR=304, W=maxR*2+120, H=maxR*2+56, cx=W/2, cy=maxR+28;
    var svg=mkSvg(el,W,H,'ha-target-svg');
    d3.range(N).forEach(function(i){
      svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',maxR*(N-i)/N)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);fill-opacity:'
          +(0.3+0.5*i/Math.max(N-1,1))+';stroke:#fff;stroke-width:3');
    });
    d3.range(N).forEach(function(i){
      var rOut=maxR*(N-i)/N, rIn=maxR*(N-i-1)/N, ly=cy-(rOut+rIn)/2;
      svg.append('text').attr('x',cx).attr('y',ly+9).attr('text-anchor','middle')
        .attr('style','font-size:25px;font-weight:700;fill:var(--htmlart-fg,#fff)')
        .text(items[i].title);
    });
  }

  // ── funnel — 깔때기 (위 넓고 아래 좁아짐) + 우측 상세 패널 ───────────────
  function renderFunnel(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt funnel: 층 2개 이상 필요'); return; }
    var N=items.length;
    var hasPanel=items.some(function(it){return it.subs.length;});
    var bandH=88, gap=8, padT=16;
    var H=padT*2+N*bandH+(N-1)*gap;
    var funX=30, funMaxW=460, funCx=funX+funMaxW/2;
    var panelX=funX+funMaxW+36, panelW=270;
    var W=hasPanel ? (panelX+panelW+30) : (funX*2+funMaxW);
    var svg=mkSvg(el,W,H,'ha-funnel-svg');
    var wScale=d3.scaleLinear().domain([0,N]).range([funMaxW*0.16,funMaxW]);
    d3.range(N).forEach(function(i){
      var y0=padT+i*(bandH+gap), y1=y0+bandH;
      var tw=wScale(N-i), bw=wScale(N-i-1);
      var pts=[
        (funCx-tw/2)+','+y0, (funCx+tw/2)+','+y0,
        (funCx+bw/2)+','+y1, (funCx-bw/2)+','+y1
      ].join(' ');
      svg.append('polygon').attr('points',pts)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);fill-opacity:'
          +(0.58+0.4*i/Math.max(N-1,1))+';stroke:#fff;stroke-width:2');
      svg.append('text').attr('x',funCx).attr('y',y0+bandH/2+7).attr('text-anchor','middle')
        .attr('style','font-size:21px;font-weight:700;fill:var(--htmlart-fg,#fff)')
        .text(items[i].title);
      if(hasPanel&&items[i].subs.length)
        nodeBox(svg, panelX, y0, panelW, bandH, '', items[i].subs, false);
    });
  }

  // ── gear — 맞물린 톱니바퀴 체인 (상하 교대 배치로 메시 느낌) ─────────────
  function renderGear(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt gear: 항목 1개 이상 필요'); return; }
    var N=items.length, R=158, ov=R*1.58, pad=30, vOff=R*0.32;
    var W=pad*2+R*2+(N-1)*ov, H=pad*2+R*2+vOff*2;
    var svg=mkSvg(el,W,H,'ha-gear-svg');
    d3.range(N).forEach(function(i){
      var cx=pad+R+i*ov, cy=H/2+(i%2?vOff:-vOff);
      svg.append('path').attr('d',gearPath(cx,cy,R,12))
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);fill-opacity:'
          +(i%2?0.95:0.78)+';stroke:#fff;stroke-width:2');
      svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',R*0.6)
        .attr('style','fill:var(--htmlart-surface,#f4f4f5);stroke:#fff;stroke-width:3');
      centerLabel(svg, cx-R*0.56, cy-R*0.56, R*1.12, R*1.12,
        items[i].title, items[i].subs, 'inherit', 23, 16);
    });
  }

  // ── radial — 중심 허브 + 방사형 스포크 (연결선) ─────────────────────────
  function renderRadial(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt radial: 중심+스포크 2개 이상 필요'); return; }
    var center=items[0], spokes=items.slice(1), M=spokes.length;
    var nodeW=204, nodeH=102, Rr=274, cW=240, cH=124;
    var cx=Rr+nodeW/2+30, cy=Rr+nodeH/2+30, W=cx*2, H=cy*2, step=2*Math.PI/M;
    var svg=mkSvg(el,W,H,'ha-radial-svg');
    var gL=svg.append('g');
    d3.range(M).forEach(function(i){
      var pos=d3.pointRadial(i*step,Rr);
      gL.append('line').attr('x1',cx).attr('y1',cy)
        .attr('x2',cx+pos[0]).attr('y2',cy+pos[1])
        .attr('style','stroke:var(--htmlart-box-border,rgba(0,0,0,.3));stroke-width:4');
    });
    var gN=svg.append('g');
    d3.range(M).forEach(function(i){
      var pos=d3.pointRadial(i*step,Rr);
      nodeBox(gN, cx+pos[0]-nodeW/2, cy+pos[1]-nodeH/2, nodeW, nodeH,
        spokes[i].title, spokes[i].subs, false);
    });
    nodeBox(svg, cx-cW/2, cy-cH/2, cW, cH, center.title, center.subs, true);
  }

  // ── chevron — 맞물린 갈매기형 화살표 체인 ───────────────────────────────
  function renderChevron(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt chevron: 단계 1개 이상 필요'); return; }
    var N=items.length;
    var chW=290, chH=204, tip=chH*0.4, padX=20, padY=30;
    var W=padX*2+N*chW-(N-1)*tip, H=padY*2+chH;
    var svg=mkSvg(el,W,H,'ha-chevron-svg');
    d3.range(N).forEach(function(i){
      var x=padX+i*(chW-tip), notch=(i===0)?0:tip;
      var pts=[
        x+','+padY,
        (x+chW-tip)+','+padY,
        (x+chW)+','+(padY+chH/2),
        (x+chW-tip)+','+(padY+chH),
        x+','+(padY+chH),
        (x+notch)+','+(padY+chH/2)
      ].join(' ');
      svg.append('polygon').attr('points',pts)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);fill-opacity:'
          +(0.6+0.4*i/Math.max(N-1,1))+';stroke:#fff;stroke-width:2');
      centerLabel(svg, x+notch, padY, chW-tip-notch, chH,
        items[i].title, items[i].subs, 'var(--htmlart-fg,#fff)', 29, 19);
    });
  }

  // ── step — 계단형 단계 (좌하 → 우상 상승) + 라이저 연결선 ────────────────
  function renderStep(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt step: 단계 1개 이상 필요'); return; }
    var N=items.length;
    var boxW=254, boxH=118, stepX=boxW*0.74, stepY=boxH*1.06, padX=26, padY=26;
    var W=padX*2+(N-1)*stepX+boxW, H=padY*2+(N-1)*stepY+boxH;
    var svg=mkSvg(el,W,H,'ha-step-svg');
    function bx(i){ return padX+i*stepX; }
    function by(i){ return H-padY-boxH-i*stepY; }
    var gC=svg.append('g');
    d3.range(N-1).forEach(function(i){
      var x1=bx(i)+boxW, y1=by(i)+boxH*0.5, x2=bx(i+1), y2=by(i+1)+boxH*0.5;
      gC.append('path').attr('d','M'+x1+' '+y1+'L'+x2+' '+y1+'L'+x2+' '+y2)
        .attr('style','fill:none;stroke:var(--htmlart-box-border,rgba(0,0,0,.3));stroke-width:4');
    });
    d3.range(N).forEach(function(i){
      nodeBox(svg, bx(i), by(i), boxW, boxH, items[i].title, items[i].subs, i===N-1);
    });
  }

  // ── arrow — 수렴 화살표 (방사형 소스 → 중심 허브로 굵은 화살표) ──────────
  function renderArrow(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt arrow: 중심+화살표 2개 이상 필요'); return; }
    var center=items[0], srcs=items.slice(1), M=srcs.length;
    var nodeW=210, nodeH=104, Rr=330, cW=244, cH=130;
    var cx=Rr+nodeW/2+40, cy=Rr+nodeH/2+40, W=cx*2, H=cy*2, step=2*Math.PI/M;
    var svg=mkSvg(el,W,H,'ha-arrow-svg');
    svg.append('defs').append('marker')
      .attr('id','ha-arr-head').attr('viewBox','0 0 10 10')
      .attr('refX',8).attr('refY',5).attr('markerUnits','userSpaceOnUse')
      .attr('markerWidth',46).attr('markerHeight',46).attr('orient','auto').attr('overflow','visible')
      .append('path').attr('d','M0 0L10 5L0 10z')
      .attr('style','fill:var(--htmlart-accent,#2b8a9d)');
    // Issue205: 사각형 중심→edge 거리(방향 인식). 기존엔 방향 무관하게 nodeH·cH(높이)만
    //   써서 가로(좌·우) 노드는 화살표 끝·머리가 박스 안에 묻혀 안 보였다.
    function rectEdge(ux,uy,hw,hh){
      return 1/Math.max(Math.abs(ux)/hw, Math.abs(uy)/hh);
    }
    var arrGap=10;
    d3.range(M).forEach(function(i){
      var pos=d3.pointRadial(i*step,Rr), nx=cx+pos[0], ny=cy+pos[1];
      var dx=cx-nx, dy=cy-ny, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d;
      var nE=rectEdge(ux,uy,nodeW/2,nodeH/2)+arrGap, cE=rectEdge(ux,uy,cW/2,cH/2)+arrGap;
      svg.append('line')
        .attr('x1',nx+ux*nE).attr('y1',ny+uy*nE)
        .attr('x2',cx-ux*cE).attr('y2',cy-uy*cE)
        .attr('style','stroke:var(--htmlart-accent,#2b8a9d);stroke-width:13;stroke-linecap:round')
        .attr('marker-end','url(#ha-arr-head)');
    });
    d3.range(M).forEach(function(i){
      var pos=d3.pointRadial(i*step,Rr);
      nodeBox(svg, cx+pos[0]-nodeW/2, cy+pos[1]-nodeH/2, nodeW, nodeH,
        srcs[i].title, srcs[i].subs, false);
    });
    nodeBox(svg, cx-cW/2, cy-cH/2, cW, cH, center.title, center.subs, true);
  }

  // ── v3 list 타입군 헬퍼 (Issue204) ─────────────────────────────────────
  // flat-top 육각형 꼭짓점 — 중심(cx,cy)·반지름 R. 폭 R*√3, 높이 2R.
  function hexPts(cx,cy,R){
    var p=[];
    for(var k=0;k<6;k++){
      var a=Math.PI/180*(60*k-30);
      p.push((cx+Math.cos(a)*R).toFixed(1)+','+(cy+Math.sin(a)*R).toFixed(1));
    }
    return p.join(' ');
  }
  // 중괄호 path — apexX(왼쪽 뾰족점) ← armX(오른쪽 두 팔). stroke 전용.
  function bracePath(apexX,armX,y0,y1){
    var mid=(y0+y1)/2, kx=(armX+apexX)/2;
    return 'M'+armX+' '+y0
      +'Q'+kx+' '+y0+' '+kx+' '+((y0+mid)/2)
      +'Q'+kx+' '+mid+' '+apexX+' '+mid
      +'Q'+kx+' '+mid+' '+kx+' '+((mid+y1)/2)
      +'Q'+kx+' '+y1+' '+armX+' '+y1;
  }

  // ── numbered — 번호 카드 세로 리스트 (좌측 원형 번호 배지) ───────────────
  function renderNumbered(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt numbered: 항목 1개 이상 필요'); return; }
    var N=items.length;
    var badge=92, gap=24, cardW=640, cardH=134, padX=22, padY=22, rowGap=18;
    var W=padX*2+badge+gap+cardW, H=padY*2+N*cardH+(N-1)*rowGap;
    var svg=mkSvg(el,W,H,'ha-numbered-svg');
    d3.range(N).forEach(function(i){
      var y=padY+i*(cardH+rowGap), cy=y+cardH/2;
      nodeBox(svg, padX+badge+gap, y, cardW, cardH, items[i].title, items[i].subs, false);
      svg.append('circle').attr('cx',padX+badge/2).attr('cy',cy).attr('r',badge/2)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);stroke:#fff;stroke-width:3');
      svg.append('text').attr('x',padX+badge/2).attr('y',cy+badge*0.19)
        .attr('text-anchor','middle')
        .attr('style','font-size:'+Math.round(badge*0.5)+'px;font-weight:800;'
          +'fill:var(--htmlart-fg,#fff)')
        .text(i+1);
    });
  }

  // ── hexagon — 육각형 노드 상하 교대(zigzag) 가로 배치 + 커넥터 ───────────
  function renderHexagon(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt hexagon: 항목 1개 이상 필요'); return; }
    var N=items.length, R=150, vOff=R*0.52, padX=28, padY=28;
    var hexW=R*Math.sqrt(3), stepX=hexW*0.92;
    var W=padX*2+hexW+(N-1)*stepX, H=padY*2+2*R+2*vOff;
    var svg=mkSvg(el,W,H,'ha-hexagon-svg');
    var gC=svg.append('g');
    d3.range(N-1).forEach(function(i){
      var cx=padX+hexW/2+i*stepX, cy=H/2+(i%2?vOff:-vOff);
      var nx=padX+hexW/2+(i+1)*stepX, ny=H/2+((i+1)%2?vOff:-vOff);
      gC.append('line').attr('x1',cx).attr('y1',cy).attr('x2',nx).attr('y2',ny)
        .attr('style','stroke:var(--htmlart-box-border,rgba(0,0,0,.3));stroke-width:5');
    });
    d3.range(N).forEach(function(i){
      var cx=padX+hexW/2+i*stepX, cy=H/2+(i%2?vOff:-vOff);
      svg.append('polygon').attr('points',hexPts(cx,cy,R))
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);fill-opacity:'
          +(i%2?0.95:0.78)+';stroke:#fff;stroke-width:3');
      centerLabel(svg, cx-R*0.74, cy-R*0.6, R*1.48, R*1.2,
        items[i].title, items[i].subs, 'var(--htmlart-fg,#fff)', 25, 17);
    });
  }

  // ── bracket — 그룹 라벨 + 중괄호 + 멤버 박스 세로열 (2단 입력) ───────────
  function renderBracket(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var groups=collectItems(ul);
    if(!groups.length){ errBox(el,'htmlArt bracket: 그룹 1개 이상 필요'); return; }
    var labelW=250, brZone=70, memberW=440, memberH=82, memGap=12, grpGap=36, padX=24, padY=24;
    var rowH=groups.map(function(g){
      var m=g.subs.length;
      return m>0 ? m*memberH+(m-1)*memGap : memberH;
    });
    var H=padY*2+rowH.reduce(function(a,b){return a+b;},0)+(groups.length-1)*grpGap;
    var W=padX*2+labelW+brZone+memberW;
    var svg=mkSvg(el,W,H,'ha-bracket-svg');
    var y=padY;
    groups.forEach(function(g,gi){
      var grpH=rowH[gi];
      nodeBox(svg, padX, y+grpH/2-memberH/2, labelW, memberH, g.title, [], true);
      if(g.subs.length){
        svg.append('path').attr('d',bracePath(padX+labelW+6,padX+labelW+brZone,y+4,y+grpH-4))
          .attr('style','fill:none;stroke:var(--htmlart-accent,#2b8a9d);stroke-width:5');
        var mx=padX+labelW+brZone+8;
        g.subs.forEach(function(m,mi){
          nodeBox(svg, mx, y+mi*(memberH+memGap), memberW-8, memberH, m, [], false);
        });
      }
      y+=grpH+grpGap;
    });
  }

  // ── block — 좌측 색 악센트 바 + 세로 적층 블록 (단일 컬럼) ────────────────
  function renderBlock(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt block: 항목 1개 이상 필요'); return; }
    var N=items.length;
    var accentW=24, blockW=740, blockH=124, gap=16, padX=22, padY=22;
    var W=padX*2+blockW, H=padY*2+N*blockH+(N-1)*gap;
    var svg=mkSvg(el,W,H,'ha-block-svg');
    d3.range(N).forEach(function(i){
      var y=padY+i*(blockH+gap);
      nodeBox(svg, padX, y, blockW, blockH, items[i].title, items[i].subs, false);
      svg.append('rect').attr('x',padX+2).attr('y',y+2)
        .attr('width',accentW).attr('height',blockH-4).attr('rx',5)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d)');
    });
  }

  // ── tab — 폴더 탭 헤더 + 항목 패널 (전 탭 펼침, 2단 입력) ─────────────────
  function renderTab(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var groups=collectItems(ul);
    if(!groups.length){ errBox(el,'htmlArt tab: 탭 1개 이상 필요'); return; }
    var tabW=300, tabH=66, itemH=74, itemGap=8, panelPad=14, grpGap=28, padX=24, padY=22;
    var panelW=740;
    var rowH=groups.map(function(g){
      var m=Math.max(g.subs.length,1);
      return tabH+panelPad*2+m*itemH+(m-1)*itemGap;
    });
    var H=padY*2+rowH.reduce(function(a,b){return a+b;},0)+(groups.length-1)*grpGap;
    var W=padX*2+panelW;
    var svg=mkSvg(el,W,H,'ha-tab-svg');
    var y=padY;
    groups.forEach(function(g,gi){
      var grpH=rowH[gi];
      var th='M'+padX+' '+(y+tabH)
        +'L'+padX+' '+(y+14)+'Q'+padX+' '+y+' '+(padX+14)+' '+y
        +'L'+(padX+tabW-22)+' '+y+'Q'+(padX+tabW)+' '+y+' '+(padX+tabW+12)+' '+(y+tabH)
        +'Z';
      var panelY=y+tabH, panelH=grpH-tabH;
      svg.append('rect').attr('x',padX).attr('y',panelY)
        .attr('width',panelW).attr('height',panelH).attr('rx',8)
        .attr('style','fill:var(--htmlart-surface,#f4f4f5);'
          +'stroke:var(--htmlart-accent,#2b8a9d);stroke-width:3');
      svg.append('path').attr('d',th)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d)');
      svg.append('text').attr('x',padX+tabW/2).attr('y',y+tabH*0.63)
        .attr('text-anchor','middle')
        .attr('style','font-size:26px;font-weight:700;fill:var(--htmlart-fg,#fff)')
        .text(g.title);
      g.subs.forEach(function(it,ii){
        nodeBox(svg, padX+panelPad, panelY+panelPad+ii*(itemH+itemGap),
          panelW-panelPad*2, itemH, it, [], false);
      });
      y+=grpH+grpGap;
    });
  }

  // ── pie — 부채꼴 분할 (비율 시각화) ────────────────────────────────────
  //   입력: 최상위 항목 = 조각. 라벨 끝 'N%' 또는 'N' 토큰을 비율로 파싱.
  //   비율 없으면 균등 분할. 합이 100 아니면 정규화. subs 는 라벨 보조 설명.
  function renderPie(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt pie: 조각 2개 이상 필요'); return; }
    // 라벨 끝 'N%' 또는 ' N' 숫자 토큰 추출 → {label, value}
    var slices=items.map(function(it){
      var m=it.title.match(/^(.*?)\\s+([0-9]+(?:\\.[0-9]+)?)%?\\s*$/);
      if(m){
        return {label:m[1].trim(), value:parseFloat(m[2]), subs:it.subs};
      }
      return {label:it.title, value:null, subs:it.subs};
    });
    var hasValue=slices.some(function(s){return s.value!=null;});
    if(!hasValue){
      slices.forEach(function(s){s.value=1;});             // 균등 분할
    } else {
      // 값 누락 항목은 0 으로 — 0% 조각은 안 보이지만 라벨은 옆에 출력
      slices.forEach(function(s){if(s.value==null)s.value=0;});
    }
    var total=slices.reduce(function(a,s){return a+s.value;},0)||1;
    var R=260, padX=40, padY=40;
    // Issue210: 범례 패널은 subs 유무 무관 항상 표시 (라벨+% 가 필수 정보)
    var hasPanel=slices.some(function(s){return s.subs.length;});
    var panelW=320, panelGap=44;
    var W=padX*2+R*2+panelGap+panelW, H=padY*2+R*2;
    var cx=padX+R, cy=padY+R;
    var svg=mkSvg(el,W,H,'ha-pie-svg');
    // Issue210: theme accent 무시 하드코딩 팔레트 제거 → m2 팔레트 6 슬롯 순환 + opacity 점층
    //   .accent-N 명시 시 단일 색 강제 (--htmlart-accent 사용), 그 외엔 균질형 정책(D4) — accent 1~6 순환
    var forced=el.style.getPropertyValue('--htmlart-accent').trim();  // .accent-N 시 채워짐
    // sliceColor(i) → 'fill:...;...' 형태로 반환 (style attribute 직접 prepend)
    function sliceColor(i){
      if(forced){
        // 단일 색 강제 — opacity 점층으로 조각 구별
        return 'fill:var(--htmlart-accent);fill-opacity:'+(0.4+0.55*(i/Math.max(slices.length-1,1)));
      }
      return 'fill:var(--m2-accent-'+((i%6)+1)+',var(--htmlart-accent,#2b8a9d))';
    }
    // 부채꼴 path — 0° = 12시 방향(상단), 시계방향 진행.
    function arcPath(a0, a1){
      var x0=cx+Math.sin(a0)*R, y0=cy-Math.cos(a0)*R;
      var x1=cx+Math.sin(a1)*R, y1=cy-Math.cos(a1)*R;
      var large=(a1-a0)>Math.PI?1:0;
      return 'M'+cx+' '+cy+'L'+x0.toFixed(2)+' '+y0.toFixed(2)
        +'A'+R+' '+R+' 0 '+large+' 1 '+x1.toFixed(2)+' '+y1.toFixed(2)+'Z';
    }
    var acc=0;
    slices.forEach(function(s,i){
      var frac=s.value/total;
      var a0=acc*2*Math.PI, a1=(acc+frac)*2*Math.PI;
      acc+=frac;
      if(s.value<=0)return;                                // 0 조각 skip
      svg.append('path').attr('d',arcPath(a0,a1))
        .attr('style',sliceColor(i)+';stroke:#fff;stroke-width:3');
      // 라벨 — 부채꼴 중심각 위치에 N% 표시
      var mid=(a0+a1)/2, lr=R*0.62;
      var lx=cx+Math.sin(mid)*lr, ly=cy-Math.cos(mid)*lr;
      var pct=Math.round(frac*1000)/10;
      svg.append('text').attr('x',lx).attr('y',ly+8).attr('text-anchor','middle')
        .attr('style','font-size:24px;font-weight:700;fill:#fff;'
          +'paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:3')
        .text(pct+'%');
    });
    // 우측 범례 — 라벨 + 색 칩 + (선택) 보조 설명
    var legX=padX+R*2+panelGap;
    if(hasPanel||true){
      var lH=Math.max(56, (R*2)/slices.length);
      slices.forEach(function(s,i){
        var ly=padY+i*lH;
        svg.append('rect').attr('x',legX).attr('y',ly+lH*0.18)
          .attr('width',26).attr('height',26).attr('rx',5)
          .attr('style',sliceColor(i));
        var pct=Math.round((s.value/total)*1000)/10;
        var lbl=s.label+(s.value>0?' ('+pct+'%)':'');
        centerLabel(svg, legX+38, ly, panelW-38, lH,
          lbl, s.subs, 'inherit', 20, 15);
      });
    }
  }

  // ── balance — 양팔 시소 (좌/우 2그룹 가중치 비교) ───────────────────────
  //   입력: 최상위 정확히 2개(좌·우). 각 그룹 하위 항목 수 또는 라벨 'N' 토큰을
  //   가중치로 해석 → 무거운 쪽 팔이 아래로 기울어진 SVG 시소.
  function renderBalance(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var groups=collectItems(ul);
    if(groups.length<2){ errBox(el,'htmlArt balance: 좌·우 2그룹 필요'); return; }
    var L=groups[0], R=groups[1];
    function weight(g){
      // 라벨 끝 'N' 토큰 우선, 없으면 하위 항목 수, 그도 없으면 1
      var m=g.title.match(/^(.*?)\\s+([0-9]+(?:\\.[0-9]+)?)\\s*$/);
      if(m){g._cleanTitle=m[1].trim(); return parseFloat(m[2]);}
      g._cleanTitle=g.title;
      return g.subs.length||1;
    }
    var lW=weight(L), rW=weight(R);
    var diff=lW-rW, maxDiff=Math.max(Math.abs(diff), 4);
    var tilt=Math.atan2(diff*22, 360)*0.9;                 // -0.4~0.4 rad 정도
    var W=820, H=460, cx=W/2, cyPivot=H-90;
    var armLen=320, plateW=240, plateH=78;
    var svg=mkSvg(el,W,H,'ha-balance-svg');
    // 받침대(삼각형)
    svg.append('polygon')
      .attr('points',(cx-70)+','+(H-30)+' '+(cx+70)+','+(H-30)+' '+cx+','+cyPivot)
      .attr('style','fill:var(--htmlart-accent,#2b8a9d)');
    // 바닥
    svg.append('line').attr('x1',60).attr('y1',H-30).attr('x2',W-60).attr('y2',H-30)
      .attr('style','stroke:var(--htmlart-box-border,rgba(0,0,0,.3));stroke-width:4');
    // 가로 팔 (회전)
    var arm=svg.append('g')
      .attr('transform','rotate('+(tilt*180/Math.PI)+' '+cx+' '+cyPivot+')');
    arm.append('rect').attr('x',cx-armLen).attr('y',cyPivot-12)
      .attr('width',armLen*2).attr('height',16).attr('rx',8)
      .attr('style','fill:var(--htmlart-accent,#2b8a9d)');
    // 좌·우 접시 + 라벨 박스
    function plate(side, w, group){
      var pCx=cx+side*armLen, pCy=cyPivot-8;
      arm.append('path')
        .attr('d','M'+(pCx-plateW/2)+' '+pCy+'L'+(pCx+plateW/2)+' '+pCy
          +'L'+(pCx+plateW/2-26)+' '+(pCy+28)+'L'+(pCx-plateW/2+26)+' '+(pCy+28)+'Z')
        .attr('style','fill:var(--htmlart-surface,#f4f4f5);'
          +'stroke:var(--htmlart-accent,#2b8a9d);stroke-width:3');
      // 가중치·라벨 박스 — 접시 위로 띄움
      var bx=pCx-plateW/2+10, by=pCy-plateH-14;
      arm.append('rect').attr('x',bx).attr('y',by)
        .attr('width',plateW-20).attr('height',plateH).attr('rx',10)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);stroke:#fff;stroke-width:3');
      var fo=arm.append('foreignObject').attr('x',bx).attr('y',by)
        .attr('width',plateW-20).attr('height',plateH);
      var sub=group.subs.length?'<div style="font-size:13px;opacity:.92;margin-top:2px;'
        +'word-break:keep-all">'+group.subs.map(esc).join(' · ')+'</div>':'';
      fo.append('xhtml:div').attr('style','width:100%;height:100%;display:flex;'
        +'flex-direction:column;align-items:center;justify-content:center;text-align:center;'
        +'color:var(--htmlart-fg,#fff);padding:0 8px;box-sizing:border-box;word-break:keep-all')
        .html('<div style="font-weight:800;font-size:22px;line-height:1.1">'+esc(group._cleanTitle)
          +' <span style="opacity:.85;font-weight:600">('+w+')</span></div>'+sub);
    }
    plate(-1, lW, L);
    plate( 1, rW, R);
  }

  // ── compare — 좌우 동등 비교 (Issue208) ───────────────────────────────
  //   입력: 최상위 정확히 2개(좌·우). 라벨 형식 \`**헤드라인** / 부제\`
  //   (헤드라인=강조, 부제=상단 작은 악센트 텍스트, /로 분리. 부제 생략 가능).
  //   하위 들여쓰기 = 각 그룹 bullet 본문 (2-7 항목 권장).
  //   렌더: 순수 HTML grid 2열 (d3 SVG 불필요) — 중앙 세로 구분선 + 좌·우 컬럼.
  //   balance 와 경계: balance=시소·무게 비대칭, compare=동등 병렬.
  function renderCompare(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var groups=collectItems(ul);
    if(groups.length<2){ errBox(el,'htmlArt compare: 좌·우 2그룹 필요'); return; }
    // 라벨 파싱: \`**헤드라인** / 부제\` 또는 \`헤드라인 / 부제\` 또는 \`헤드라인\`
    // nodeText 는 markdown 의 <strong> 을 제거하지 않고 그대로 텍스트로 반환하므로
    // 라벨 원문에서 \`**…**\` 와 \` / \` 모두 감지 가능.
    function parseLabel(raw){
      var head=raw, sub='';
      var slash=raw.indexOf('/');
      if(slash>=0){
        head=raw.slice(0,slash).trim();
        sub=raw.slice(slash+1).trim();
      }
      // 잔존 \`**…**\` 표식 제거 (강조 의미는 시각으로 표현)
      head=head.replace(/^\\*\\*(.+)\\*\\*$/, '$1').trim();
      return {head:head, sub:sub};
    }
    function escH(s){return esc(s);}
    var L=parseLabel(groups[0].title), R=parseLabel(groups[1].title);
    function colHtml(label, items, side){
      var subHtml=label.sub
        ? '<div class="htmlart-compare-sub" data-side="'+side+'">'+escH(label.sub)+'</div>'
        : '';
      var lis=items.map(function(t){return '<li>'+escH(t)+'</li>';}).join('');
      return '<div class="htmlart-compare-col" data-side="'+side+'">'
        + subHtml
        + '<div class="htmlart-compare-head" data-side="'+side+'">'+escH(label.head)+'</div>'
        + '<ul class="htmlart-compare-list">'+lis+'</ul>'
        + '</div>';
    }
    el.innerHTML='<div class="htmlart-compare-grid">'
      + colHtml(L, groups[0].subs, 'left')
      + '<div class="htmlart-compare-divider" aria-hidden="true"></div>'
      + colHtml(R, groups[1].subs, 'right')
      + '</div>';
  }

  // ── explain — 중앙 명제 + 사방 풀이 phrase + elbow line (Issue211) ────────
  // radial 변형: 박스 없이 텍스트만. 중앙은 큰 강조, 풀이는 짧은 phrase.
  // 라인은 중심 박스 가장자리에서 출발하여 phrase text 박스 가장자리에 정확히
  // 닿는다 (중심 텍스트 영역 침범 금지). M 짝수일 때 vertical(12·6시) 방향
  // 충돌 회피용 step/2 offset 적용.
  function renderExplain(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt explain: 중앙 명제 + 풀이 1개 이상 필요'); return; }
    var center=items[0], leaves=items.slice(1), M=leaves.length;
    var leafW=340, leafH=88, Rr=440, stubLen=32;
    var cW=620, cH=150;                              // 중심 박스 크기 (라인 출발 면)
    var ccHalfW=cW/2, ccHalfH=cH/2;
    var cx=Rr+leafW/2+40, cy=Rr+leafH/2+40, W=cx*2, H=cy*2;
    var step=2*Math.PI/M, halfW=leafW/2, halfH=leafH/2;
    // M 짝수일 때 12·6시 vertical 충돌 회피 — step/2 offset (첫 phrase가 vertical에서 비껴남)
    var angOffset = -Math.PI/2 + (M%2===0 ? step/2 : 0);
    var svg=mkSvg(el,W,H,'ha-explain-svg');
    var gL=svg.append('g');
    var gT=svg.append('g');
    d3.range(M).forEach(function(i){
      var ang=i*step + angOffset;
      var px=cx+Math.cos(ang)*Rr, py=cy+Math.sin(ang)*Rr;
      var dx=px-cx, dy=py-cy;
      // 라인 시작점 = 중심 박스 가장자리 (중심 텍스트 영역 침범 방지)
      //   ray (cx,cy)→(px,py) 가 중심 박스 가장자리와 만나는 점.
      //   |dx|*ccHalfH vs |dy|*ccHalfW 비교로 horizontal/vertical 면 결정.
      var startX, startY;
      if(Math.abs(dx)*ccHalfH >= Math.abs(dy)*ccHalfW){
        var sgnSX = dx>=0 ? 1 : -1;
        startX = cx + sgnSX*ccHalfW;
        startY = cy + dy * (ccHalfW / Math.abs(dx));
      } else {
        var sgnSY = dy>=0 ? 1 : -1;
        startX = cx + dx * (ccHalfH / Math.abs(dy));
        startY = cy + sgnSY*ccHalfH;
      }
      // 라인 종점 = phrase 박스 가장자리 (같은 알고리즘, 박스 크기만 다름)
      var horizDom = Math.abs(dx)*halfH >= Math.abs(dy)*halfW;
      var faceX, faceY, stubStartX, stubStartY, textAlign, textAlignCSS;
      if(horizDom){
        var sgnX = dx>=0 ? 1 : -1;
        faceX = px - sgnX*halfW;
        faceY = py;
        stubStartX = faceX - sgnX*stubLen;
        stubStartY = faceY;
        textAlign = sgnX>0 ? 'flex-start' : 'flex-end';
        textAlignCSS = sgnX>0 ? 'left' : 'right';
      } else {
        var sgnY = dy>=0 ? 1 : -1;
        faceX = px;
        faceY = py - sgnY*halfH;
        stubStartX = faceX;
        stubStartY = faceY - sgnY*stubLen;
        textAlign = 'center';
        textAlignCSS = 'center';
      }
      gL.append('path')
        .attr('d','M'+startX+' '+startY+' L'+stubStartX+' '+stubStartY+' L'+faceX+' '+faceY)
        .attr('style','fill:none;stroke:var(--htmlart-explain-line,var(--htmlart-accent,#2b8a9d));stroke-width:3;stroke-linecap:round;stroke-linejoin:round');
      var fo=gT.append('foreignObject')
        .attr('x',px-halfW).attr('y',py-halfH)
        .attr('width',leafW).attr('height',leafH);
      fo.append('xhtml:div')
        .attr('style','width:100%;height:100%;display:flex;align-items:center;'
          +'justify-content:'+textAlign+';'
          +'color:var(--htmlart-explain-leaf-fg,var(--htmlart-fg,inherit));'
          +'font-size:28px;font-weight:600;line-height:1.3;'
          +'text-align:'+textAlignCSS+';'
          +'word-break:keep-all;padding:0 12px;box-sizing:border-box;')
        .text(leaves[i].title);
    });
    // 중앙 명제 (박스 없음, 큰 강조)
    var centerFs=Math.min(72, Math.round(cW*0.10));
    var foC=svg.append('foreignObject')
      .attr('x',cx-cW/2).attr('y',cy-cH/2).attr('width',cW).attr('height',cH);
    foC.append('xhtml:div')
      .attr('style','width:100%;height:100%;display:flex;align-items:center;justify-content:center;'
        +'color:var(--htmlart-explain-center-fg,var(--htmlart-accent,#2b8a9d));'
        +'font-weight:800;font-size:'+centerFs+'px;line-height:1.2;text-align:center;'
        +'word-break:keep-all;padding:0 16px;box-sizing:border-box;')
      .text(center.title);
  }

  function render(){
    if(typeof d3==='undefined')return;            // d3 미로드 → ul 그대로(graceful degradation)
    document.querySelectorAll('div[data-htmlart]').forEach(function(el){
      if(el.getAttribute('data-htmlart-rendered'))return;
      var type=el.getAttribute('data-htmlart');
      var fn = type==='cycle'?renderCycle
             : type==='hierarchy'?renderHierarchy
             : type==='pyramid'?renderPyramid
             : type==='process'?renderProcess
             : type==='timeline'?renderTimeline
             : type==='venn'?renderVenn
             : type==='matrix'?renderMatrix
             : type==='target'?renderTarget
             : type==='funnel'?renderFunnel
             : type==='gear'?renderGear
             : type==='radial'?renderRadial
             : type==='chevron'?renderChevron
             : type==='step'?renderStep
             : type==='arrow'?renderArrow
             : type==='numbered'?renderNumbered
             : type==='hexagon'?renderHexagon
             : type==='bracket'?renderBracket
             : type==='block'?renderBlock
             : type==='tab'?renderTab
             : type==='pie'?renderPie
             : type==='balance'?renderBalance
             : type==='compare'?renderCompare
             : type==='explain'?renderExplain
             : null;
      if(!fn)return;                               // 미지원 타입 → 무시
      el.setAttribute('data-htmlart-rendered','1');
      try{
        fn(el);
        // Issue198: 렌더된 svg viewBox 비율을 컨테이너 aspect-ratio 로 부여.
        //   flex 부모(.contents-body)에선 flex:1 1 0 이 우선해 무시되고,
        //   비-flex 부모(columns 슬롯 .m2-col)에선 height 를 결정해
        //   svg height:100% 의 부모-높이 0 순환 붕괴를 방지한다.
        var svg=el.querySelector('svg');
        if(svg&&svg.getAttribute('viewBox')){
          var vb=svg.getAttribute('viewBox').split(/\\s+/);
          if(vb.length===4&&+vb[2]>0&&+vb[3]>0)el.style.aspectRatio=vb[2]+' / '+vb[3];
        }
      }
      catch(e){ el.innerHTML='<div class="component-error">htmlArt '+type+' 렌더 실패: '+e.message+'</div>'; }
    });
  }
  if(window.Reveal&&Reveal.on)Reveal.on('ready',render);
  else document.addEventListener('DOMContentLoaded',render);
})();
`.trim();

module.exports = { script };
