// Hiyoko Sodate - Game Engine
const C = {W:480,H:720,BASE:30,SPD:280,MAX_LV:20,CHKN:12,
  FSPD:120,SI:1000,SI_MIN:280,ROT0:0.12,ROT_INC:0.018,
  FOODS:{rice:{e:'🍚',g:1,p:10,s:1,w:40},grain:{e:'🌾',g:2,p:25,s:1.2,w:30},
    peach:{e:'🍑',g:3,p:50,s:1.5,w:15}},
  ROTTEN:{e:'💀',g:0,p:0,s:1.3,deadly:true},
  DL_PUB:'6a0ad2558f40bb17b0a37437',DL_PRI:'1AB4LThCe0Wdu7T9xQhM4AFwLJxWJih0Sle5Say_59MQ',DL_BASE:'https://corsproxy.io/?http://dreamlo.com/lb'
};
const growthNeeded=l=>{
  const baseNeed=2.8+l*1.25;
  const lateGameDiscount=Math.max(0,l-8)*0.55;
  return Math.max(5,baseNeed-lateGameDiscount);
};
const $=id=>document.getElementById(id);

// Sound
class Snd{
  constructor(){this.ctx=null}
  init(){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
  play(freq,dur,type='sine',vol=0.15){
    if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=vol;
    g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+dur);
    o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+dur);
  }
  eat(){this.play(880,0.1);setTimeout(()=>this.play(1100,0.1),60)}
  levelUp(){[0,100,200,300].forEach((d,i)=>setTimeout(()=>this.play(440*(1+i*0.2),0.15),d))}
  die(){this.play(300,0.3,'sawtooth',0.1);setTimeout(()=>this.play(200,0.4,'sawtooth',0.1),200)}
}

// Particles
class Particles{
  constructor(){this.ps=[]}
  emit(x,y,col,n=8){
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=Math.random()*3+1;
      this.ps.push({x,y,vx:Math.cos(a)*s*60,vy:Math.sin(a)*s*60-40,
        life:1,col,sz:Math.random()*4+2});}
  }
  update(dt){this.ps=this.ps.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.life-=dt*2;return p.life>0})}
  draw(ctx){this.ps.forEach(p=>{ctx.globalAlpha=p.life;ctx.fillStyle=p.col;
    const r=p.sz*p.life;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);ctx.globalAlpha=1})}
}

// Food
const foodCache={};
function getFoodCache(type,sz){
  const k=type.e;if(foodCache[k])return foodCache[k];
  const c=document.createElement('canvas');c.width=sz*2.5;c.height=sz*2.5;
  const ctx=c.getContext('2d');
  ctx.font=sz+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(type.e,sz*1.25,sz*1.25);
  foodCache[k]=c;return c;
}

