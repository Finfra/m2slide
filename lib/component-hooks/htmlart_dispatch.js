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
// 진행: cycle·hierarchy·pyramid·process 4타입 전부 d3 SVG 렌더 완료. theme
//   `_shared/components.css` 의 타입별 htmlArt CSS 블록은 전부 제거됨
//   (`.m2-htmlart` 공통 컨테이너 — CSS 변수·component-error 만 잔존).
//
// d3 API 사용:
//   - 공통: d3.select(DOM 구성) · d3.range(순회)
//   - cycle: d3.pointRadial(원형 좌표) · d3.path().arc(순환 곡선 화살표)
//   - hierarchy: d3.hierarchy + d3.tree(트리 레이아웃) · d3.linkVertical(연결선)
//   - pyramid: d3.scaleLinear(층 너비 비례)
//   - process: 가로 박스 체인 + 삼각 화살표 polygon
//   d3@7.9.0 는 html-builder.js 정적 블록이 무조건 로드. 색상은 .m2-htmlart 가
//   정의한 CSS 변수(--htmlart-accent 등)를 SVG 요소가 상속한다.
// 설계 SSOT: _doc_arch/htmlArt.md / 타입 카탈로그: data/htmlart/types.yml

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
  function nodeBox(parent, x, y, w, h, title, subs, accentBg){
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
    var subFs=Math.max(Math.round(titleFs*0.66), 12);
    box.append('xhtml:div')
      .attr('style','font-weight:700;font-size:'+titleFs+'px;line-height:1.2;'
        +'word-break:keep-all')      // 한글 어절 단위 줄바꿈 (글자 중간 끊김 방지)
      .text(title);
    if(subs&&subs.length){
      box.append('xhtml:div')
        .attr('style','font-weight:400;font-size:'+subFs+'px;line-height:1.25;'
          +'opacity:.85;margin-top:3px;word-break:keep-all')
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
    var gap=Math.min(step*0.30, 0.38);

    el.innerHTML='';
    var svg=d3.select(el).append('svg')
      .attr('viewBox','0 0 '+W+' '+H)
      .attr('class','ha-cycle-svg')
      .attr('style','width:100%;height:100%;max-height:92vh;display:block;margin:0 auto');

    // 순환 화살표 마커 — userSpaceOnUse(stroke-width 영향 제거)로 크기 명시 최대 확대.
    // overflow:visible — marker 뷰포트 클리핑 제거(어떤 크기에서도 화살촉 안 잘림).
    svg.append('defs').append('marker')
      .attr('id','ha-cyc-arrow').attr('viewBox','0 0 10 10')
      .attr('refX',6).attr('refY',5)
      .attr('markerUnits','userSpaceOnUse')
      .attr('markerWidth',58).attr('markerHeight',58).attr('orient','auto')
      .attr('overflow','visible')
      .append('path').attr('d','M0 0L10 5L0 10z')
      .attr('style','fill:var(--htmlart-arrow,rgba(0,0,0,.55))');

    var gArrows=svg.append('g');
    d3.range(N).forEach(function(i){
      var cA0=i*step-Math.PI/2+gap;
      var cA1=(i+1)*step-Math.PI/2-gap;
      var p=d3.path();
      p.arc(cx, cy, Rr, cA0, cA1);
      gArrows.append('path')
        .attr('d', p.toString())
        .attr('style','fill:none;stroke:var(--htmlart-arrow,rgba(0,0,0,.55));'
          +'stroke-width:10;stroke-linecap:round')
        .attr('marker-end','url(#ha-cyc-arrow)');
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
    var nodeW=152, nodeH=90;
    var tree=d3.tree().nodeSize([nodeW+44, nodeH+96]);
    tree(root);

    var nodes=root.descendants().filter(function(n){return !(n.data&&n.data._virtual);});
    var links=root.links().filter(function(l){return !(l.source.data&&l.source.data._virtual);});
    var xs=nodes.map(function(n){return n.x;}), ys=nodes.map(function(n){return n.y;});
    var minX=Math.min.apply(null,xs), maxX=Math.max.apply(null,xs);
    var minY=Math.min.apply(null,ys), maxY=Math.max.apply(null,ys);
    var pad=nodeW/2+24;
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
      nodeBox(gNodes, n.x+offX-nodeW/2, n.y+offY-nodeH/2, nodeW, nodeH,
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

    var gBands=svg.append('g');
    d3.range(N).forEach(function(i){
      var y0=padT+i*(bandH+gap), y1=y0+bandH;
      var tw=wScale(i), bw=wScale(i+1);
      var pts=[
        (pyrCx-tw/2)+','+y0, (pyrCx+tw/2)+','+y0,
        (pyrCx+bw/2)+','+y1, (pyrCx-bw/2)+','+y1
      ].join(' ');
      gBands.append('polygon')
        .attr('points', pts)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);stroke:#fff;stroke-width:2');
      gBands.append('text')
        .attr('x',pyrCx).attr('y',y0+bandH/2+7).attr('text-anchor','middle')
        .attr('style','font-size:21px;font-weight:700;fill:var(--htmlart-fg,#fff)')
        .text(items[i].title);
      if(hasPanel&&items[i].subs.length){
        nodeBox(svg, panelX, y0, panelW, bandH, items[i].title, items[i].subs, false);
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

  function render(){
    if(typeof d3==='undefined')return;            // d3 미로드 → ul 그대로(graceful degradation)
    document.querySelectorAll('div[data-htmlart]').forEach(function(el){
      if(el.getAttribute('data-htmlart-rendered'))return;
      var type=el.getAttribute('data-htmlart');
      var fn = type==='cycle'?renderCycle
             : type==='hierarchy'?renderHierarchy
             : type==='pyramid'?renderPyramid
             : type==='process'?renderProcess
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
