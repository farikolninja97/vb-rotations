/* Rotation Studio — vanilla JavaScript, zero dependencies. Works as a local HTML file. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('courtCanvas');
  const ctx = canvas.getContext('2d');
  const courtFallback = $('courtFallback');
  const STORAGE_DRAFT = 'rotation-studio-draft-v1';
  const STORAGE_PLAYS = 'rotation-studio-plays-v1';
  const ZONE_ORDER = [1, 6, 5, 4, 3, 2]; // Volleyball's clockwise movement: 1 → 6 → 5 → 4 → 3 → 2 → 1.
  const ZONES = {
    1: {x:3, z:6.65}, 2: {x:3, z:2.25}, 3: {x:0, z:2.25},
    4: {x:-3, z:2.25}, 5: {x:-3, z:6.65}, 6: {x:0, z:6.65}
  };
  const ROLE_COLORS = {S:'#f4b36a', S1:'#f4b36a', S2:'#f4b36a', OH:'#72c8f5', MB:'#97dfb7', OPP:'#c69ef7'};
  const SEGMENT_SECONDS = 1.4;
  const clamp = (n,a,b)=>Math.min(b,Math.max(a,n));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const copy = v=>JSON.parse(JSON.stringify(v));
  const escapeHtml = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleName = r => ({S:'Setter',S1:'Setter 1',S2:'Setter 2',OH:'Outside hitter',MB:'Middle blocker',OPP:'Opposite'}[r]||r);

  function makePlayers(system) {
    const configs = system==='6-2'
      ? [['S1','S1',1,1],['OH1','OH',2,2],['MB1','MB',3,3],['S2','S2',4,4],['OH2','OH',5,5],['MB2','MB',6,6]]
      : [['S','S',1,1],['OH1','OH',2,2],['MB1','MB',3,3],['OPP','OPP',4,4],['OH2','OH',5,5],['MB2','MB',6,6]];
    return configs.map(([id,role,homeZone,number])=>({id,role,homeZone,number:String(number),name:id,color:ROLE_COLORS[role],x:0,z:0}));
  }
  function zoneFor(p,rotation) {
    return ZONE_ORDER[(ZONE_ORDER.indexOf(p.homeZone)+rotation-1)%6];
  }
  function activeSetter(players,rotation) {
    const setters=players.filter(p=>['S','S1','S2'].includes(p.role));
    return setters.find(p=>[1,5,6].includes(zoneFor(p,rotation))) || setters[0] || null;
  }
  function initialPositions(players,rotation) {
    return Object.fromEntries(players.map(p=>[p.id,copy(ZONES[zoneFor(p,rotation)])]));
  }
  function formationFrames(players,rotation) {
    const start=initialPositions(players,rotation);
    const active=activeSetter(players,rotation);
    const transition=copy(start);
    for (const p of players) {
      const zone=zoneFor(p,rotation);
      const front=[2,3,4].includes(zone);
      if (p.id===active?.id) transition[p.id]={x:2.05,z:1.55};
      else if (p.role==='OH' && front) transition[p.id]={x:-3.2,z:1.8};
      else if (p.role==='MB' && front) transition[p.id]={x:-0.1,z:1.45};
      else if (p.role==='OPP' && front) transition[p.id]={x:3.05,z:1.85};
      else if (['S','S1','S2'].includes(p.role) && front) transition[p.id]={x:3,z:2.1};
      else if (front) transition[p.id]={x:-2.8,z:2.25};
      else transition[p.id]={x:clamp(start[p.id].x*0.85,-3.7,3.7),z:7.0};
    }
    const attack=copy(transition);
    const attacker=players.find(p=>p.role==='OH'&&[2,3,4].includes(zoneFor(p,rotation)))||players.find(p=>p.role==='OH');
    if(attacker) attack[attacker.id]={x:-3.1,z:1.05};
    const snapshot=(label,positions,ball)=>({label,positions:copy(positions),ball:copy(ball)});
    return [
      snapshot('Starting positions',start,{x:1.6,y:1.8,z:8.15}),
      snapshot('Setter transition',transition,{x:2.0,y:2.65,z:1.9}),
      snapshot('Attack approach',attack,{x:-2.8,y:3.2,z:.85}),
      snapshot('Ball over net',attack,{x:-1.6,y:2.3,z:-3.5})
    ];
  }
  function makeDefault(system='5-1') {
    const players=makePlayers(system),rotation=1,frames=formationFrames(players,rotation);
    for(const p of players) Object.assign(p,frames[0].positions[p.id]);
    return {version:1,name:'My first play',system,rotation,view:'2d',showZones:true,players,frames,frameIndex:0,ball:copy(frames[0].ball),selectedId:null,camera:{az:.58,el:.7,zoom:1}};
  }
  const validFinite = v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<10000;
  function isValidProject(v) {
    if(!v||typeof v!=='object'||!['5-1','6-2'].includes(v.system)||!Number.isInteger(v.rotation)||v.rotation<1||v.rotation>6)return false;
    if(!Array.isArray(v.players)||v.players.length!==6||!Array.isArray(v.frames)||v.frames.length<2||v.frames.length>60)return false;
    const ids=v.players.map(p=>p.id);
    if(new Set(ids).size!==6||v.players.some(p=>typeof p.id!=='string'||!p.id||p.id.length>20||typeof p.role!=='string'||!Number.isInteger(p.homeZone)||p.homeZone<1||p.homeZone>6))return false;
    return v.frames.every(f=>f&&typeof f.label==='string'&&f.positions&&ids.every(id=>f.positions[id]&&validFinite(f.positions[id].x)&&validFinite(f.positions[id].z))&&f.ball&&['x','y','z'].every(k=>validFinite(f.ball[k])));
  }
  function safeLoad(key,fallback=null) {try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
  let savedPlays=safeLoad(STORAGE_PLAYS,{});
  if(!savedPlays||typeof savedPlays!=='object'||Array.isArray(savedPlays))savedPlays={};
  let state=makeDefault();
  const draft=safeLoad(STORAGE_DRAFT);
  if(isValidProject(draft)){state=normalizeProject(draft);}
  let currentSavedId=null;
  let playing=false,playhead=0,lastTime=0,rafId=0,saveTimer=0,toastTimer=0;
  let pointerMode=null,activePointer=null,dragMoved=false,pinchStart=null,gesturePointers=new Map();
  let size={w:1,h:1,dpr:1};
  let rendererCache={players:[],ball:null,cam:null,topdown:null};

  function normalizeProject(p) {
    const o=makeDefault(p.system);
    o.name=String(p.name||'My play').slice(0,60);
    o.rotation=p.rotation;
    o.view=p.view==='3d'?'3d':'2d';
    o.showZones=p.showZones!==false;
    o.players=p.players.map(v=>({...v,name:String(v.name??v.id).slice(0,36),number:String(v.number??'').slice(0,3),color:ROLE_COLORS[v.role]||'#b9d5e8'}));
    o.frames=p.frames.map(f=>({
      label:String(f.label).slice(0,40),
      positions:Object.fromEntries(o.players.map(v=>[v.id,{
        x:clamp(f.positions[v.id].x,-4.25,4.25),
        z:clamp(f.positions[v.id].z,.25,8.75)
      }])),
      ball:{x:clamp(f.ball.x,-4.35,4.35),y:clamp(f.ball.y,.3,5),z:clamp(f.ball.z,-8.8,8.8)}
    }));
    o.frameIndex=clamp(Number.isInteger(p.frameIndex)?p.frameIndex:0,0,o.frames.length-1);
    o.selectedId=p.selectedId==='ball'?'ball':(o.players.some(v=>v.id===p.selectedId)?p.selectedId:null);
    o.camera={az:validFinite(p.camera?.az)?p.camera.az:.58,el:clamp(validFinite(p.camera?.el)?p.camera.el:.7,.22,1.42),zoom:clamp(validFinite(p.camera?.zoom)?p.camera.zoom:1,.56,2.5)};
    setScene(o,o.frames[o.frameIndex]);
    return o;
  }
  function setScene(project,frame) {
    for(const p of project.players){const q=frame.positions[p.id];if(q){p.x=q.x;p.z=q.z;}}
    project.ball=copy(frame.ball);
  }
  function snapshotCurrent(){return {positions:Object.fromEntries(state.players.map(p=>[p.id,{x:p.x,z:p.z}])),ball:copy(state.ball)};}
  function saveActiveFrame(){
    const frame=state.frames[state.frameIndex];if(!frame)return;
    const s=snapshotCurrent();frame.positions=s.positions;frame.ball=s.ball;
  }
  function projectData(){return copy({version:1,name:state.name,system:state.system,rotation:state.rotation,view:state.view,showZones:state.showZones,players:state.players,frames:state.frames,frameIndex:state.frameIndex,selectedId:state.selectedId,camera:state.camera});}
  function saveDraft(){
    clearTimeout(saveTimer);
    try{localStorage.setItem(STORAGE_DRAFT,JSON.stringify(projectData()));$('saveStatus').textContent='Saved on device';}catch{$('saveStatus').textContent='Storage unavailable';}
  }
  function requestSave(){
    $('saveStatus').textContent='Saving...';clearTimeout(saveTimer);
    saveTimer=setTimeout(saveDraft,350);
  }
  function toast(msg){const e=$('toast');e.textContent=msg;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),2500);}
  function playDuration(){return Math.max(1,state.frames.length-1)*SEGMENT_SECONDS;}
  function timeLabel(seconds){const n=Math.floor(Math.max(0,seconds));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}

  // ----- Controls -----
  function renderControls() {
    $('systemSelect').value=state.system;
    $('rotationNumber').textContent=String(state.rotation).padStart(2,'0');
    $('systemTag').textContent=state.system.replace('-','–')+' SYSTEM';
    $('rotationTag').textContent='ROTATION '+String(state.rotation).padStart(2,'0');
    $('courtModeText').textContent=state.view==='2d'?'TOP-DOWN VIEW':'ORBITAL 3D VIEW';
    $('view2d').classList.toggle('active',state.view==='2d');$('view3d').classList.toggle('active',state.view==='3d');
    $('view2d').setAttribute('aria-pressed',String(state.view==='2d'));$('view3d').setAttribute('aria-pressed',String(state.view==='3d'));
    $('showZones').checked=state.showZones;
    $('systemDescription').textContent=state.system==='5-1'
      ?'One setter runs the offense in all six rotations. In the back row, the setter transitions toward the net.'
      :'Two setters start opposite each other. The back-row setter handles setting duties, leaving three front-row attackers.';
    $('courtHint').innerHTML=state.view==='2d'?'Drag players or the ball to reposition <span>·</span> Tap a player to edit':'Drag a player or ball <span>·</span> Swipe empty court to orbit <span>·</span> Pinch to zoom';
    $('footHint').textContent=state.view==='2d'?'Drag to arrange your lineup':'Drag empty space to rotate the camera';
    $('projectName').value=state.name;
    const dots=$('rotationDots');dots.replaceChildren();
    for(let r=1;r<=6;r++){const b=document.createElement('button');b.textContent=r;b.title=`Rotation ${r}`;b.className=r===state.rotation?'active':'';b.setAttribute('aria-label',`Go to rotation ${r}`);b.onclick=()=>changeRotation(r);dots.appendChild(b);}
    renderLineup();renderInspector();renderFrames();renderSavedList();
    draw();
  }
  function renderLineup() {
    const list=$('lineupList');list.replaceChildren();
    for(const p of [...state.players].sort((a,b)=>zoneFor(a,state.rotation)-zoneFor(b,state.rotation))){
      const b=document.createElement('button');b.className='lineup-item'+(state.selectedId===p.id?' active':'');
      const active=p.id===activeSetter(state.players,state.rotation)?.id;
      b.innerHTML=`<span class="player-number" style="background:${p.color}">${escapeHtml(p.number)}</span><span class="player-desc"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(roleName(p.role))}${active?' · Active setter':''}</small></span><span class="zone-badge">Z${zoneFor(p,state.rotation)}</span>`;
      b.onclick=()=>selectPlayer(p.id);list.appendChild(b);
    }
    const a=activeSetter(state.players,state.rotation);
    $('setterNote').textContent=a?`Active setter: ${a.name} (zone ${zoneFor(a,state.rotation)}). Positions are editable; the rotation order remains correct.`:'Move players by dragging them on the court.';
  }
  function renderInspector(){
    const root=$('playerInspector');root.replaceChildren();
    const p=state.players.find(p=>p.id===state.selectedId);
    if(state.selectedId==='ball'){
      root.innerHTML='<div class="inspector-person"><span class="player-number" style="background:#f5cc7d">◉</span><div><strong>Volleyball</strong><small>Ball position & trajectory</small></div></div><label class="field-caption" for="ballHeight">BALL HEIGHT <span id="ballHeightValue"></span></label><input class="ball-slider" id="ballHeight" type="range" min="0.3" max="5" step="0.1"><div class="inspector-extra">Drag the ball in 2D or 3D to move it across the court. Adjust its height here and add keyframes to animate its trajectory.</div>';
      const slider=$('ballHeight'),out=$('ballHeightValue');slider.value=String(clamp(state.ball.y,.3,5));out.textContent=state.ball.y.toFixed(1)+' m';
      slider.addEventListener('input',e=>{state.ball.y=Number(e.target.value);out.textContent=state.ball.y.toFixed(1)+' m';saveActiveFrame();draw();requestSave();});
      return;
    }
    if(!p){root.innerHTML='<p class="muted">Select a player on the court or in the lineup to edit their details.</p>';return;}
    root.innerHTML=`<div class="inspector-person"><span class="player-number" style="background:${p.color}"></span><div><strong></strong><small>${escapeHtml(roleName(p.role))} · Rotation zone ${zoneFor(p,state.rotation)}</small></div></div><div class="inspector-grid"><label><span class="field-caption">PLAYER NAME</span><input class="text-input" id="playerName" maxlength="36"></label><label><span class="field-caption">JERSEY #</span><input class="text-input" id="playerJersey" maxlength="3"></label></div><div class="inspector-extra">Drag this player on the court to update the selected animation frame.</div>`;
    root.querySelector('.inspector-person .player-number').textContent=p.number;
    root.querySelector('.inspector-person strong').textContent=p.name;
    $('playerName').value=p.name;$('playerJersey').value=p.number;
    $('playerName').addEventListener('input',e=>{p.name=e.target.value;root.querySelector('.inspector-person strong').textContent=p.name;renderLineup();requestSave();draw();});
    $('playerJersey').addEventListener('input',e=>{p.number=e.target.value.slice(0,3);root.querySelector('.inspector-person .player-number').textContent=p.number;renderLineup();requestSave();draw();});
  }
  function renderFrames(){
    const list=$('frameList');list.replaceChildren();
    state.frames.forEach((f,i)=>{
      const b=document.createElement('button');b.className='frame'+(i===state.frameIndex?' active':'');b.title='Click to view; double-click to rename';
      b.innerHTML=`<span class="frame-index"><span class="frame-node"></span> KEYFRAME ${String(i+1).padStart(2,'0')}</span><span class="frame-name">${escapeHtml(f.label)}</span><span class="frame-time">${timeLabel(i*SEGMENT_SECONDS)}</span>${state.frames.length>2?'<span class="frame-remove" title="Delete keyframe" role="button" aria-label="Delete keyframe">×</span>':''}`;
      b.addEventListener('click',e=>{if(e.target.closest('.frame-remove')){e.stopPropagation();removeFrame(i);}else selectFrame(i);});
      b.addEventListener('dblclick',e=>{if(e.target.closest('.frame-remove'))return;selectFrame(i);const value=prompt('Name this keyframe',f.label);if(value!==null&&value.trim()){f.label=value.trim().slice(0,40);renderFrames();requestSave();}});
      list.appendChild(b);
    });
    $('scrub').value=Math.round(playhead*1000);
    $('timeCurrent').textContent=timeLabel(playhead*playDuration());
    $('timeTotal').textContent=timeLabel(playDuration());
    const pi=$('playIcon');pi.innerHTML=playing?'<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>':'<path d="m8 5 12 7-12 7z"/>';
    $('playBtn').title=playing?'Pause animation':'Play animation';
  }
  function renderSavedList(){
    const s=$('savedSelect');const prev=currentSavedId;s.replaceChildren();
    const empty=document.createElement('option');empty.value='';empty.textContent='Select a saved play...';s.appendChild(empty);
    for(const [id,v] of Object.entries(savedPlays).filter(([,v])=>v&&v.project&&isValidProject(v.project)).sort((a,b)=>(b[1].updated||0)-(a[1].updated||0))){
      const o=document.createElement('option');o.value=id;o.textContent=String(v.project.name||'Untitled').slice(0,70);s.appendChild(o);
    }
    s.value=prev&&savedPlays[prev]&&isValidProject(savedPlays[prev].project)?prev:'';
  }
  function selectPlayer(id){state.selectedId=id;renderLineup();renderInspector();draw();requestSave();}
  function selectFrame(i){stopPlayback();state.frameIndex=clamp(i,0,state.frames.length-1);setScene(state,state.frames[state.frameIndex]);playhead=state.frameIndex/(state.frames.length-1);renderFrames();draw();requestSave();}
  function changeRotation(r){
    if(r===state.rotation)return;
    stopPlayback();state.rotation=r;state.frames=formationFrames(state.players,r);state.frameIndex=0;playhead=0;setScene(state,state.frames[0]);renderControls();requestSave();toast(`Rotation ${r} loaded · keyframes reset`);
  }
  function changeSystem(system){
    if(system===state.system)return;
    if(!confirm(`Switch to a ${system} offense? This resets your lineup and keyframes. Save your current play first if you want to keep it.`)){$('systemSelect').value=state.system;return;}
    const name=state.name,view=state.view,cam=copy(state.camera);
    state=makeDefault(system);state.name=name;state.view=view;state.camera=cam;currentSavedId=null;playhead=0;stopPlayback();renderControls();requestSave();toast(`Switched to ${system} system`);
  }
  function addFrame(){stopPlayback();saveActiveFrame();const s=snapshotCurrent();state.frames.splice(state.frameIndex+1,0,{label:`Custom movement ${state.frames.length-2}`,positions:s.positions,ball:s.ball});state.frameIndex++;playhead=state.frameIndex/(state.frames.length-1);renderFrames();requestSave();toast('Keyframe added — now drag objects to their new positions');}
  function removeFrame(i){if(state.frames.length<=2)return;stopPlayback();state.frames.splice(i,1);state.frameIndex=clamp(state.frameIndex>=i?state.frameIndex-1:state.frameIndex,0,state.frames.length-1);setScene(state,state.frames[state.frameIndex]);playhead=state.frameIndex/(state.frames.length-1);renderFrames();draw();requestSave();}

  function positionAtProgress(progress) {
    const last=state.frames.length-1,scaled=clamp(progress,0,1)*last;
    const a=Math.min(last-1,Math.floor(scaled)),b=a+1,t=scaled-a;
    const u=t*t*(3-2*t),frameA=state.frames[a],frameB=state.frames[b];
    state.players.forEach(p=>{p.x=lerp(frameA.positions[p.id].x,frameB.positions[p.id].x,u);p.z=lerp(frameA.positions[p.id].z,frameB.positions[p.id].z,u);});
    state.ball.x=lerp(frameA.ball.x,frameB.ball.x,u);
    state.ball.z=lerp(frameA.ball.z,frameB.ball.z,u);
    state.ball.y=lerp(frameA.ball.y,frameB.ball.y,u)+Math.sin(t*Math.PI)*.7;
    const frameHighlight=playhead>=.999?last:a;
    if(state.frameIndex!==frameHighlight){state.frameIndex=frameHighlight;renderLineup();renderInspector();const items=$('frameList').querySelectorAll('.frame');items.forEach((b,i)=>b.classList.toggle('active',i===frameHighlight));}
    $('scrub').value=Math.round(playhead*1000);
    $('timeCurrent').textContent=timeLabel(playhead*playDuration());
    draw();
  }
  function animationTick(now){
    if(!playing)return;
    const delta=clamp((now-lastTime)/1000,0,.15);lastTime=now;
    playhead=clamp(playhead+delta*Number($('speed').value)/playDuration(),0,1);
    positionAtProgress(playhead);
    if(playhead>=1){stopPlayback();state.frameIndex=state.frames.length-1;renderFrames();return;}
    rafId=requestAnimationFrame(animationTick);
  }
  function startPlayback(){if(playing)return;if(playhead>=.999)playhead=0;playing=true;lastTime=performance.now();renderFrames();rafId=requestAnimationFrame(animationTick);}
  function stopPlayback(){playing=false;cancelAnimationFrame(rafId);renderFrames();}
  function togglePlayback(){playing?stopPlayback():startPlayback();}

  function savePlay(){
    stopPlayback();if(!isValidProject(projectData())){toast('Could not save invalid project');return;}
    const id=currentSavedId||`p-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    currentSavedId=id;savedPlays[id]={updated:Date.now(),project:projectData()};
    try{localStorage.setItem(STORAGE_PLAYS,JSON.stringify(savedPlays));saveDraft();renderSavedList();toast('Play saved to your browser');}catch{toast('Could not save — browser storage is full or blocked');}
  }
  function openSaved(id){if(!id||!savedPlays[id]||!isValidProject(savedPlays[id].project))return;stopPlayback();state=normalizeProject(savedPlays[id].project);currentSavedId=id;playhead=state.frameIndex/(state.frames.length-1);renderControls();saveDraft();toast('Saved play opened');}
  function newPlay(){
    if(!confirm('Start a fresh play? Your current draft will be replaced. Save or export it first if you want to keep it.'))return;
    stopPlayback();const system=state.system,view=state.view;state=makeDefault(system);state.view=view;playhead=0;currentSavedId=null;renderControls();saveDraft();toast('New play created');
  }
  function exportPlay(){
    const json=JSON.stringify({format:'rotation-studio',version:1,exportedAt:new Date().toISOString(),project:projectData()},null,2);
    const blob=new Blob([json],{type:'application/json'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=(state.name.replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'')||'rotation-play')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('JSON project exported');
  }
  async function importPlay(file){
    if(!file)return;
    if(file.size>500000){toast('File is too large');return;}
    try{const text=await file.text();const data=JSON.parse(text);const project=data?.project||data;if(!isValidProject(project))throw new Error('Invalid project');stopPlayback();state=normalizeProject(project);currentSavedId=null;playhead=state.frameIndex/(state.frames.length-1);renderControls();saveDraft();toast('Project imported — use Save play to add it to your playbook');}catch{toast('Could not import this project JSON');}
    $('importFile').value='';
  }

  // ----- Canvas math -----
  const V=(x=0,y=0,z=0)=>({x,y,z});
  const sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z);
  const add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z);
  const scale=(a,k)=>V(a.x*k,a.y*k,a.z*k);
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const cross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
  const norm=a=>{const n=Math.hypot(a.x,a.y,a.z)||1;return scale(a,1/n);};
  function getTopdown(){
    const s=Math.min(size.w*.77/9,size.h*.78/11)*state.camera.zoom;
    return {scale:s,cx:size.w*.5,top:(size.h-11*s)*.5,minZ:-1.5};
  }
  function project2(x,y,z){const t=rendererCache.topdown;return {x:t.cx+x*t.scale,y:t.top+(z-t.minZ)*t.scale - y*.15*t.scale,depth:1,sc:t.scale};}
  function getCamera(){
    const az=state.camera.az,el=state.camera.el,dist=29/state.camera.zoom;
    const target=V(0,.75,.1);
    const pos=add(target,V(Math.sin(az)*Math.cos(el)*dist,Math.sin(el)*dist,Math.cos(az)*Math.cos(el)*dist));
    const forward=norm(sub(target,pos)),right=norm(cross(forward,V(0,1,0))),up=norm(cross(right,forward));
    return {pos,forward,right,up,f:Math.min(size.w*1.22,size.h*1.95),centerX:size.w*.5,centerY:size.h*.455};
  }
  function project3(x,y,z){
    const c=rendererCache.cam,relative=sub(V(x,y,z),c.pos),depth=dot(relative,c.forward);
    const k=c.f/Math.max(1,depth);
    return {x:c.centerX+dot(relative,c.right)*k,y:c.centerY-dot(relative,c.up)*k,depth,sc:k};
  }
  function point(x,y,z){return state.view==='2d'?project2(x,y,z):project3(x,y,z);}
  function worldFromScreen(px,py,height=0){
    if(state.view==='2d'){
      const t=rendererCache.topdown;return {x:(px-t.cx)/t.scale,z:(py-t.top)/t.scale+t.minZ+height*.15};
    }
    const c=rendererCache.cam;
    const dir=add(c.forward,add(scale(c.right,(px-c.centerX)/c.f),scale(c.up,-(py-c.centerY)/c.f)));
    const t=(height-c.pos.y)/(dir.y||.000001);
    if(t<=0||!Number.isFinite(t))return null;
    const p=add(c.pos,scale(dir,t));return {x:p.x,z:p.z};
  }
  function polygon(points,fill,stroke=null,width=1){
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}
  }
  function path(points,stroke,width=1,dash=null){
    ctx.beginPath();ctx.setLineDash(dash||[]);points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([]);
  }
  function poly3(coords,fill,stroke=null,width=1){polygon(coords.map(([x,y,z])=>point(x,y,z)),fill,stroke,width);}
  function line3(a,b,color,width=1,dash){path([point(...a),point(...b)],color,width,dash);}
  function roundedRect(x,y,w,h,r){
    r=Math.min(r,w/2,h/2);
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }
  function textAt(str,p,color='white',font='11px system-ui',align='center') {ctx.fillStyle=color;ctx.font=font;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(str,p.x,p.y);}
  function circle(x,y,r,fill,stroke=null,lineWidth=1){ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}}
  function drawBackdrop(){
    const grad=ctx.createLinearGradient(0,0,0,size.h);grad.addColorStop(0,'#1a3546');grad.addColorStop(.7,'#122c3a');grad.addColorStop(1,'#10202e');ctx.fillStyle=grad;ctx.fillRect(0,0,size.w,size.h);
    ctx.strokeStyle='#6ba9a91b';ctx.lineWidth=1;
    const gap=31;for(let x=0;x<size.w;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size.h);ctx.stroke();}
    for(let y=0;y<size.h;y+=gap){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size.w,y);ctx.stroke();}
    const aura=ctx.createRadialGradient(size.w*.5,size.h*.55,15,size.w*.5,size.h*.55,Math.max(size.w,size.h)*.65);aura.addColorStop(0,'#7dc1bb16');aura.addColorStop(1,'#00000000');ctx.fillStyle=aura;ctx.fillRect(0,0,size.w,size.h);
  }
  function drawCourt2(){
    const p=(x,z)=>point(x,0,z);
    const rect=(x1,z1,x2,z2,fill,stroke)=>polygon([p(x1,z1),p(x2,z1),p(x2,z2),p(x1,z2)],fill,stroke,2);
    rect(-4.86,-1.65,4.86,9.25,'#c7a37a','#ead3a3');
    rect(-4.5,-1.5,4.5,0,'#2a5766','#d0eaeb');
    rect(-4.5,0,4.5,9,'#28787c','#e7f3e4');
    rect(-4.5,0,4.5,3,'#359194');
    rect(-4.5,3,4.5,9,'#2d767c');
    for(let z=0;z<=9;z+=1.5){line3([-4.5,0,z],[4.5,0,z],'#ffffff10',1);}
    line3([-4.5,0,3],[4.5,0,3],'#e7f6f1',2.3);
    line3([-4.5,0,9],[4.5,0,9],'#e7f6f1',2.3);
    for(const x of [-4.5,4.5])line3([x,0,0],[x,0,9],'#f8faf4',2.2);
    line3([-4.7,0,0],[4.7,0,0],'#effcff',7);
    line3([-4.7,0,0],[4.7,0,0],'#304f59',1.3);
    if(state.showZones){
      for(const [z,xy] of Object.entries(ZONES)){
        const pp=p(xy.x,xy.z);
        circle(pp.x,pp.y,25,'#061d2615','#d9ffff40',1.2);
        textAt(`Z${z}`,{x:pp.x,y:pp.y-30},'#d4fafaa2','bold 10px system-ui');
      }
    }
    const topLabel=p(0,-.9);textAt('OPPONENT SIDE',topLabel,'#b4dcdfb0','800 10px system-ui');
    const nearLabel=p(0,8.4);textAt('END LINE',nearLabel,'#b7e2dfa0','800 9px system-ui');
  }
  function drawCourt3(){
    // Soft court shadow and two physically projected halves.
    poly3([[-5.25,-.07,-10],[5.25,-.07,-10],[5.25,-.07,10],[-5.25,-.07,10]],'#172c38','#34546a',1.5);
    poly3([[-4.8,0,-9.35],[4.8,0,-9.35],[4.8,0,9.35],[-4.8,0,9.35]],'#c59d70','#dbbe91',1.6);
    poly3([[-4.5,.015,-9],[4.5,.015,-9],[4.5,.015,0],[-4.5,.015,0]],'#215b6a');
    poly3([[-4.5,.015,0],[4.5,.015,0],[4.5,.015,9],[-4.5,.015,9]],'#237b7d');
    poly3([[-4.5,.018,0],[4.5,.018,0],[4.5,.018,3],[-4.5,.018,3]],'#319394');
    poly3([[-4.5,.018,-3],[4.5,.018,-3],[4.5,.018,0],[-4.5,.018,0]],'#2c7781');
    for(let z=-9;z<=9;z+=1.5)line3([-4.5,.027,z],[4.5,.027,z],'#c6eeee1d',.7);
    for(const z of [-9,-3,0,3,9])line3([-4.5,.045,z],[4.5,.045,z],z===0?'#ffffff':'#eefbf2',z===0?3.5:1.8);
    for(const x of [-4.5,4.5])line3([x,.045,-9],[x,.045,9],'#eefbf2',1.7);
    if(state.showZones){
      for(const [label,xy] of Object.entries(ZONES)){
        const p=point(xy.x,.05,xy.z);ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.5);circle(0,0,Math.max(13,p.sc*.43),'#0b344144','#ccfffa77',1.3);ctx.restore();
        textAt(`Z${label}`,{x:p.x,y:p.y+10},'#dcffffb3',`700 ${clamp(p.sc*.28,9,13)}px system-ui`);
      }
    }
    // Net is 2.43 m high at men's regulation height. Vertical plane at z=0.
    const poleBaseA=point(-4.75,0,0),poleTopA=point(-4.75,2.65,0);
    const poleBaseB=point(4.75,0,0),poleTopB=point(4.75,2.65,0);
    path([poleBaseA,poleTopA],'#e0f3ef',4);path([poleBaseB,poleTopB],'#e0f3ef',4);
    poly3([[-4.5,1,0],[4.5,1,0],[4.5,2.43,0],[-4.5,2.43,0]],'#dae7ec18','#fffaf48a',1.4);
    for(let x=-4.5;x<=4.5;x+=.42)line3([x,1,0],[x,2.43,0],'#e4faf360',.65);
    for(let y=1;y<=2.43;y+=.17)line3([-4.5,y,0],[4.5,y,0],'#e4faf360',.65);
    line3([-4.57,2.43,0],[4.57,2.43,0],'#fffdf0',3.5);
    line3([-4.5,1,0],[4.5,1,0],'#d6f5ed',1.8);
  }
  function drawShadow3(x,z,scaleFactor=1){
    const c=point(x,.03,z),r=point(x+.35*scaleFactor,.03,z),d=Math.max(5,Math.hypot(r.x-c.x,r.y-c.y));
    ctx.save();ctx.translate(c.x,c.y);ctx.rotate(.12);ctx.scale(1,.42);circle(0,0,d*1.35,'#071a2699');ctx.restore();
  }
  function drawPlayer2(p){
    const pos=point(p.x,0,p.z),r=clamp(rendererCache.topdown.scale*.47,13,22),active=p.id===state.selectedId;
    if(active){circle(pos.x,pos.y,r+8,'#fff7e818','#ffe1a0',2.1);circle(pos.x,pos.y,r+12,null,'#ffe1a05b',1.1);}
    circle(pos.x+2,pos.y+4,r+1,'#09233370');circle(pos.x,pos.y,r,p.color,'#f7faf3',2.2);
    circle(pos.x-r*.36,pos.y-r*.4,r*.23,'#ffffff60');
    textAt(p.number||'•',pos,'#172b3b',`800 ${Math.max(11,r*.83)}px system-ui`);
    const name=String(p.name||p.id).slice(0,13);const label={x:pos.x,y:pos.y+r+14};
    ctx.font='700 11px system-ui';const tw=ctx.measureText(name).width;
    ctx.fillStyle='#0a2b39d9';ctx.beginPath();roundedRect(label.x-tw/2-7,label.y-9,tw+14,18,5);ctx.fill();
    textAt(name,label,'#f1f8f6','700 11px system-ui');
    rendererCache.players.push({id:p.id,x:pos.x,y:pos.y,r:r+14});
  }
  function drawPlayer3(p){
    const x=p.x,z=p.z,hip=point(x,.82,z),head=point(x,1.85,z),foot=point(x,0,z),k=clamp(head.sc,8,65);
    const shoulderL=point(x-.28,1.52,z),shoulderR=point(x+.28,1.52,z);
    const handL=point(x-.46,1.07,z),handR=point(x+.46,1.07,z);
    const kneeL=point(x-.15,.43,z+.055),kneeR=point(x+.15,.43,z-.05);
    const footL=point(x-.2,.07,z+.11),footR=point(x+.2,.07,z-.11);
    drawShadow3(x,z);
    path([hip,kneeL,footL],'#18323e',Math.max(2.4,k*.12));path([hip,kneeR,footR],'#18323e',Math.max(2.4,k*.12));
    path([shoulderL,handL],'#edba94',Math.max(2,k*.105));path([shoulderR,handR],'#edba94',Math.max(2,k*.105));
    const torsoTop=point(x,1.6,z),torsoL=point(x-.26,1.47,z),torsoR=point(x+.26,1.47,z),hipL=point(x-.21,.91,z),hipR=point(x+.21,.91,z);
    polygon([torsoL,torsoR,hipR,hipL],p.color,'#ecf5efba',1.2);
    const neck=point(x,1.69,z);path([torsoTop,neck],'#edba94',Math.max(3,k*.19));
    circle(head.x,head.y,clamp(k*.2,4.3,14),'#f3c4a0','#ffe5c5',.9);
    textAt(p.number,{x:hip.x,y:(torsoTop.y+hip.y)*.5},'#152b37',`800 ${clamp(k*.29,8,14)}px system-ui`);
    if(p.id===state.selectedId){circle(foot.x,foot.y,clamp(k*.54,13,28),null,'#ffe0a4',2.4);circle(head.x,head.y,clamp(k*.28,7,19),null,'#ffe0a45a',1.6);}
    const label=point(x,2.35,z),name=String(p.name||p.id).slice(0,13);
    ctx.font='700 11px system-ui';const tw=ctx.measureText(name).width;
    ctx.fillStyle='#0c2636e6';ctx.beginPath();roundedRect(label.x-tw/2-7,label.y-10,tw+14,20,5);ctx.fill();
    textAt(name,label,'#f0f7f5','700 11px system-ui');
    rendererCache.players.push({id:p.id,x:hip.x,y:(head.y+foot.y)/2,r:Math.max(18,Math.hypot(head.x-foot.x,head.y-foot.y)*.5)});
  }
  function drawBall(){
    const b=state.ball,p=point(b.x,state.view==='2d'?0:b.y,b.z),r=state.view==='2d'?12:clamp(p.sc*.2,7,17);
    if(state.view==='3d')drawShadow3(b.x,b.z,.8);
    const grd=ctx.createRadialGradient(p.x-r*.4,p.y-r*.45,r*.15,p.x,p.y,r);grd.addColorStop(0,'#fff5be');grd.addColorStop(.6,'#f9ce79');grd.addColorStop(1,'#e68c45');
    if(state.selectedId==='ball')circle(p.x,p.y,r+6,'#fff4b821','#ffe0a4',2);
    circle(p.x,p.y,r,grd,'#fff2d2',1.4);
    ctx.strokeStyle='#ae7249';ctx.lineWidth=Math.max(1,r*.09);
    ctx.beginPath();ctx.arc(p.x-r*.12,p.y+r*.04,r*.72,-1.38,1.4);ctx.stroke();
    ctx.beginPath();ctx.arc(p.x+r*.25,p.y-r*.05,r*.65,1.5,4.4);ctx.stroke();
    rendererCache.ball={x:p.x,y:p.y,r:Math.max(18,r+6)};
    textAt('BALL',{x:p.x,y:p.y-r-12},'#fff0c1','800 9px system-ui');
  }
  function draw(){
    if(!ctx||!size.w)return;
    ctx.setTransform(size.dpr,0,0,size.dpr,0,0);ctx.clearRect(0,0,size.w,size.h);
    rendererCache={players:[],ball:null,cam:getCamera(),topdown:getTopdown()};
    drawBackdrop();
    if(state.view==='2d'){drawCourt2();for(const p of state.players)drawPlayer2(p);drawBall();}
    else {drawCourt3();const sorted=[...state.players].sort((a,b)=>point(b.x,0,b.z).depth-point(a.x,0,a.z).depth);for(const p of sorted)drawPlayer3(p);drawBall();}
    // This is only removed once a complete player-and-ball frame was drawn.
    if(courtFallback && rendererCache.players.length===6 && rendererCache.ball) courtFallback.classList.add('hidden');
  }
  function resize(){
    const r=canvas.getBoundingClientRect();size={w:Math.max(1,r.width),h:Math.max(1,r.height),dpr:Math.min(window.devicePixelRatio||1,2)};
    canvas.width=Math.round(size.w*size.dpr);canvas.height=Math.round(size.h*size.dpr);draw();
  }

  // ----- Pointer and touch interaction -----
  function canvasPos(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  function pickObject(p){
    // Selected objects receive a slight priority to make fine adjustments easier.
    let best=null,min=1e6;
    const ball=rendererCache.ball;
    if(ball){const d=Math.hypot(ball.x-p.x,ball.y-p.y);if(d<ball.r+7){best={type:'ball'};min=d*.85;}}
    for(const item of rendererCache.players){const d=Math.hypot(item.x-p.x,item.y-p.y);if(d<Math.max(28,item.r+8)&&d<min){best={type:'player',id:item.id};min=d;}}
    return best;
  }
  function pointerDown(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();canvas.setPointerCapture(e.pointerId);
    const p=canvasPos(e);gesturePointers.set(e.pointerId,p);
    if(gesturePointers.size===2){
      const v=[...gesturePointers.values()];pinchStart={distance:Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y)||1,zoom:state.camera.zoom};pointerMode='pinch';activePointer=null;return;
    }
    if(gesturePointers.size>2)return;
    activePointer=e.pointerId;const picked=pickObject(p);pointerMode=picked||{type:state.view==='3d'?'orbit':'none'};pointerMode.last=p;dragMoved=false;
    if(pointerMode.type==='player')selectPlayer(pointerMode.id);
    else if(pointerMode.type==='ball')selectPlayer('ball');
    if(pointerMode.type==='player'||pointerMode.type==='ball'||pointerMode.type==='orbit')canvas.classList.add('dragging');
  }
  function pointerMove(e){
    if(!gesturePointers.has(e.pointerId))return;
    const p=canvasPos(e);gesturePointers.set(e.pointerId,p);
    if(pointerMode==='pinch'){
      if(gesturePointers.size>=2){const v=[...gesturePointers.values()];const d=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);state.camera.zoom=clamp(pinchStart.zoom*d/pinchStart.distance,.56,2.5);draw();}
      return;
    }
    if(activePointer!==e.pointerId||!pointerMode)return;
    const diff=Math.hypot(p.x-pointerMode.last.x,p.y-pointerMode.last.y);
    if(diff>2)dragMoved=true;
    if(pointerMode.type==='orbit'){
      state.camera.az-= (p.x-pointerMode.last.x)*.009;
      state.camera.el=clamp(state.camera.el+(p.y-pointerMode.last.y)*.007,.22,1.42);
      draw();
    } else if(pointerMode.type==='player'||pointerMode.type==='ball'){
      if(playing)stopPlayback();
      const height=pointerMode.type==='ball'?state.ball.y:0;
      const q=worldFromScreen(p.x,p.y,height);
      if(q){
        if(pointerMode.type==='ball'){
          state.ball.x=clamp(q.x,-4.35,4.35);state.ball.z=clamp(q.z,-8,8.8);
        }else{
          const player=state.players.find(v=>v.id===pointerMode.id);
          if(player){player.x=clamp(q.x,-4.25,4.25);player.z=clamp(q.z,.25,8.75);}
        }
        saveActiveFrame();draw();requestSave();
      }
    }
    pointerMode.last=p;
  }
  function pointerUp(e){
    if(!gesturePointers.has(e.pointerId))return;
    gesturePointers.delete(e.pointerId);
    if(gesturePointers.size===0){if(dragMoved)requestSave();pointerMode=null;activePointer=null;pinchStart=null;canvas.classList.remove('dragging');}
    else if(pointerMode==='pinch'){pointerMode={type:'none',last:[...gesturePointers.values()][0]};activePointer=[...gesturePointers.keys()][0];}
  }
  canvas.addEventListener('pointerdown',pointerDown);
  canvas.addEventListener('pointermove',pointerMove);
  canvas.addEventListener('pointerup',pointerUp);
  canvas.addEventListener('pointercancel',pointerUp);
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.camera.zoom=clamp(state.camera.zoom*(e.deltaY>0?.92:1.08),.56,2.5);draw();requestSave();},{passive:false});

  // ----- Bind buttons -----
  $('view2d').onclick=()=>{state.view='2d';renderControls();requestSave();};
  $('view3d').onclick=()=>{state.view='3d';renderControls();requestSave();};
  $('showZones').onchange=e=>{state.showZones=e.target.checked;draw();requestSave();};
  $('systemSelect').onchange=e=>changeSystem(e.target.value);
  $('prevRotation').onclick=()=>changeRotation(state.rotation===1?6:state.rotation-1);
  $('nextRotation').onclick=()=>changeRotation(state.rotation===6?1:state.rotation+1);
  $('resetCamera').onclick=()=>{state.camera={az:.58,el:.7,zoom:1};draw();requestSave();toast('Court view reset');};
  $('resetPlayers').onclick=()=>{
    if(!confirm('Reset all player positions and animation frames for this rotation? Your player names and jersey numbers will stay the same.'))return;
    stopPlayback();
    state.frames=formationFrames(state.players,state.rotation);
    state.frameIndex=0;playhead=0;state.camera={az:.58,el:.7,zoom:1};
    setScene(state,state.frames[0]);
    renderControls();requestSave();toast('All six players reset to this rotation');
  };
  $('zoomIn').onclick=()=>{state.camera.zoom=clamp(state.camera.zoom*1.15,.56,2.5);draw();requestSave();};
  $('zoomOut').onclick=()=>{state.camera.zoom=clamp(state.camera.zoom/1.15,.56,2.5);draw();requestSave();};
  $('addFrame').onclick=addFrame;
  $('playBtn').onclick=togglePlayback;
  $('rewindBtn').onclick=()=>selectFrame(0);
  $('scrub').oninput=e=>{stopPlayback();playhead=Number(e.target.value)/1000;positionAtProgress(playhead);};
  $('scrub').onchange=()=>requestSave();
  $('projectName').oninput=e=>{state.name=e.target.value.slice(0,60);requestSave();};
  $('saveBtn').onclick=savePlay;
  $('exportBtn').onclick=exportPlay;
  $('savedSelect').onchange=e=>openSaved(e.target.value);
  $('newBtn').onclick=newPlay;
  $('importBtn').onclick=()=>$('importFile').click();
  $('importFile').onchange=e=>importPlay(e.target.files?.[0]);
  $('deleteBtn').onclick=()=>{
    if(!currentSavedId){toast('Open a saved play to delete it');return;}
    if(!confirm('Delete this saved play? Your current editor will remain open.'))return;
    delete savedPlays[currentSavedId];currentSavedId=null;
    try{localStorage.setItem(STORAGE_PLAYS,JSON.stringify(savedPlays));}catch{}
    renderSavedList();toast('Saved play deleted');
  };
  document.addEventListener('keydown',e=>{
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement)return;
    if(e.code==='Space'){e.preventDefault();togglePlayback();}
    if(e.code==='ArrowRight'){e.preventDefault();selectFrame(Math.min(state.frames.length-1,state.frameIndex+1));}
    if(e.code==='ArrowLeft'){e.preventDefault();selectFrame(Math.max(0,state.frameIndex-1));}
  });
  if('ResizeObserver' in window)new ResizeObserver(resize).observe($('courtStage'));
  else window.addEventListener('resize',resize);
  window.addEventListener('beforeunload',saveDraft);
  window.addEventListener('error',e=>{
    if(courtFallback){courtFallback.classList.remove('hidden');
      const msg=$('fallbackMessage');if(msg)msg.textContent='Interactive display failed. Please open this page in Safari or Chrome, or try Reset player positions.';}
  });
  // Public, read-only-ish diagnostic API for basic tests and power users.
  window.RotationStudio={getState:()=>projectData(),zoneFor:(id,rotation=state.rotation)=>{const p=state.players.find(v=>v.id===id);return p?zoneFor(p,rotation):null;}};
  playhead=state.frameIndex/(state.frames.length-1);
  renderControls();resize();
})();
