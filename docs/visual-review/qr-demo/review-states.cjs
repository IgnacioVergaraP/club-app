const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-audit36-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-10',browser:'Chrome Headless real, isolated profile; local Angular development and Flask',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'qr-states.json',JSON.stringify(report,null,2));}
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error('CDP timeout '+method));},20000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));});}
async function ev(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(fn,label){const end=Date.now()+30000;while(Date.now()<end){if(await fn())return;await delay(100);}throw Error('Timeout '+label);}
async function click(sel){await ev(`document.querySelector(${JSON.stringify(sel)}).click()`);await delay(140);}
async function nav(route,sel){await send('Page.navigate',{url:'http://localhost:4200'+route});await until(()=>ev(`!!document.querySelector(${JSON.stringify(sel)})`),route);await delay(150);}
async function key(k,code=k){const v={Enter:13,Tab:9,ArrowRight:39,ArrowLeft:37,Home:36,End:35}[k]||0;await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode:v,nativeVirtualKeyCode:v,...(k==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode:v,nativeVirtualKeyCode:v});await delay(70);}
async function shot(label){await ev('window.scrollTo(0,0)');await delay(100);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=label+'.png';fs.writeFileSync(out+file,Buffer.from(r.data,'base64'));report.screenshots.push(file);}
async function matrix(label,shots=false){phase=label;for(const width of [320,390,768,1280]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await ev('window.scrollTo(0,document.body.scrollHeight)');await delay(220);
 const row=await ev(`(()=>{const st=getComputedStyle(document.body);const rect=e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,top:r.top,bottom:r.bottom}};
 const vis=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
 const controls=[...document.querySelectorAll('button,a,input,select,summary')].filter(vis);
 const name=e=>e.getAttribute('aria-label')||e.innerText.trim()||e.labels?.[0]?.innerText.trim()||e.getAttribute('title')||'';
 const header=document.querySelector('app-header');
 return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,h1:[...document.querySelectorAll('h1')].map(e=>e.innerText),font:st.fontFamily,background:st.backgroundColor,
 navCount:document.querySelectorAll('.bottom-nav-link').length,activeNav:document.querySelectorAll('.bottom-nav-link.is-active').length,ariaCurrent:document.querySelector('.bottom-nav-link.is-active')?.getAttribute('aria-current'),
 headerTop:header?rect(header).top:null,blur:document.querySelector('.header')?getComputedStyle(document.querySelector('.header')).backdropFilter:null,
 brokenImages:[...document.images].filter(e=>e.complete&&!e.naturalWidth).map(e=>e.getAttribute('src')),
 namelessControls:controls.filter(e=>!name(e)).map(e=>e.outerHTML.slice(0,140)),
 smallControls:controls.filter(e=>rect(e).w<24||rect(e).h<24).slice(0,12).map(e=>({tag:e.tagName,name:name(e),...rect(e)})),
 gradients:[...document.querySelectorAll('main *,app-carrito *,app-checkout *')].filter(e=>getComputedStyle(e).backgroundImage.includes('gradient')).length,
 buttons:controls.filter(e=>e.tagName==='BUTTON').slice(0,4).map(e=>({name:name(e),color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,radius:getComputedStyle(e).borderRadius,...rect(e)}))};})()`);
 report.matrix.push({screen:label,...row});assert(!row.overflow,label+' overflow at '+width);assert(!row.brokenImages.length,label+' broken image');
 if(shots&&[390,1280].includes(width))await shot(label+'-'+width);
 }save();}
async function walletSnapshot(){return await ev(`({tickets:document.querySelector('[data-metric=tickets]').textContent.trim(),drinks:document.querySelector('[data-metric=drinks]').textContent.trim(),refs:[...document.querySelectorAll('.visual-reference strong')].map(e=>e.textContent.trim())})`);}
(async()=>{
 const pf=path.join(profile,'DevToolsActivePort');await until(()=>fs.existsSync(pf),'chrome');const port=fs.readFileSync(pf,'utf8').split('\n')[0];
 const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});
 ws.on('message',raw=>{const m=JSON.parse(raw);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}
 if(m.method==='Runtime.exceptionThrown')report.errors.push({phase,text:m.params.exceptionDetails.text});
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.errors.push({phase,text:m.params.args.map(a=>a.value||a.description||'').join(' ').slice(0,220)});
 if(m.method==='Network.responseReceived'&&m.params.response.status>=400){const u=new URL(m.params.response.url);report.httpErrors.push({phase,host:u.hostname,path:u.pathname,status:m.params.response.status});}});
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');



 await nav('/wallet','.ticket-card');
 for(const [tab,card] of [['tickets','.ticket-card'],['drinks','.drink-card']]){
  await click('#wallet-tab-'+tab);assert(await ev('[...document.querySelectorAll(".record-list details")].every(d=>!d.open)'));
  await ev('document.querySelectorAll(".record-list details").forEach(d=>d.open=true)');
  await until(()=>ev('[...document.querySelectorAll("app-demo-qr img")].every(i=>i.complete&&i.naturalWidth>0)'),'assets');
  for(const width of [320,390,768,1280]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
   const row=await ev(`(()=>{const cards=[...document.querySelectorAll('${card}')];return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,count:document.querySelectorAll('app-demo-qr img').length,buttons:document.querySelectorAll('app-demo-qr button').length,states:cards.map(c=>{const img=c.querySelector('app-demo-qr img').getBoundingClientRect(),badge=c.querySelector('.qr-status'),top=c.querySelector('.status');if(!badge)return {status:top.textContent,overlay:false};const r=badge.getBoundingClientRect();return {status:top.textContent,overlay:true,label:badge.textContent,centered:Math.abs((r.left+r.width/2)-(img.left+img.width/2))<1&&Math.abs((r.top+r.height/2)-(img.top+img.height/2))<1,sameBackground:getComputedStyle(badge).backgroundColor===getComputedStyle(top).backgroundColor};})};})()`);
   assert(row.scrollWidth<=width);assert.equal(row.count,3);assert.equal(row.buttons,0);assert(!row.states[0].overlay);for(const state of row.states.slice(1)){assert(state.centered&&state.sameBackground);assert.equal(state.label,state.status)}
   report.matrix.push({section:tab,...row});
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  for(let i=0;i<3;i++){await ev(`document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('app-demo-qr img')[${i}].scrollIntoView({block:'center',behavior:'instant'})`);await delay(100);const shot=await send('Page.captureScreenshot',{format:'png'});const file=tab+'-status-'+i+'-390.png';fs.writeFileSync(out+file,Buffer.from(shot.data,'base64'));report.screenshots.push(file);}
 }
 await click('#wallet-tab-history');assert(await ev('document.querySelectorAll("app-demo-qr").length===0'));report.checks.push({check:'History has no QR',result:'PASS'});
 report.result='PASS';save();console.log(JSON.stringify({result:report.result,matrix:report.matrix.length,errors:report.errors,httpErrors:report.httpErrors}));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(JSON.stringify(report.failure));process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
