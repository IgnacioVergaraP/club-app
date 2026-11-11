const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-audit36-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-10',browser:'Chrome Headless real, isolated profile; local Angular development and Flask',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'qr-motion.json',JSON.stringify(report,null,2));}
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
 for(const tab of ['tickets','drinks']){
  await click('#wallet-tab-'+tab);await ev('document.querySelector("app-demo-qr").closest("details").open=true');
  for(const width of [320,390,768,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});const size=await ev('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})');assert(size.scrollWidth<=width);report.matrix.push({section:tab,...size});}
 }
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await ev('document.documentElement.style.scrollBehavior="auto";document.querySelector("app-demo-qr img").scrollIntoView({block:"center",behavior:"instant"})');
 await until(()=>ev('document.querySelector("app-demo-qr img").complete'),'qr loaded');
 const offset=()=>ev('getComputedStyle(document.querySelector(".qr-orbit")).strokeDashoffset');
 const raster=()=>ev(`(()=>{const c=document.createElement('canvas');c.width=c.height=222;c.getContext('2d').drawImage(document.querySelector('app-demo-qr img'),0,0,222,222);return c.toDataURL();})()`);
 const first=await offset(),qrBefore=await raster();await delay(500);const second=await offset();assert.notEqual(first,second);report.checks.push({check:'Border moves',first,second});
 const frame=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'drink-motion-390.png',Buffer.from(frame.data,'base64'));
 await click('.motion-toggle');assert(await ev('getComputedStyle(document.querySelector(".qr-orbit")).animationPlayState==="paused"'));const stopped=await offset();await delay(300);assert.equal(await offset(),stopped);report.checks.push({check:'Pause freezes border',result:'PASS'});
 await click('.motion-toggle');assert(await ev('getComputedStyle(document.querySelector(".qr-orbit")).animationPlayState==="running"'));assert.equal(await raster(),qrBefore);report.checks.push({check:'QR bitmap unchanged during motion/pause',result:'PASS'});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert(await ev('getComputedStyle(document.querySelector(".qr-orbit")).animationName==="none"'));assert(await ev('getComputedStyle(document.querySelector(".motion-toggle")).display==="none"'));report.checks.push({check:'Reduced motion: static border, hidden pause control',result:'PASS'});
 const still=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'drink-reduced-motion-390.png',Buffer.from(still.data,'base64'));
 report.rasterMethod='Unchanged original SVG; animation lives in a separate decorative SVG outside the QR';report.result='PASS';save();console.log(JSON.stringify({result:report.result,checks:report.checks,matrix:report.matrix.length,errors:report.errors}));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(JSON.stringify(report.failure));process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
