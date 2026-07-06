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

  // ── 폰트 크기 산정 헬퍼 ─────────────────────────────────────────────────
  // 글리프 폭 추정 — CJK(한글·한자·가나·전각)·이모지 ≈ 1.0em, 그 외 ≈ 0.58em.
  //   기존 일괄 0.58em 가정은 한글 토큰 폭을 과소평가(cap 과대)하고 영문 토큰과
  //   비대칭을 만들어 같은 체인 안에서 박스별 글자 크기가 들쭉날쭉해졌다.
  function charEm(ch){
    var cp=ch.codePointAt(0);
    if(cp>=0x1100&&(cp<=0x115F||(cp>=0x2E80&&cp<=0xA4CF)||(cp>=0xAC00&&cp<=0xD7A3)
      ||(cp>=0xF900&&cp<=0xFAFF)||(cp>=0xFE30&&cp<=0xFE4F)||(cp>=0xFF00&&cp<=0xFF60)
      ||cp>=0x1F000))return 1;
    return 0.58;
  }
  // 가장 넓은 토큰의 em 폭 (줄바꿈 불가 단위 기준 — width cap 산정용)
  function longestTokenEm(s){
    if(!s)return 0.58;
    var toks=String(s).split(/[\s·•\-_/|]+/).filter(Boolean);
    var m=0.58;
    toks.forEach(function(t){
      var w=0;
      Array.from(t).forEach(function(ch){w+=charEm(ch);});
      if(w>m)m=w;
    });
    return m;
  }
  // 단일 박스 title 폰트 크기 (nodeBox 내부 공식과 동일 — SSOT)
  function titleFsFor(title, w, h){
    var innerW=Math.max(w-32, 40);                // padding 12*2 + safety 8
    var widthCap=Math.floor(innerW/longestTokenEm(title));
    var fs=Math.min(Math.round(h*0.30), Math.round(w*0.21), 44, widthCap);
    return fs<10?10:fs;
  }
  // 같은 크기 형제 박스 체인의 균일 title 폰트 — 개별 계산값의 최솟값.
  //   박스마다 따로 fit 하면 짧은 라벨만 커져 일관성이 깨진다 (m2Slide 회귀).
  function uniformTitleFs(list, w, h){
    var fs=Infinity;
    list.forEach(function(it){
      var t=(typeof it==='string')?it:(it&&it.title);
      if(t)fs=Math.min(fs, titleFsFor(t, w, h));
    });
    return isFinite(fs)?fs:null;
  }

  // 노드 박스 foreignObject 헬퍼 — 제목 + 선택적 부제 행.
  //   titleFsOverride: 블록 단위 균일 폰트 강제 (uniformTitleFs 결과 전달).
  function nodeBox(parent, x, y, w, h, title, subs, accentBg, subFsOverride, titleFsOverride){
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
    // Issue217: 가장 긴 토큰(영문 단일 단어 등)이 박스 폭을 초과하여 clip 되는
    //   회귀 방지 — title/subs 양쪽에 token 폭 기반 width cap + overflow-wrap fallback.
    //   토큰 폭은 longestTokenEm(CJK 글리프 인지)으로 추정.
    var innerW=Math.max(w-32, 40);                // padding 12*2 + safety 8
    var titleFs=titleFsOverride||titleFsFor(title, w, h);
    // Issue201: title 없는 박스(pyramid 상세 패널)는 subs 가 본문이므로 크게.
    // Issue205: subFsOverride 전달 시 그 값을 강제 (pyramid 상세를 밴드 라벨보다 작게).
    var subFs=subFsOverride||Math.max(Math.round(titleFs*(title?0.66:0.92)), 12);
    // subs도 동일 width cap 적용 (긴 단일 단어 보호)
    if(subs && subs.length){
      var subTokEm=0.58;
      for(var si=0; si<subs.length; si++){ var L=longestTokenEm(subs[si]); if(L>subTokEm) subTokEm=L; }
      var subWidthCap=Math.floor(innerW/subTokEm);
      if(subFs>subWidthCap) subFs=Math.max(subWidthCap, 10);
    }
    if(title){
      box.append('xhtml:div')
        .attr('style','font-weight:700;font-size:'+titleFs+'px;line-height:1.2;'
          +'word-break:keep-all;overflow-wrap:anywhere')   // 한글 어절 단위 + 영문 long token fallback (Issue217)
        .text(title);
    }
    if(subs&&subs.length){
      box.append('xhtml:div')
        .attr('style','font-weight:400;font-size:'+subFs+'px;line-height:1.3;'
          +'word-break:keep-all;overflow-wrap:anywhere'+(title?';opacity:.85;margin-top:3px':''))
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
    //   Issue222: literal 문자 사용. `'\\u21BB'`는 raw 로드 시 6글자 텍스트로 출력되는 회귀.
    svg.append('text')
      .attr('x',cx).attr('y',cy).attr('text-anchor','middle')
      .attr('style','font-size:200px;dominant-baseline:central;'
        +'fill:var(--htmlart-accent,#2b8a9d);opacity:.38')
      .text('↻');

    var tFs=uniformTitleFs(items, nodeW, nodeH);
    var gNodes=svg.append('g');
    d3.range(N).forEach(function(i){
      var pos=d3.pointRadial(i*step, Rr);
      nodeBox(gNodes, cx+pos[0]-nodeW/2, cy+pos[1]-nodeH/2, nodeW, nodeH,
        items[i].title, items[i].subs, false, null, tFs);
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

    // 순차 단계 박스 — title 폰트는 체인 전체 균일 (박스별 개별 fit 금지)
    var tFs=uniformTitleFs(items, boxW, boxH);
    var gBoxes=svg.append('g');
    d3.range(N).forEach(function(i){
      nodeBox(gBoxes, i*(boxW+arrowGap), padY, boxW, boxH, items[i].title, items[i].subs, false, null, tFs);
    });
  }

  // ── bend_process — N단계 줄바꿈 serpentine 흐름 (Issue218) ─────────────
  //   행당 노드 수 자동 산출(N에 따라 1~4행) → 행별 좌↔우 교대 진행 →
  //   행 끝에서 ¼원 곡선으로 다음 행 우측 노드로 꺾어 내려감.
  //   비활성 단계: 라벨 끝 `~~` 또는 라벨 앞 `[off]`/`[비활성]` prefix 시 회색.
  //   하위 들여쓰기 = 다음 화살표 위에 표시되는 transition 라벨 (선택).
  function renderBendProcess(el){
    var ul=el.querySelector(':scope > ul');
    if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt bend_process: 단계 1개 이상 필요'); return; }
    var N=items.length;

    // 비활성·라벨 정규화 — items[i].title 검사 후 off 플래그 부여
    var steps=items.map(function(it){
      var title=it.title, off=false;
      var m=title.match(/^\s*\[(off|비활성|disabled)\]\s*(.+)$/i);
      if(m){ off=true; title=m[2]; }
      else if(/~~\s*$/.test(title)){ off=true; title=title.replace(/~~\s*$/,''); }
      return {title:title.trim(), subs:it.subs, off:off};
    });

    // 행당 노드 수 — 슬라이드 가로 영역 고려한 자동 산출
    //   5 이하 1행, 10 이하 2행, 15 이하 3행, 그 외 4행+ (행당 ≤6 권장).
    var perRow;
    if(N<=5)perRow=N;
    else if(N<=10)perRow=Math.ceil(N/2);
    else if(N<=15)perRow=Math.ceil(N/3);
    else perRow=Math.ceil(N/Math.ceil(N/6));
    var rows=Math.ceil(N/perRow);

    // 기하 파라미터 (viewBox 좌표)
    var nodeR=68, nodeGap=234, labelH=86, rowH=nodeR*2+labelH+72;
    var padX=nodeR+36, padY=nodeR+22;
    var bendArcR=Math.min(rowH/2-8, 96);   // 행 전환 ¼원 반지름

    var W=padX*2+(perRow-1)*nodeGap;
    var H=padY*2+(rows-1)*rowH+nodeR*2+labelH;

    var svg=mkSvg(el, W, H, 'ha-bend-process-svg');

    // 노드 좌표 계산 — 행별 좌→우 / 우→좌 교대 (serpentine)
    var pos=steps.map(function(_,i){
      var r=Math.floor(i/perRow);
      var c=i%perRow;
      var ltr=(r%2===0);                   // 짝수 행: 좌→우, 홀수 행: 우→좌
      var col=ltr?c:(perRow-1-c);
      return { cx:padX+col*nodeGap, cy:padY+r*rowH+nodeR, ltr:ltr };
    });

    var gLinks=svg.append('g'), gNodes=svg.append('g');

    // 노드 사이 연결 — 같은 행이면 직선, 행 끝이면 ¼원 곡선으로 다음 행
    d3.range(N-1).forEach(function(i){
      var a=pos[i], b=pos[i+1];
      var same=(Math.floor(i/perRow)===Math.floor((i+1)/perRow));
      var stroke='stroke:var(--htmlart-accent,#2b8a9d);stroke-width:5;stroke-linecap:round;fill:none';
      if(same){
        // 직선 — 노드 외곽에서 외곽까지
        var x1, x2;
        if(a.ltr){ x1=a.cx+nodeR; x2=b.cx-nodeR; }
        else     { x1=a.cx-nodeR; x2=b.cx+nodeR; }
        gLinks.append('line')
          .attr('x1',x1).attr('y1',a.cy).attr('x2',x2).attr('y2',b.cy)
          .attr('style',stroke);
        // transition 라벨 (sublevel 첫 줄) — 라인 위쪽 텍스트
        var lbl=(steps[i].subs&&steps[i].subs[0])||'';
        if(lbl){
          var mx=(x1+x2)/2;
          gLinks.append('text')
            .attr('x',mx).attr('y',a.cy-18).attr('text-anchor','middle')
            .attr('style','font-size:22px;font-weight:600;fill:var(--htmlart-accent,#2b8a9d)')
            .text(lbl);
        }
      } else {
        // 행 전환 — a(우측 끝)에서 오른쪽으로 짧게 + ¼원 + 짧게 + a 다음 행 우측 노드(b)로
        //   a.ltr=true (이번 행 좌→우 끝) → 오른쪽 끝에서 아래로 호 → b는 우측 끝(우→좌 시작)
        //   a.ltr=false (이번 행 우→좌 끝, 좌측 끝) → 왼쪽 끝에서 아래로 호 → b는 좌측 끝(좌→우 시작)
        var dir=a.ltr?1:-1;                // +1: 우측으로 휨, -1: 좌측으로 휨
        var startX=a.cx+dir*nodeR, startY=a.cy;
        var endX=b.cx+dir*nodeR, endY=b.cy;
        var arcCx=a.cx+dir*(nodeR+bendArcR);
        // path: M(start) L(arc start) A(arc) L(arc end) L(end)
        //   ¼원 = a.cy → b.cy, x: arcCx ± bendArcR
        var arcStartX=startX+dir*bendArcR-dir*bendArcR;   // = startX (호 시작은 start와 동일)
        // 단순화: M start → A radius (sweep 1 if dir>0) → L end-corner → L end
        var sweep=(dir>0)?1:0;
        var d='M'+startX+' '+startY
            +' L'+(startX+dir*bendArcR*0.0)+' '+startY
            +' A'+bendArcR+' '+bendArcR+' 0 0 '+sweep+' '+(startX+dir*bendArcR)+' '+(startY+bendArcR)
            +' L'+(endX+dir*bendArcR)+' '+(endY-bendArcR)
            +' A'+bendArcR+' '+bendArcR+' 0 0 '+sweep+' '+endX+' '+endY
            +' L'+endX+' '+endY;
        gLinks.append('path').attr('d',d).attr('style',stroke);
      }
    });

    // 노드 그리기 — 원 + 번호 + 라벨(원 아래)
    steps.forEach(function(s,i){
      var p=pos[i];
      var fill=s.off?'var(--htmlart-muted,#9aa0a6)':'var(--htmlart-accent,#2b8a9d)';
      var opacity=s.off?'0.55':'1';

      gNodes.append('circle')
        .attr('cx',p.cx).attr('cy',p.cy).attr('r',nodeR)
        .attr('style','fill:'+fill+';opacity:'+opacity);

      // 번호 (원 내부 중앙)
      gNodes.append('text')
        .attr('x',p.cx).attr('y',p.cy).attr('text-anchor','middle')
        .attr('dominant-baseline','central')
        .attr('style','font-size:'+Math.round(nodeR*0.78)+'px;font-weight:800;'
          +'fill:var(--htmlart-fg,#fff);opacity:'+opacity)
        .text(String(i+1));

      // 라벨 (원 아래 foreignObject — 한글 줄바꿈 안전)
      var labelW=Math.max(nodeGap-24, nodeR*2.4);
      var labelX=p.cx-labelW/2;
      var labelY=p.cy+nodeR+10;
      var fo=gNodes.append('foreignObject')
        .attr('x',labelX).attr('y',labelY).attr('width',labelW).attr('height',labelH);
      fo.append('xhtml:div')
        .attr('style','width:100%;height:100%;display:flex;align-items:flex-start;'
          +'justify-content:center;text-align:center;font-weight:700;'
          +'font-size:26px;line-height:1.25;color:inherit;'
          +'word-break:keep-all;padding:0 4px;box-sizing:border-box;'
          +'opacity:'+opacity)
        .text(s.title);
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
    var tFs=uniformTitleFs(items, nodeW, nodeH);
    d3.range(N).forEach(function(i){
      var mx=padX+nodeW/2+i*segW, up=(i%2===0);
      var boxY=up?padY:(padY+nodeH+axisGap);
      svg.append('line').attr('x1',mx).attr('y1',axisY)
        .attr('x2',mx).attr('y2',up?(boxY+nodeH):boxY)
        .attr('style','stroke:var(--htmlart-box-border,rgba(0,0,0,.3));stroke-width:3');
      svg.append('circle').attr('cx',mx).attr('cy',axisY).attr('r',16)
        .attr('style','fill:var(--htmlart-accent,#2b8a9d);stroke:#fff;stroke-width:4');
      nodeBox(svg, mx-nodeW/2, boxY, nodeW, nodeH, items[i].title, items[i].subs, false, null, tFs);
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
    var tFs=uniformTitleFs(q, cell, cell);
    [[pad,pad],[pad+cell+gap,pad],[pad,pad+cell+gap],[pad+cell+gap,pad+cell+gap]]
      .forEach(function(p,i){
        nodeBox(svg, p[0], p[1], cell, cell, q[i].title, q[i].subs, false, null, tFs);
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
    var tFs=uniformTitleFs(spokes, nodeW, nodeH);
    var gN=svg.append('g');
    d3.range(M).forEach(function(i){
      var pos=d3.pointRadial(i*step,Rr);
      nodeBox(gN, cx+pos[0]-nodeW/2, cy+pos[1]-nodeH/2, nodeW, nodeH,
        spokes[i].title, spokes[i].subs, false, null, tFs);
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
    var tFs=uniformTitleFs(items, boxW, boxH);
    d3.range(N).forEach(function(i){
      nodeBox(svg, bx(i), by(i), boxW, boxH, items[i].title, items[i].subs, i===N-1, null, tFs);
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
    var tFs=uniformTitleFs(srcs, nodeW, nodeH);
    d3.range(M).forEach(function(i){
      var pos=d3.pointRadial(i*step,Rr);
      nodeBox(svg, cx+pos[0]-nodeW/2, cy+pos[1]-nodeH/2, nodeW, nodeH,
        srcs[i].title, srcs[i].subs, false, null, tFs);
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
    var tFs=uniformTitleFs(items, cardW, cardH);
    d3.range(N).forEach(function(i){
      var y=padY+i*(cardH+rowGap), cy=y+cardH/2;
      nodeBox(svg, padX+badge+gap, y, cardW, cardH, items[i].title, items[i].subs, false, null, tFs);
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
    var labelFs=uniformTitleFs(groups, labelW, memberH);
    var allMembers=groups.reduce(function(a,g){return a.concat(g.subs);},[]);
    var memberFs=uniformTitleFs(allMembers, memberW-8, memberH);
    var y=padY;
    groups.forEach(function(g,gi){
      var grpH=rowH[gi];
      nodeBox(svg, padX, y+grpH/2-memberH/2, labelW, memberH, g.title, [], true, null, labelFs);
      if(g.subs.length){
        svg.append('path').attr('d',bracePath(padX+labelW+6,padX+labelW+brZone,y+4,y+grpH-4))
          .attr('style','fill:none;stroke:var(--htmlart-accent,#2b8a9d);stroke-width:5');
        var mx=padX+labelW+brZone+8;
        g.subs.forEach(function(m,mi){
          nodeBox(svg, mx, y+mi*(memberH+memGap), memberW-8, memberH, m, [], false, null, memberFs);
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
    var tFs=uniformTitleFs(items, blockW, blockH);
    d3.range(N).forEach(function(i){
      var y=padY+i*(blockH+gap);
      nodeBox(svg, padX, y, blockW, blockH, items[i].title, items[i].subs, false, null, tFs);
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
    var allItems=groups.reduce(function(a,g){return a.concat(g.subs);},[]);
    var itemFs=uniformTitleFs(allItems, panelW-panelPad*2, itemH);
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
          panelW-panelPad*2, itemH, it, [], false, null, itemFs);
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

  // ── workflow — 양 끝 사람 endcap + 중간 단계 박스 체인 (Issue209) ──────
  //   입력: 평면 리스트. 단계 N개.
  //   - N==1: 박스 1개 (endcap 없음 — process degraded)
  //   - N==2: 좌 사람 + 우 박스 (시작 인물 → 결과 단계)
  //   - N>=3: 좌 사람 + 중간 박스들 + 우 사람
  //   사람 SVG: 머리 원 + 라운드 사각 몸. 색은 --htmlart-accent 상속.
  //   process 와 다른 점: 양 끝 시각 강조 + endcap 라벨이 박스 아래 텍스트로.
  function renderWorkflow(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(!items.length){ errBox(el,'htmlArt workflow: 단계 1개 이상 필요'); return; }
    var N=items.length;
    var boxW=196, boxH=200, arrowGap=44, padY=28, padX=20;
    var personW=120, personH=200;
    // endcap 위치 판정
    var leftIsPerson = N>=2;
    var rightIsPerson = N>=3;
    var stepsCount = N - (leftIsPerson?1:0) - (rightIsPerson?1:0);
    // 전체 너비: 좌(person|box) + (중간 박스들 + 화살표) + 우(person|box)
    function unitW(isP){return isP?personW:boxW;}
    var W = padX*2;
    if(leftIsPerson) W += personW; else W += boxW;
    if(stepsCount>0) W += stepsCount*(boxW+arrowGap) + arrowGap; // 좌→첫박스 화살표 1개 + 박스마다 + 화살표
    if(rightIsPerson) W += personW + arrowGap; // 마지막박스→우 endcap
    else if(N>=2) W += boxW + arrowGap;
    // 단순화: 폭 재계산
    // 슬롯 N개 (각각 box 또는 person). 슬롯 사이마다 arrowGap.
    var slots=[];
    for(var k=0;k<N;k++){
      var isP = (k===0 && leftIsPerson) || (k===N-1 && rightIsPerson);
      slots.push({isPerson:isP, w: isP?personW:boxW, item:items[k]});
    }
    var totalW = padX*2 + slots.reduce(function(s,x){return s+x.w;},0) + (N-1)*arrowGap;
    var H = Math.max(boxH, personH) + padY*2;

    el.innerHTML='';
    var svg=d3.select(el).append('svg')
      .attr('viewBox','0 0 '+totalW+' '+H)
      .attr('class','ha-workflow-svg')
      .attr('style','width:100%;height:100%;max-height:92vh;display:block;margin:0 auto');

    // 화살표 (슬롯 사이)
    var gArrows=svg.append('g');
    var xCursor=padX;
    var slotX=[];
    slots.forEach(function(s){ slotX.push(xCursor); xCursor += s.w + arrowGap; });
    // arrow draw between slot i and i+1
    for(var i=0;i<N-1;i++){
      var ax = slotX[i] + slots[i].w + arrowGap/2;
      var ay = padY + Math.max(boxH,personH)/2;
      var pts=[(ax-13)+','+(ay-16),(ax+15)+','+ay,(ax-13)+','+(ay+16)].join(' ');
      gArrows.append('polygon').attr('points',pts)
        .attr('style','fill:var(--htmlart-arrow,rgba(0,0,0,.45))');
    }

    // 슬롯 렌더 — 표준 박스 title 폰트는 체인 균일
    var boxFs=uniformTitleFs(
      slots.filter(function(s){return !s.isPerson;}).map(function(s){return s.item;}),
      boxW, boxH);
    var gSlots=svg.append('g');
    slots.forEach(function(s, idx){
      var x = slotX[idx];
      var slotCy = padY + Math.max(boxH,personH)/2;
      if(s.isPerson){
        // 사람 SVG (머리 + 몸) 중앙 정렬
        var cx = x + personW/2;
        var headR = 30;
        var headCy = padY + 10 + headR;
        var bodyTop = headCy + headR + 6;
        var bodyH = 70;
        var bodyW = 80;
        gSlots.append('circle')
          .attr('cx', cx).attr('cy', headCy).attr('r', headR)
          .attr('style','fill:var(--htmlart-accent,#2b8a9d);stroke:none');
        // 몸: 라운드 사각 (위 살짝 좁고 아래 넓은 사다리꼴 효과 → 단순 라운드 rect)
        gSlots.append('rect')
          .attr('x', cx - bodyW/2).attr('y', bodyTop)
          .attr('width', bodyW).attr('height', bodyH)
          .attr('rx', bodyW/2).attr('ry', 16)
          .attr('style','fill:var(--htmlart-accent,#2b8a9d);stroke:none');
        // 라벨 (사람 아래)
        var labelY = bodyTop + bodyH + 8;
        var labelH = padY + personH - (labelY - padY);
        var labelFo = gSlots.append('foreignObject')
          .attr('x', x).attr('y', labelY)
          .attr('width', personW).attr('height', Math.max(labelH, 40));
        var labelText = s.item.title;
        var subText = (s.item.subs && s.item.subs.length) ? s.item.subs.join(' · ') : '';
        labelFo.append('xhtml:div')
          .attr('style','width:100%;height:100%;display:flex;flex-direction:column;'
            +'align-items:center;justify-content:flex-start;text-align:center;'
            +'font-weight:700;font-size:16px;line-height:1.2;'
            +'color:var(--htmlart-fg-on-bg,inherit);word-break:keep-all')
          .html('<div>'+esc(labelText)+'</div>'
            + (subText?'<div style="font-weight:400;font-size:13px;opacity:.78;margin-top:3px">'+esc(subText)+'</div>':''));
      } else {
        // 표준 박스 (process 박스와 동일)
        nodeBox(gSlots, x, padY, boxW, boxH, s.item.title, s.item.subs, false, null, boxFs);
      }
    });
  }

  // ── explain — 중앙 명제 + 좌·우 column phrase + elbow line (Issue211) ─────
  // 마인드맵 패턴: 중앙 박스 좌·우 면에서만 라인 출발 (위·아래 면 미사용 →
  // 중심 텍스트 영역 침범 0). phrase 는 좌·우 2 column 세로 배치, 라인은
  // horizontal stub → vertical drop → phrase 박스 좌·우 면 elbow.
  function renderExplain(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt explain: 중앙 명제 + 풀이 1개 이상 필요'); return; }
    var center=items[0], leaves=items.slice(1), M=leaves.length;
    var leafW=360, leafH=92;
    var cW=640, cH=160;
    var ccHalfW=cW/2;
    var gap=70;                     // 중심 박스 ↔ phrase column 간격
    var vSpacing=36;                // phrase 간 수직 간격
    var stubLen=26;                 // phrase 옆 horizontal stub

    // 좌·우 column 분할 — 우선 우측 (홀수 시 우측 +1)
    var rightCount=Math.ceil(M/2), leftCount=M-rightCount;
    var colHeight=function(n){ return n>0 ? n*leafH + (n-1)*vSpacing : 0; };
    var maxColH=Math.max(colHeight(leftCount), colHeight(rightCount));
    var contentH=Math.max(maxColH, cH);
    var padY=60, padX=40;
    var H=contentH + padY*2;
    var W=padX*2 + leafW + gap + cW + gap + leafW;
    var cx=W/2, cy=H/2;

    var svg=mkSvg(el,W,H,'ha-explain-svg');
    var gL=svg.append('g');
    var gT=svg.append('g');

    // phrase column 배치 helper — side: 'left'|'right'
    function colX(side){
      return side==='right' ? cx + ccHalfW + gap : cx - ccHalfW - gap - leafW;
    }
    function phraseY(n, idx){
      // n개 column 안에서 idx번째 phrase 박스 중심 y (cy 기준 수직 중앙 정렬)
      var topY = cy - colHeight(n)/2 + leafH/2;
      return topY + idx*(leafH + vSpacing);
    }

    function drawPhrase(leafIdx, n, idx, side){
      var px = colX(side) + leafW/2;
      var py = phraseY(n, idx);
      var right = side==='right';
      var startX = right ? cx + ccHalfW : cx - ccHalfW;
      var startY = cy;
      var faceX = right ? px - leafW/2 : px + leafW/2;
      var faceY = py;
      var elbowX = right ? faceX - stubLen : faceX + stubLen;
      // path: start → elbow corner @startY → elbow @faceY → face
      //   horizontal segment + vertical drop + short horizontal stub
      gL.append('path')
        .attr('d','M'+startX+' '+startY+' L'+elbowX+' '+startY+' L'+elbowX+' '+faceY+' L'+faceX+' '+faceY)
        .attr('style','fill:none;stroke:var(--htmlart-explain-line,var(--htmlart-accent,#2b8a9d));stroke-width:3;stroke-linecap:round;stroke-linejoin:round');
      var fo=gT.append('foreignObject')
        .attr('x',px-leafW/2).attr('y',py-leafH/2)
        .attr('width',leafW).attr('height',leafH);
      fo.append('xhtml:div')
        .attr('style','width:100%;height:100%;display:flex;align-items:center;'
          +'justify-content:'+(right?'flex-start':'flex-end')+';'
          +'color:var(--htmlart-explain-leaf-fg,var(--htmlart-fg,inherit));'
          +'font-size:28px;font-weight:600;line-height:1.3;'
          +'text-align:'+(right?'left':'right')+';'
          +'word-break:keep-all;padding:0 14px;box-sizing:border-box;')
        .text(leaves[leafIdx].title);
    }

    // 좌측 column: leaf 0..leftCount-1
    for(var i=0;i<leftCount;i++) drawPhrase(i, leftCount, i, 'left');
    // 우측 column: leaf leftCount..M-1
    for(var j=0;j<rightCount;j++) drawPhrase(leftCount+j, rightCount, j, 'right');

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

  // ── annotate — 원문 + 색 윗줄·밑줄 + 좌·우 라벨 (Issue213) ─────────────────
  // syntax B: target + over/under <color>: <span> → <label>
  //   foreignObject 원문 안에 span 마커 → getBoundingClientRect 측정 →
  //   SVG viewBox 좌표 변환 → 색 줄(over/under) + dashed elbow + 좌·우 라벨.
  function renderAnnotate(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var items=collectItems(ul);
    if(items.length<2){ errBox(el,'htmlArt annotate: target + 주석 1개 이상 필요'); return; }

    var target=null, annots=[];
    items.forEach(function(it){
      var t=it.title.trim();
      var mt=t.match(/^target\s*:\s*(.+)$/i);
      if(mt){ if(!target)target=mt[1].trim(); return; }
      var m=t.match(/^(over|under)\s+([a-zA-Z]+|#[0-9a-fA-F]{3,8})\s*:\s*(.+?)\s*(?:→|->)\s*(.+)$/i);
      if(m) annots.push({pos:m[1].toLowerCase(),color:m[2],span:m[3].trim(),label:m[4].trim()});
    });
    if(!target){ target=items[0].title.trim(); }
    if(!annots.length){ errBox(el,'htmlArt annotate: over/under 주석 필요'); return; }

    var W=1400, H=620, cx=W/2, cy=H/2;
    var targetFs=56;
    var labelW=300, labelH=52, labelGap=24;
    var colorMap={red:'#e74c3c',blue:'#3498db',green:'#27ae60',yellow:'#f1c40f',
                  orange:'#e67e22',purple:'#9b59b6',pink:'#e91e63',cyan:'#16a085',black:'#222'};
    function colorOf(c){ return colorMap[c.toLowerCase()] || c; }

    var svg=mkSvg(el,W,H,'ha-annotate-svg');

    // 마커로 span 위치 표시(STX/ETX) — span first-match 치환
    var markedTarget=target;
    annots.forEach(function(a,i){
      var sp=a.span;
      var p=markedTarget.indexOf(sp);
      if(p>=0){
        markedTarget=markedTarget.substring(0,p)
          +''+i+''+sp+''
          +markedTarget.substring(p+sp.length);
      }
    });
    var html=markedTarget.replace(/(\d+)([^]+)/g,
      function(m,i,s){ return '<span data-annot-idx="'+i+'" style="display:inline-block;">'+s+'</span>'; });

    var fo=svg.append('foreignObject')
      .attr('x',0).attr('y',cy-60).attr('width',W).attr('height',120);
    // 주의: 바깥 div 가 flex 면 내부 span 들이 flex item 으로 blockify 되어
    // (inline-block → block) 줄바꿈·측정이 깨짐. inner span 으로 한 번 감싸
    // 주석 span 들을 일반 inline 콘텐츠로 유지한다.
    fo.append('xhtml:div')
      .attr('style','width:100%;height:100%;display:flex;align-items:center;justify-content:center;'
        +'color:var(--htmlart-annotate-target-fg,var(--htmlart-accent,#2b8a9d));'
        +'font-weight:800;font-size:'+targetFs+'px;line-height:1.2;text-align:center;'
        +'word-break:keep-all;letter-spacing:0.02em;')
      .append('xhtml:span')
      .attr('style','display:inline;')
      .html(html);

    function drawLines(){
      var spans=el.querySelectorAll('[data-annot-idx]');
      var svgEl=svg.node();
      var svgRect=svgEl.getBoundingClientRect();
      if(spans.length===0||svgRect.width===0){ requestAnimationFrame(drawLines); return; }
      var sx2vb=W/svgRect.width, sy2vb=H/svgRect.height;

      var boxes=[];
      spans.forEach(function(s){
        var i=+s.getAttribute('data-annot-idx');
        var r=s.getBoundingClientRect();
        boxes.push({
          i:i, a:annots[i],
          x:(r.left-svgRect.left)*sx2vb,
          y:(r.top-svgRect.top)*sy2vb,
          w:r.width*sx2vb, h:r.height*sy2vb
        });
      });

      // span 가로 위치(x) 순으로 좌/우 균형 분할 — 왼쪽 절반 span 은 좌측 라벨,
      // 오른쪽 절반 span 은 우측 라벨. 라벨 세로 순서도 span x 순을 따라
      // 연결 곡선이 교차하지 않게 한다 (이전: x중점 기준 분할 → 불균형·교차).
      boxes.sort(function(a,b){ return (a.x+a.w/2) - (b.x+b.w/2); });
      var half=Math.ceil(boxes.length/2);
      var left=boxes.slice(0,half);
      var right=boxes.slice(half);

      function drawOne(b, side, sideIdx, sideN){
        var stroke=colorOf(b.a.color);
        var over=b.a.pos==='over';
        var lineY = over ? b.y - 10 : b.y + b.h + 10;

        // span 밑/위 강조 줄
        svg.append('line')
          .attr('x1',b.x).attr('y1',lineY)
          .attr('x2',b.x+b.w).attr('y2',lineY)
          .attr('stroke',stroke).attr('stroke-width',5).attr('stroke-linecap','round');

        var labelX = side==='left' ? 30 : W - 30 - labelW;
        var totalH = sideN*labelH + (sideN-1)*labelGap;
        var topY = cy - totalH/2;
        var labelY = topY + sideIdx*(labelH+labelGap);
        var midY = labelY + labelH/2;

        var spanEdgeX = side==='left' ? b.x : b.x + b.w;
        var labelEdgeX = side==='left' ? labelX + labelW : labelX;

        // bezier curve — span 줄 끝 → 라벨로 부드럽게 휘어짐
        // cubic S 곡선: 시작점 수평 진행 → 종점 수평 도착
        var dx = labelEdgeX - spanEdgeX;
        var c1x = spanEdgeX + dx * 0.45;
        var c1y = lineY;
        var c2x = labelEdgeX - dx * 0.45;
        var c2y = midY;
        svg.append('path')
          .attr('d','M'+spanEdgeX+' '+lineY
              +' C'+c1x+' '+c1y+', '+c2x+' '+c2y+', '+labelEdgeX+' '+midY)
          .attr('style','fill:none;stroke:'+stroke+';stroke-width:3;stroke-linecap:round;');

        // 라벨 — 단순 텍스트 (박스·border·배경 없음)
        var fol=svg.append('foreignObject')
          .attr('x',labelX).attr('y',labelY)
          .attr('width',labelW).attr('height',labelH);
        fol.append('xhtml:div')
          .attr('style','width:100%;height:100%;display:flex;align-items:center;'
            +'justify-content:'+(side==='left'?'flex-end':'flex-start')+';'
            +'padding:0 6px;font-size:24px;line-height:1.3;font-weight:600;'
            +'text-align:'+(side==='left'?'right':'left')+';'
            +'word-break:keep-all;box-sizing:border-box;'
            +'color:var(--htmlart-fg,inherit);')
          .text(b.a.label);
      }

      left.forEach(function(b,i){ drawOne(b,'left',i,left.length); });
      right.forEach(function(b,i){ drawOne(b,'right',i,right.length); });
    }
    requestAnimationFrame(function(){ requestAnimationFrame(drawLines); });
  }

  // ── callout — 중앙 hub + 다방향 callout arrow + 박스 없는 라벨 (Issue219) ─────
  // 첫 항목 = hub (아이콘 emoji 1자 자동 분리 + :fa-name: token <i> 우선 채택).
  // **bold** branch → accent-1(primary), 일반 → accent-2(secondary).
  // 라벨 안 ` | ` 또는 ` / ` → 태그 sep (가운데 옅은 vertical bar).
  // orientation: data-orientation = horizontal(기본) | vertical | fan.
  //
  // 배치 — 8방위 zone(N/NE/E/SE/S/SW/W/NW) 슬롯 사용:
  //   1) preset[N][orient] 으로 zone 시퀀스 선택 (N=branch 수)
  //   2) 각 zone 은 (anchorX, anchorY) + outward 방향(dx, dy) 정의
  //      anchor = 화살표 tip 위치(라벨 inner edge가 닿는 점)
  //   3) 라벨 box 는 anchor 에서 outward 로 펼쳐짐 — 충돌 없음 보장
  //   4) hub 박스 가장자리 → anchor 까지 화살표 그림 (직선 + arrow head)
  function renderCallout(el){
    var ul=el.querySelector(':scope > ul'); if(!ul)return;
    var liNodes=ul.querySelectorAll(':scope > li');
    if(liNodes.length<2){ errBox(el,'htmlArt callout: hub + branch 1개 이상 필요'); return; }
    var orient=el.getAttribute('data-orientation')||'horizontal';

    // hub 파싱 — fa <i> 우선(파서가 :fa-x:→<i> 변환 시) + emoji 1자 분리
    function parseHub(li){
      var clone=li.cloneNode(true);
      clone.querySelectorAll('ul,ol').forEach(function(n){n.remove();});
      var faI=clone.querySelector('i[class*="fa-"]');
      var iconHtml=null;
      if(faI){
        iconHtml='<i class="'+(faI.getAttribute('class')||'')+'" style="color:var(--htmlart-callout-icon,var(--m2-accent-2,#e91e63));"></i>';
        faI.remove();
      }
      var title=(clone.textContent||'').trim();
      if(!iconHtml){
        var m=title.match(/^([\u{1F300}-\u{1FBFF}\u{2600}-\u{27BF}]|[\uD800-\uDBFF][\uDC00-\uDFFF])\s+(.+)$/u);
        if(m){ iconHtml='<span style="color:var(--htmlart-callout-icon,var(--m2-accent-2,#e91e63));">'+esc(m[1])+'</span>'; title=m[2].trim(); }
      }
      return {iconHtml:iconHtml, title:title};
    }
    function parseBranch(li){
      var clone=li.cloneNode(true);
      clone.querySelectorAll('ul,ol').forEach(function(n){n.remove();});
      var raw=(clone.textContent||'').trim();
      var bold=false;
      var bm=raw.match(/^\*\*(.+?)\*\*$/);
      if(bm){ bold=true; raw=bm[1].trim(); }
      var tokens=null;
      if(/\s\|\s|\s\/\s/.test(raw)) tokens=raw.split(/\s[|\/]\s/).map(function(t){return t.trim();}).filter(Boolean);
      return {text:raw, tokens:tokens, bold:bold};
    }
    var hub=parseHub(liNodes[0]);
    var branches=[];
    for(var bi=1;bi<liNodes.length;bi++) branches.push(parseBranch(liNodes[bi]));
    var N=branches.length;

    // ── viewBox + hub 사이즈 ─────────────────────────────────────────
    var W=2000, H=1200, cx=W/2, cy=H/2;
    var hubW=920, hubH=210;
    var labelW=480, labelH=150;
    var hubFontSize=82;
    // fan: 세로 여유 큰 캔버스 + hub 를 하단에 두고 위로 부채꼴 → 큰 radius·stagger 로 라벨 겹침 방지
    if(orient==='fan'){ W=2200; H=1500; cx=W/2; cy=1180; }

    // ── 8 zone 슬롯 — (x,y)=arrow tip = 라벨 inner-edge 정렬점 ──────
    var hubR=cx+hubW/2, hubL=cx-hubW/2, hubB=cy+hubH/2, hubT=cy-hubH/2;
    var armN=320, armS=320, armE=520, armW=520, armDiagH=170, armDiagX=320;
    var zoneMap={
      N : {x:cx,                y:hubT-armN,           outX:0, outY:-1, hAlign:'center',     tAlign:'center', boxAlign:'bottom'},
      NE: {x:hubR+armDiagX,     y:hubT-armDiagH,       outX:1, outY:-1, hAlign:'flex-start', tAlign:'left',   boxAlign:'bottom-left'},
      E : {x:hubR+armE,         y:cy,                  outX:1, outY:0,  hAlign:'flex-start', tAlign:'left',   boxAlign:'mid-left'},
      SE: {x:hubR+armDiagX,     y:hubB+armDiagH,       outX:1, outY:1,  hAlign:'flex-start', tAlign:'left',   boxAlign:'top-left'},
      S : {x:cx,                y:hubB+armS,           outX:0, outY:1,  hAlign:'center',     tAlign:'center', boxAlign:'top'},
      SW: {x:hubL-armDiagX,     y:hubB+armDiagH,       outX:-1,outY:1,  hAlign:'flex-end',   tAlign:'right',  boxAlign:'top-right'},
      W : {x:hubL-armW,         y:cy,                  outX:-1,outY:0,  hAlign:'flex-end',   tAlign:'right',  boxAlign:'mid-right'},
      NW: {x:hubL-armDiagX,     y:hubT-armDiagH,       outX:-1,outY:-1, hAlign:'flex-end',   tAlign:'right',  boxAlign:'bottom-right'}
    };
    // 라벨 box top-left 좌표 — anchor 에서 outward 펼침 (충돌 방지)
    function labelBox(z){
      var lx, ly;
      var ba=z.boxAlign;
      if(ba==='top')              { lx=z.x-labelW/2;   ly=z.y; }
      else if(ba==='bottom')      { lx=z.x-labelW/2;   ly=z.y-labelH; }
      else if(ba==='bottom-left') { lx=z.x;            ly=z.y-labelH; }
      else if(ba==='top-left')    { lx=z.x;            ly=z.y; }
      else if(ba==='bottom-right'){ lx=z.x-labelW;     ly=z.y-labelH; }
      else if(ba==='top-right')   { lx=z.x-labelW;     ly=z.y; }
      else if(ba==='mid-left')    { lx=z.x;            ly=z.y-labelH/2; }
      else if(ba==='mid-right')   { lx=z.x-labelW;     ly=z.y-labelH/2; }
      else                         { lx=z.x-labelW/2;   ly=z.y-labelH/2; }
      return {x:lx, y:ly};
    }

    // ── orientation 별 zone 시퀀스 ──────────────────────────────────
    function pickZones(orient, N){
      var H_p={
        1:['N'], 2:['N','S'],
        3:['N','NE','SE'],                  // 이미지 1: 상 + 우상 + 우하
        4:['N','NE','SE','S'],
        5:['NW','N','NE','SE','SW'],
        6:['NW','N','NE','SE','S','SW'],
        7:['NW','N','NE','E','SE','S','SW'],
        8:['NW','N','NE','E','SE','S','SW','W']
      };
      var V_p={
        1:['E'], 2:['W','E'],
        3:['W','E','S'],
        4:['NW','NE','SW','SE'],
        5:['NW','W','SW','NE','E'],
        6:['NW','W','SW','NE','E','SE'],
        7:['NW','W','SW','NE','E','SE','N'],
        8:['NW','W','SW','NE','E','SE','N','S']
      };
      var F_p={                               // fan: 상반원 각도
        1:[90], 2:[135,45],
        3:[135,90,45],                        // 이미지 2: NW + N + NE
        4:[150,110,70,30],
        5:[150,120,90,60,30],
        6:[155,131,107,83,59,35],
        7:[160,140,120,100,80,60,40],
        8:[165,141,118,94,71,47,24,8]
      };
      if(orient==='fan'){
        // 대칭 부채꼴 — N 클수록 호 넓힘 + 인접 라벨 radius 번갈아(stagger)
        // → 각도상 인접한 라벨을 반경차로 분리하여 apex(수직) 부근 겹침 방지
        var span=Math.min(168, 72 + N*14);    // 호 각도 폭 (최대 168°)
        var angs=[];
        if(N===1){ angs=[90]; }
        else { var step=span/(N-1), a0=90+span/2; for(var ai=0;ai<N;ai++) angs.push(a0-step*ai); }
        var rO=920, rI=560, rS=740;            // 바깥/안쪽 ring + 소수 branch 단일 radius
        return angs.map(function(a,idx){
          var rad=a*Math.PI/180;
          var r=(N>=5) ? ((idx%2===0)?rO:rI) : rS;
          var x=cx+Math.cos(rad)*r, y=cy-Math.sin(rad)*r;
          var ox=Math.cos(rad), oy=-Math.sin(rad);
          var hAlign='center', tAlign='center', boxAlign='bottom';
          if(ox>0.3){ hAlign='flex-start'; tAlign='left'; boxAlign='bottom-left'; }
          else if(ox<-0.3){ hAlign='flex-end'; tAlign='right'; boxAlign='bottom-right'; }
          return {x:x, y:y, outX:ox, outY:oy, hAlign:hAlign, tAlign:tAlign, boxAlign:boxAlign};
        });
      }
      var preset = (orient==='vertical' ? V_p : H_p)[N]
                 || (orient==='vertical' ? V_p[8] : H_p[8]).concat(d3.range(Math.max(0,N-8)).map(function(){return 'N';}));
      return preset.map(function(zk){ return zoneMap[zk]; });
    }
    var zones=pickZones(orient, N);

    // ── SVG ───────────────────────────────────────────────────────
    var svg=mkSvg(el,W,H,'ha-callout-svg');

    // stem line — horizontal/vertical 모드만
    if(orient==='horizontal' || orient==='vertical'){
      var sCol='var(--htmlart-callout-stem,var(--htmlart-fg,#888))';
      if(orient==='horizontal'){
        var slen=hubW*0.85;
        svg.append('line').attr('x1',cx-slen/2).attr('y1',cy).attr('x2',cx+slen/2).attr('y2',cy)
          .attr('style','stroke:'+sCol+';stroke-width:3;opacity:.55');
      } else {
        var vlen=hubH*1.8;
        svg.append('line').attr('x1',cx).attr('y1',cy-vlen/2).attr('x2',cx).attr('y2',cy+vlen/2)
          .attr('style','stroke:'+sCol+';stroke-width:3;opacity:.55');
      }
    }

    // arrow marker defs
    var defs=svg.append('defs');
    ['primary','secondary'].forEach(function(kind){
      var color = kind==='primary'
        ? 'var(--htmlart-callout-primary,var(--m2-accent-1,#5dade2))'
        : 'var(--htmlart-callout-secondary,var(--m2-accent-2,#e91e63))';
      defs.append('marker').attr('id','cohead-'+kind).attr('viewBox','0 0 10 10')
        .attr('refX',8).attr('refY',5).attr('markerWidth',9).attr('markerHeight',9)
        .attr('orient','auto-start-reverse')
        .append('path').attr('d','M0,0 L10,5 L0,10 z').attr('fill',color);
    });

    // hub 렌더 — 큰 텍스트 + 좌측 아이콘 슬롯, 박스 border 없음
    var foHub=svg.append('foreignObject')
      .attr('x',cx-hubW/2).attr('y',cy-hubH/2).attr('width',hubW).attr('height',hubH);
    var hubDiv=foHub.append('xhtml:div')
      .attr('style','width:100%;height:100%;display:flex;align-items:center;justify-content:center;'
        +'gap:24px;color:var(--htmlart-fg,inherit);'
        +'font-weight:800;font-size:'+hubFontSize+'px;line-height:1.15;text-align:center;'
        +'word-break:keep-all;padding:0 32px;box-sizing:border-box;background:transparent;');
    hubDiv.node().innerHTML = (hub.iconHtml||'') + '<span>'+esc(hub.title)+'</span>';

    // branches 렌더
    branches.forEach(function(b,i){
      var z=zones[i]||zones[0];
      var color = b.bold
        ? 'var(--htmlart-callout-primary,var(--m2-accent-1,#5dade2))'
        : 'var(--htmlart-callout-secondary,var(--m2-accent-2,#e91e63))';
      var headId = b.bold ? 'cohead-primary' : 'cohead-secondary';

      // arrow start = hub 사각형 가장자리 (z.outX/outY 방향)
      var L=hubW*0.5, R=hubH*0.5;
      var t;
      if(Math.abs(z.outX)>1e-3 && Math.abs(z.outY)>1e-3) t=Math.min(L/Math.abs(z.outX), R/Math.abs(z.outY));
      else if(Math.abs(z.outX)>1e-3) t=L/Math.abs(z.outX);
      else t=R/Math.abs(z.outY);
      var sx=cx+z.outX*t, sy=cy+z.outY*t;

      // arrow end = z.x,z.y 정확히 (라벨 inner edge underline/overline 에 화살촉 lands)
      var ex=z.x, ey=z.y;

      svg.append('line')
        .attr('x1',sx).attr('y1',sy).attr('x2',ex).attr('y2',ey)
        .attr('marker-end','url(#'+headId+')')
        .attr('style','stroke:'+color+';stroke-width:4;stroke-linecap:round;');

      var lb=labelBox(z);
      // ── 라벨 inner edge underline/overline (label baseline 강조) ─────
      // 위쪽 라벨(outY<=0) → 라벨 아래 underline. 아래쪽 라벨(outY>0) → 라벨 위 overline.
      // E/W (outY≈0) → 기본 underline. 화살촉이 line 위/아래에 정확히 landing.
      var ulY = (z.outY > 0.3) ? lb.y : (lb.y + labelH);
      svg.append('line')
        .attr('x1',lb.x).attr('y1',ulY).attr('x2',lb.x+labelW).attr('y2',ulY)
        .attr('style','stroke:'+color+';stroke-width:'+(b.bold?5:3.5)+';opacity:.9;stroke-linecap:round;');
      var fo=svg.append('foreignObject')
        .attr('x',lb.x).attr('y',lb.y).attr('width',labelW).attr('height',labelH);
      var div=fo.append('xhtml:div')
        .attr('style','width:100%;height:100%;display:flex;align-items:center;'
          +'justify-content:'+z.hAlign+';'
          +'color:'+color+';'
          +'font-size:44px;font-weight:'+(b.bold?'800':'700')+';line-height:1.22;'
          +'text-align:'+z.tAlign+';'
          +'word-break:keep-all;padding:0 14px;box-sizing:border-box;');
      if(b.tokens){
        var grp=div.append('xhtml:div')
          .attr('style','display:inline-flex;flex-wrap:wrap;gap:0 16px;align-items:center;'
            +'justify-content:'+z.hAlign+';');
        b.tokens.forEach(function(tok,ti){
          if(ti>0){
            grp.append('xhtml:span')
              .attr('style','color:var(--htmlart-callout-sep,rgba(128,128,128,.5));font-weight:300;font-size:0.9em;')
              .text('|');
          }
          grp.append('xhtml:span').text(tok);
        });
      } else {
        div.append('xhtml:span').text(b.text);
      }
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
             : type==='bend_process'?renderBendProcess
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
             : type==='workflow'?renderWorkflow
             : type==='explain'?renderExplain
             : type==='annotate'?renderAnnotate
             : type==='callout'?renderCallout
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
