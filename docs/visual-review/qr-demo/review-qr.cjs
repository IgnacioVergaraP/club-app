const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-audit36-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-10',browser:'Chrome Headless real, isolated profile; local Angular development and Flask',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'qr-browser.json',JSON.stringify(report,null,2));}
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
 const samples=[];
 for(const [tab,label,expected] of [['tickets','ticket','VOID:DEMO:ENT:001'],['drinks','drink','VOID:DEMO:CON:001']]){
  await click('#wallet-tab-'+tab);await ev('document.querySelector("app-demo-qr").closest("details").open=true');await until(()=>ev('!!document.querySelector("app-demo-qr img")'),'qr');
  for(const width of [320,390,768,1280]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
   await until(()=>ev('[...document.querySelectorAll("app-demo-qr img")].every(e=>e.complete&&e.naturalWidth>0)'),'qr asset');
   const metrics=await ev(`(()=>{const img=document.querySelector('app-demo-qr img');const r=img.getBoundingClientRect();return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,qrWidth:r.width,qrHeight:r.height,src:img.getAttribute('src'),alt:img.alt,count:document.querySelectorAll('app-demo-qr img').length,caption:document.querySelector('app-demo-qr figcaption').innerText,tickets:document.querySelector('[data-metric=tickets]').textContent,drinks:document.querySelector('[data-metric=drinks]').textContent};})()`);
   assert(metrics.scrollWidth<=width);assert.equal(metrics.count,1);assert.equal(metrics.qrWidth,222);assert(metrics.caption.includes(expected));assert(metrics.caption.includes('Sin validez'));
   report.matrix.push({screen:label,...metrics});
   await ev('document.documentElement.style.scrollBehavior="auto";document.querySelector("app-demo-qr img").scrollIntoView({block:"center",behavior:"instant"})');await delay(300);
   const rect=await ev(`(()=>{const r=document.querySelector('app-demo-qr img').getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
   const png=await ev(`(()=>{const img=document.querySelector('app-demo-qr img'),canvas=document.createElement('canvas');canvas.width=222;canvas.height=222;canvas.getContext('2d').drawImage(img,0,0,222,222);return canvas.toDataURL('image/png').split(',')[1];})()`);const qr={data:png};
   const file=label+'-qr-'+width+'.png';fs.writeFileSync(out+file,Buffer.from(qr.data,'base64'));samples.push({file,expected});
   await ev('window.scrollTo(0,0)');const layout=await send('Page.getLayoutMetrics');const full=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:layout.cssContentSize.height,scale:1}});const page=label+'-wallet-'+width+'.png';fs.writeFileSync(out+page,Buffer.from(full.data,'base64'));report.screenshots.push(page);
  }
 }
 await click('#wallet-tab-history');assert(await ev('document.querySelectorAll("app-demo-qr img").length===0'));report.checks.push({check:'No QR in history',result:'PASS'});
 await ev('document.querySelector("#wallet-tab-tickets").focus()');await key('Home');assert(await ev('document.querySelector("#wallet-tab-tickets").getAttribute("aria-selected")==="true"'));report.keyboard.push({check:'Wallet keyboard remains operable',result:'PASS'});
 report.rasterMethod='Browser canvas renders the complete local SVG with logo at its actual displayed 222px size; no navbar overlay in decoder input';report.samples=samples;report.dependenciesInstalled=false;report.result='PASS';save();console.log(JSON.stringify({result:report.result,samples:samples.length,matrix:report.matrix.length,errors:report.errors,httpErrors:report.httpErrors}));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(JSON.stringify(report.failure));process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