class Food{
  constructor(type,x,sp){this.type=type;this.x=x;this.y=-30;this.sp=sp;
    this.sz=type.deadly?28:24;this.rot=0;this.dead=false}
  update(dt){this.y+=this.sp*dt;this.rot+=dt*2;if(this.y>C.H+40)this.dead=true}
  draw(ctx){ctx.save();ctx.translate(this.x,this.y);ctx.rotate(Math.sin(this.rot)*0.2);
    const cache=getFoodCache(this.type,this.sz);
    ctx.drawImage(cache,-this.sz*1.25,-this.sz*1.25);
    if(this.type.deadly){ctx.globalAlpha=0.3+Math.sin(this.rot*3)*0.15;
      ctx.fillStyle='#00ff00';ctx.beginPath();ctx.arc(0,0,this.sz*0.6,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
    ctx.restore()}
}

// Chick
let chickCache={false:null,true:null};
function getChickCache(isAdult){
  if(chickCache[isAdult])return chickCache[isAdult];
  const c=document.createElement('canvas');c.width=160;c.height=160;
  const ctx=c.getContext('2d');ctx.translate(80,80);
  const temp=new Chick();
  if(isAdult)temp.drawChicken(ctx,100);else temp.drawBaby(ctx,100);
  chickCache[isAdult]=c;return c;
}
class Chick{
  constructor(){this.reset()}
  reset(){this.x=C.W/2;this.y=C.H-80;this.lv=1;this.growth=0;this.sz=C.BASE;this.bob=0;this.pulse=0}
  get w(){return this.sz*(1+this.lv*0.64)}
  update(dt,dir){
    this.x+=dir*C.SPD*dt;
    const limit=Math.min(this.w/2, 40);
    this.x=Math.max(limit,Math.min(C.W-limit,this.x));
    this.bob+=dt*5;this.y=C.H-80+Math.sin(this.bob)*3;
    if(this.pulse>0)this.pulse-=dt*3;
  }
  addGrowth(g,snd){
    this.growth+=g;const need=growthNeeded(this.lv);
    if(this.growth>=need){this.growth-=need;this.lv++;this.pulse=1;snd.levelUp();return true}
    return false;
  }
  draw(ctx){
    const s=this.w,px=1+this.pulse*0.2;ctx.save();ctx.translate(this.x,this.y);
    const isAdult=this.lv>=C.CHKN;const cache=getChickCache(isAdult);
    const scale=(s*px)/100;ctx.scale(scale,scale);
    ctx.drawImage(cache,-80,-80);
    ctx.restore();
  }
  drawBaby(ctx,s){
    const r=s/2;
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.beginPath();ctx.ellipse(0,r*0.9,r*0.7,r*0.2,0,0,Math.PI*2);ctx.fill();
    // feet
    ctx.strokeStyle='#E65100';ctx.lineWidth=2;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-r*0.3,r*0.5);ctx.lineTo(-r*0.4,r*0.8);ctx.moveTo(-r*0.4,r*0.8);ctx.lineTo(-r*0.55,r*0.85);ctx.stroke();
    ctx.beginPath();ctx.moveTo(r*0.3,r*0.5);ctx.lineTo(r*0.4,r*0.8);ctx.moveTo(r*0.4,r*0.8);ctx.lineTo(r*0.55,r*0.85);ctx.stroke();
    // body
    ctx.fillStyle='#FFD600';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FFF176';ctx.beginPath();ctx.arc(-r*0.1,-r*0.1,r*0.5,0,Math.PI*2);ctx.fill();
    // wing
    ctx.fillStyle='#FFC107';ctx.beginPath();ctx.ellipse(-r*0.8,r*0.1,r*0.35,r*0.2,-.3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(r*0.8,r*0.1,r*0.35,r*0.2,.3,0,Math.PI*2);ctx.fill();
    // eyes
    ctx.fillStyle='#333';ctx.beginPath();ctx.arc(-r*0.3,-r*0.2,r*0.1,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(r*0.3,-r*0.2,r*0.1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-r*0.27,-r*0.24,r*0.04,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(r*0.33,-r*0.24,r*0.04,0,Math.PI*2);ctx.fill();
    // beak
    ctx.fillStyle='#FF6F00';ctx.beginPath();ctx.moveTo(0,-r*0.05);ctx.lineTo(r*0.15,r*0.12);ctx.lineTo(-r*0.15,r*0.12);ctx.fill();
    // blush
    ctx.fillStyle='rgba(255,100,100,0.3)';ctx.beginPath();ctx.arc(-r*0.45,r*0.05,r*0.12,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(r*0.45,r*0.05,r*0.12,0,Math.PI*2);ctx.fill();
    // tuft
    ctx.strokeStyle='#FFD600';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,-r);ctx.quadraticCurveTo(r*0.1,-r*1.4,r*0.05,-r*1.3);ctx.stroke();
  }
  drawChicken(ctx,s){
    s*=1.2;
    const r=s/2;
    ctx.fillStyle='rgba(0,0,0,0.15)';ctx.beginPath();ctx.ellipse(0,r*0.85,r*0.7,r*0.15,0,0,Math.PI*2);ctx.fill();
    // legs
    ctx.strokeStyle='#E65100';ctx.lineWidth=3;ctx.lineCap='round';
    [-1,1].forEach(d=>{ctx.beginPath();ctx.moveTo(d*r*0.3,r*0.4);ctx.lineTo(d*r*0.35,r*0.75);
      ctx.moveTo(d*r*0.35,r*0.75);ctx.lineTo(d*r*0.2,r*0.85);ctx.moveTo(d*r*0.35,r*0.75);ctx.lineTo(d*r*0.5,r*0.85);ctx.stroke()});
    // tail
    ctx.fillStyle='#5D4037';[-0.3,0,0.3].forEach(a=>{ctx.beginPath();ctx.ellipse(-r*0.6,r*-0.1,r*0.15,r*0.5,a-0.5,0,Math.PI*2);ctx.fill()});
    // body
    ctx.fillStyle='#FFF8E1';ctx.beginPath();ctx.ellipse(0,0,r*0.85,r*0.7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FFECB3';ctx.beginPath();ctx.ellipse(0,r*0.15,r*0.55,r*0.45,0,0,Math.PI*2);ctx.fill();
    // head
    ctx.fillStyle='#FFF8E1';ctx.beginPath();ctx.arc(r*0.3,-r*0.55,r*0.4,0,Math.PI*2);ctx.fill();
    // comb
    ctx.fillStyle='#F44336';[-0.1,0.05,0.2].forEach(o=>{ctx.beginPath();ctx.arc(r*(0.3+o),-r*0.95+Math.abs(o)*r*0.3,r*0.1,0,Math.PI*2);ctx.fill()});
    // wattle
    ctx.beginPath();ctx.ellipse(r*0.5,-r*0.3,r*0.06,r*0.1,0,0,Math.PI*2);ctx.fill();
    // eye
    ctx.fillStyle='#333';ctx.beginPath();ctx.arc(r*0.42,-r*0.55,r*0.06,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(r*0.44,-r*0.57,r*0.025,0,Math.PI*2);ctx.fill();
    // beak
    ctx.fillStyle='#FF8F00';ctx.beginPath();ctx.moveTo(r*0.65,-r*0.5);ctx.lineTo(r*0.85,-r*0.45);ctx.lineTo(r*0.65,-r*0.38);ctx.fill();
    // wing
    ctx.fillStyle='#FFE0B2';ctx.beginPath();ctx.ellipse(-r*0.15,r*0.05,r*0.45,r*0.3,-0.2,0,Math.PI*2);ctx.fill();
  }
}

// Background
let bgCache=null;
function getBgCache(){
  if(bgCache)return bgCache;
  const c=document.createElement('canvas');c.width=C.W;c.height=C.H;
  const ctx=c.getContext('2d');
  const grd=ctx.createLinearGradient(0,0,0,C.H);
  grd.addColorStop(0,'#87CEEB');grd.addColorStop(0.6,'#B3E5FC');grd.addColorStop(1,'#E1F5FE');
  ctx.fillStyle=grd;ctx.fillRect(0,0,C.W,C.H);
  ctx.fillStyle='#66BB6A';ctx.fillRect(0,C.H-60,C.W,60);
  ctx.fillStyle='#4CAF50';for(let i=0;i<C.W;i+=20){
    ctx.beginPath();ctx.arc(i,C.H-60,12,Math.PI,0);ctx.fill();}
  ctx.fillStyle='#43A047';ctx.fillRect(0,C.H-30,C.W,30);
  ctx.fillStyle='#FFEB3B';[[40,C.H-45],[120,C.H-50],[300,C.H-42],[420,C.H-48]].forEach(([fx,fy])=>{
    ctx.beginPath();ctx.arc(fx,fy,4,0,Math.PI*2);ctx.fill();});
  bgCache=c;return bgCache;
}
function drawBg(ctx,t){
  ctx.drawImage(getBgCache(),0,0);
  // clouds
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.7)';
  [[80,60,40],[250,90,30],[400,50,35],[150,140,25]].forEach(([bx,by,br])=>{
    const x=(bx+t*8)%( C.W+100)-50;
    ctx.beginPath();ctx.arc(x,by,br,0,Math.PI*2);ctx.arc(x+br*0.7,by-br*0.2,br*0.7,0,Math.PI*2);
    ctx.arc(x-br*0.5,by+br*0.1,br*0.6,0,Math.PI*2);ctx.fill();
  });
  ctx.restore();
}

// Leaderboard API
class LB{
  static todayTag(){const d=new Date();return d.getFullYear().toString()+(d.getMonth()+1).toString().padStart(2,'0')+d.getDate().toString().padStart(2,'0')}
  static async submit(name,score,lv,time){
    if(!C.DL_PRI)return;
    const cleanName=(name.replace(/[^a-zA-Z0-9\u3000-\u9FFF\u4E00-\u9FFF\uF900-\uFAFF]/g,'').slice(0,12)||'NoName')+'_'+LB.todayTag();
    const n=encodeURIComponent(cleanName);
    try{await fetch(`${C.DL_BASE}/${C.DL_PRI}/add/${n}/${score}/${time}/${lv}`)}catch(e){console.warn('LB submit fail',e)}
  }
  static async get(){
    if(!C.DL_PUB)return[];
    try{const r=await fetch(`${C.DL_BASE}/${C.DL_PUB}/json/100`);const d=await r.json();
      if(!d.dreamlo||!d.dreamlo.leaderboard||!d.dreamlo.leaderboard.entry)return[];
      const e=d.dreamlo.leaderboard.entry;return Array.isArray(e)?e:[e];
    }catch(e){console.warn('LB get fail',e);return[];}
  }
  static filterToday(entries){
    const tag='_'+LB.todayTag();
    return entries.filter(e=>e.name&&e.name.includes(tag));
  }
}

// Main Game
class Game{
  constructor(){
    this.cvs=$('game-canvas');this.ctx=this.cvs.getContext('2d');
    this.snd=new Snd();this.ptc=new Particles();this.chick=new Chick();
    this.foods=[];this.score=0;this.time=0;this.running=false;this.paused=false;this.dir=0;
    this.spawnTimer=0;this.spawnInt=C.SI;this.shake=0;this.prevScreen='start';
    this.username='';this.touchX=null;
    this.cvs.width=C.W;this.cvs.height=C.H;
    this.resize();window.addEventListener('resize',()=>this.resize());
    this.bindInput();this.bindUI();this.lastT=0;
    requestAnimationFrame(t=>this.loop(t));
  }
  resize(){
    const cw=window.innerWidth,ch=window.innerHeight,s=Math.min(cw/C.W,ch/C.H,1.5);
    this.cvs.style.width=C.W*s+'px';this.cvs.style.height=C.H*s+'px';this.scl=s;
  }
  bindInput(){
    const keys={};
    window.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(e.key==='p'||e.key==='P'||e.key==='Escape')this.togglePause()});
    window.addEventListener('keyup',e=>keys[e.key]=false);
    this.getDir=()=>{let d=0;if(keys['ArrowLeft']||keys['a']||keys['A'])d=-1;if(keys['ArrowRight']||keys['d']||keys['D'])d+=1;return d};
    // Touch
    const getX=e=>{const r=this.cvs.getBoundingClientRect();return(e.touches[0].clientX-r.left)/this.scl};
    this.cvs.addEventListener('touchstart',e=>{e.preventDefault();this.touchX=getX(e);this.snd.init()},{passive:false});
    this.cvs.addEventListener('touchmove',e=>{e.preventDefault();this.touchX=getX(e)},{passive:false});
    this.cvs.addEventListener('touchend',()=>this.touchX=null);
    this.cvs.addEventListener('mousedown',()=>this.snd.init());
  }
  bindUI(){
    $('start-btn').onclick=()=>{this.snd.init();this.username=$('username-input').value.trim()||'ひよこマスター';this.showScreen('tutorial')};
    $('pause-btn').onclick=()=>this.togglePause();
    const po=$('pause-overlay');if(po)po.onclick=()=>this.togglePause();
    $('tutorial-start-btn').onclick=()=>this.start();
    $('tutorial-back-btn').onclick=()=>this.showScreen('start');
    $('retry-btn').onclick=()=>this.start();
    $('title-btn').onclick=()=>this.showScreen('start');
    $('ranking-btn').onclick=()=>{this.prevScreen='start';this.showRanking()};
    $('gameover-ranking-btn').onclick=()=>{this.prevScreen='gameover';this.showRanking()};
    $('clear-ranking-btn').onclick=()=>{this.prevScreen='gameclear';this.showRanking()};
    $('clear-title-btn').onclick=()=>this.showScreen('start');
    $('ranking-back-btn').onclick=()=>this.showScreen(this.prevScreen);
  }
  showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    if(id)$(id+'-screen').classList.add('active');
    $('hud').classList.toggle('hidden',id!==null&&id!=='game');
    if(id==='tutorial')this.drawTutorial();
  }
  drawTutorial(){
    const cvs=$('tutorial-canvas');if(!cvs)return;
    const ctx=cvs.getContext('2d');ctx.clearRect(0,0,cvs.width,cvs.height);
    const temp=new Chick();
    // ひよこ
    ctx.save();ctx.translate(75,65);
    temp.drawBaby(ctx,45);
    ctx.beginPath();ctx.arc(0,0, 22.5*0.7,0,Math.PI*2);ctx.setLineDash([4,4]);ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(0,0, 22.5*0.45,0,Math.PI*2);ctx.setLineDash([]);ctx.fillStyle='rgba(0,255,0,0.4)';ctx.fill();ctx.strokeStyle='#00FF00';ctx.stroke();
    ctx.font='16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#000';
    ctx.fillText('🍚', 25, -25);ctx.fillText('💀', 0, 0);
    ctx.fillStyle='#fff';ctx.fillText('ひよこ(Lv.1)',0,65);
    ctx.restore();
    // にわとり
    ctx.save();ctx.translate(225,65);
    temp.drawChicken(ctx,90);
    ctx.beginPath();ctx.arc(0,0, 45*0.7,0,Math.PI*2);ctx.setLineDash([4,4]);ctx.strokeStyle='#FFD700';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(0,0, 45*0.45,0,Math.PI*2);ctx.setLineDash([]);ctx.fillStyle='rgba(0,255,0,0.4)';ctx.fill();ctx.strokeStyle='#00FF00';ctx.stroke();
    ctx.font='16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#000';
    ctx.fillText('🍚', 45, -45);ctx.fillText('💀', 0, 0);
    ctx.fillStyle='#fff';ctx.fillText('にわとり(Lv.12~)',0,65);
    ctx.restore();
  }
  start(){
    this.chick.reset();this.foods=[];this.score=0;this.time=0;this.spawnInt=C.SI;
    this.spawnTimer=0;this.shake=0;this.running=true;this.paused=false;this.touchX=null;
    this.showScreen(null);$('hud').classList.remove('hidden');$('pause-btn').textContent='⏸';this.updateHUD();
  }
  updateHUD(){
    $('score-value').textContent=Math.floor(this.score);
    const emoji=this.chick.lv>=C.CHKN?'🐔':this.chick.lv>=8?'🐥':'🐤';
    $('level-text').textContent=`Lv.${this.chick.lv} ${emoji}`;
    const pct=Math.min(100,this.chick.growth/growthNeeded(this.chick.lv)*100);
    $('growth-bar').style.width=pct+'%';
  }
  spawnFood(){
    const lv=this.chick.lv,rotChance=Math.min(0.35,C.ROT0+C.ROT_INC*lv);
    const isRotten=Math.random()<rotChance;
    let type;
    if(isRotten){type=C.ROTTEN}else{
      const r=Math.random()*85,foods=Object.values(C.FOODS);let cum=0;type=foods[0];
      for(const f of foods){cum+=f.w;if(r<=cum){type=f;break}}
    }
    const margin=30,x=margin+Math.random()*(C.W-margin*2);
    const sp=(C.FSPD+lv*6)*type.s;
    this.foods.push(new Food(type,x,sp));
  }
  checkCollision(f){
    const cw=this.chick.w,dx=f.x-this.chick.x,dy=f.y-this.chick.y;
    const hitMult=f.type.deadly?0.45:0.7;
    return Math.sqrt(dx*dx+dy*dy)<(cw/2+f.sz/2)*hitMult;
  }
  gameOver(){
    this.running=false;this.snd.die();this.shake=0.5;
    const emoji=this.chick.lv>=C.CHKN?'🐔':'🐤';
    $('gameover-chick').textContent=emoji;
    $('final-score').textContent=Math.floor(this.score);
    $('final-level').textContent='Lv.'+this.chick.lv;
    $('final-time').textContent=Math.floor(this.time)+'秒';
    const st=$('score-submit-status');
    if(C.DL_PRI){st.textContent='スコア送信中...';
      LB.submit(this.username,Math.floor(this.score),this.chick.lv,Math.floor(this.time)).then(()=>st.textContent='✅ スコア送信完了！').catch(()=>st.textContent='❌ 送信失敗')
    }else{st.textContent=''}
    setTimeout(()=>this.showScreen('gameover'),600);
  }
  gameClear(){
    this.running=false;this.score+=100000;
    [0,200,400,600,800].forEach(d=>setTimeout(()=>this.snd.levelUp(),d));
    $('clear-score').textContent=Math.floor(this.score);
    const st=$('clear-submit-status');
    if(C.DL_PRI){st.textContent='スコア送信中...';
      LB.submit(this.username,Math.floor(this.score),this.chick.lv,Math.floor(this.time)).then(()=>st.textContent='✅ スコア送信完了！').catch(()=>st.textContent='❌ 送信失敗')
    }else{st.textContent=''}
    setTimeout(()=>this.showScreen('gameclear'),1500);
  }
  async showRanking(){
    this.showScreen('ranking');$('ranking-loading').classList.remove('hidden');
    $('ranking-table').classList.add('hidden');$('ranking-error').classList.add('hidden');
    $('ranking-tabs').classList.add('hidden');
    if(!C.DL_PUB){$('ranking-loading').classList.add('hidden');
      $('ranking-error').textContent='ランキングはdreamloのAPIキー設定後に利用可能になります。';$('ranking-error').classList.remove('hidden');return}
    const entries=await LB.get();$('ranking-loading').classList.add('hidden');
    if(!entries.length){$('ranking-error').textContent='まだランキングデータがありません。';$('ranking-error').classList.remove('hidden');return}
    this._allEntries=entries;
    $('ranking-tabs').classList.remove('hidden');
    this._showRankingTab('today');
  }
  _showRankingTab(tab){
    $('tab-today').classList.toggle('tab-active',tab==='today');
    $('tab-all').classList.toggle('tab-active',tab==='all');
    const entries=tab==='today'?LB.filterToday(this._allEntries).slice(0,5):this._allEntries.slice(0,20);
    const tb=$('ranking-tbody');tb.innerHTML='';
    if(!entries.length){
      $('ranking-table').classList.add('hidden');
      $('ranking-error').textContent=tab==='today'?'本日のデータはまだありません。':'まだランキングデータがありません。';
      $('ranking-error').classList.remove('hidden');return;
    }
    $('ranking-error').classList.add('hidden');
    entries.forEach((e,i)=>{const tr=document.createElement('tr');
      const dName=e.name.split('_')[0];
      let lvStr='-',timeStr='-';
      if(e.text){lvStr=e.text;timeStr=e.seconds?e.seconds+'秒':'-';}
      else if(e.seconds){lvStr=e.seconds;}
      tr.innerHTML=`<td>${i+1}</td><td>${dName}</td><td>${e.score}</td><td>${lvStr}</td><td>${timeStr}</td>`;tb.appendChild(tr)});
    $('ranking-table').classList.remove('hidden');
  }
  update(dt){
    this.ptc.update(dt);if(this.shake>0)this.shake-=dt;
    if(!this.running||this.paused)return;
    this.time+=dt;this.score+=10*dt;
    // input
    let dir=this.getDir();
    if(this.touchX!==null){const diff=this.touchX-this.chick.x;dir=diff>10?1:diff<-10?-1:0}
    this.chick.update(dt,dir);
    if(this.chick.w>=C.W){this.gameClear();return;}
    // spawn
    this.spawnTimer+=dt*1000;if(this.spawnTimer>=this.spawnInt){this.spawnTimer=0;this.spawnFood();
      this.spawnInt=Math.max(C.SI_MIN,this.spawnInt*0.998)}
    // food
    this.foods.forEach(f=>f.update(dt));
    this.foods=this.foods.filter(f=>{
      if(f.dead)return false;
      if(this.checkCollision(f)){
        if(f.type.deadly){this.ptc.emit(f.x,f.y,'#00ff00',15);this.gameOver();return false}
        this.score+=f.type.p*this.chick.lv;
        if(this.chick.addGrowth(f.type.g,this.snd)){this.score+=this.chick.lv*200;}
        this.snd.eat();this.ptc.emit(f.x,f.y,'#FFD600',10);this.updateHUD();return false;
      }return true;
    });
  }
  render(){
    const ctx=this.ctx;ctx.save();
    if(this.shake>0){const s=this.shake*8;ctx.translate(Math.random()*s-s/2,Math.random()*s-s/2)}
    drawBg(ctx,this.time);
    this.foods.forEach(f=>f.draw(ctx));this.chick.draw(ctx);this.ptc.draw(ctx);
    ctx.restore();
  }
  togglePause(){
    if(!this.running)return;
    this.paused=!this.paused;
    $('pause-btn').textContent=this.paused?'▶':'⏸';
    const overlay=$('pause-overlay');
    if(overlay)overlay.classList.toggle('hidden',!this.paused);
  }
  loop(t){
    const dt=Math.min((t-this.lastT)/1000,0.05);this.lastT=t;
    this.update(dt);this.render();
    requestAnimationFrame(t2=>this.loop(t2));
  }
}
window.addEventListener('DOMContentLoaded',()=>{window.game=new Game();});
