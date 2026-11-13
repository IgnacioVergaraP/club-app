const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-audit36-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-12',browser:'Chrome Headless real, isolated profile; local Angular development; no payment session created',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],writes:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'admin-browser-41.json',JSON.stringify(report,null,2));}
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error('CDP timeout '+method));},20000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));});}
async function ev(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(fn,label){const end=Date.now()+30000;while(Date.now()<end){if(await fn())return;await delay(100);}throw Error('Timeout '+label);}
async function click(sel){await ev(`document.querySelector(${JSON.stringify(sel)}).click()`);await delay(140);}
async function nav(route,sel){await send('Page.navigate',{url:'http://localhost:4200'+route});await until(()=>ev(`!!document.querySelector(${JSON.stringify(sel)})`),route);await delay(150);}
async function key(k,code=k){const v={Enter:13,Tab:9,ArrowRight:39,ArrowLeft:37,Home:36,End:35}[k]||0;await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode:v,nativeVirtualKeyCode:v,...(k==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode:v,nativeVirtualKeyCode:v});await delay(70);}
async function shot(label){await ev('window.scrollTo(0,0)');await delay(100);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=label+'.png';fs.writeFileSync(out+file,Buffer.from(r.data,'base64'));report.screenshots.push(file);}
(async()=>{
 const pf=path.join(profile,'DevToolsActivePort');await until(()=>fs.existsSync(pf),'chrome');const port=fs.readFileSync(pf,'utf8').split('\n')[0];
 const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});
 ws.on('message',raw=>{const m=JSON.parse(raw);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}
 if(m.method==='Network.requestWillBeSent'&&!['GET','HEAD','OPTIONS'].includes(m.params.request.method))report.writes.push({phase,method:m.params.request.method,url:m.params.request.url.split('?')[0]});
 if(m.method==='Runtime.exceptionThrown')report.errors.push({phase,text:m.params.exceptionDetails.text});
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.errors.push({phase,text:m.params.args.map(a=>a.value||a.description||'').join(' ').slice(0,220)});
 if(m.method==='Network.responseReceived'&&m.params.response.status>=400){const u=new URL(m.params.response.url);report.httpErrors.push({phase,host:u.hostname,path:u.pathname,status:m.params.response.status});}});
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');




 for (const route of ['/admin','/admin/eventos','/admin/tragos','/admin/ventas','/admin/comisiones','/admin/personal','/admin/configuracion']) {
  phase=route;await nav(route,'app-admin-layout h1');
  for(const width of [320,390,768,1280]) {
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await delay(80);
   const row=await ev(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.querySelector('h1').textContent,nav:document.querySelectorAll('app-admin-layout nav a').length,clientNav:document.querySelectorAll('app-bottom-nav').length,active:document.querySelectorAll('nav [aria-current=page]').length})`);
   if(route==='/admin'){assert(await ev('[...document.images].every(i=>i.complete&&i.naturalWidth>0)'));}
   assert(row.scrollWidth<=width);assert.equal(row.nav,7);assert.equal(row.clientNav,0);assert.equal(row.active,1);report.matrix.push({route,...row});
   if(route==='/admin'&&[320,390,768,1280].includes(width)){await shot('dashboard-'+width);if([390,1280].includes(width)){const metrics=await send('Page.getLayoutMetrics');const full=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:width,height:Math.ceil(metrics.cssContentSize.height),scale:1}});const file='dashboard-full-'+width+'.png';fs.writeFileSync(out+file,Buffer.from(full.data,'base64'));report.screenshots.push(file);}}
  }
 }
 await nav('/admin','app-admin-dashboard');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 assert(await ev('getComputedStyle(document.querySelector(".admin-sidebar")).display==="none"'));
 await click('#admin-menu-toggle');assert(await ev('document.querySelector("#admin-menu-toggle").getAttribute("aria-expanded")==="true"'));await shot('mobile-menu-390');
 await key('Escape');assert(await ev('document.querySelector("#admin-menu-toggle").getAttribute("aria-expanded")==="false"'));
 await click('#admin-menu-toggle');await click('nav a[href="/admin/eventos"]');assert(await ev('!document.querySelector(".admin-sidebar").classList.contains("open")'));
 await nav('/admin','app-admin-dashboard');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:844,deviceScaleFactor:1,mobile:false});
 const first=await ev('document.querySelector("[data-metric=sales]").textContent');
 await ev(`const select=document.querySelector('#demo-club');select.value='club-demo-002';select.dispatchEvent(new Event('change',{bubbles:true}))`);await delay(100);
 assert((await ev('document.querySelector("h1").textContent')).includes('Prisma'));
 assert.notEqual(await ev('document.querySelector("[data-metric=sales]").textContent'),first);
 assert(!(await ev('document.querySelector("app-admin-dashboard").textContent')).includes('Piscola'));
 await shot('prisma-1280');
 await ev(`document.querySelector('nav a').focus()`);await key('Tab');assert((await ev('document.activeElement.textContent')).includes('Eventos'));await key('Enter');await delay(150);assert.equal(await ev('document.querySelector("h1").textContent'),'Eventos');
 await ev(`document.querySelector('.client-link').click()`);await until(()=>ev('!!document.querySelector("app-bottom-nav")'),'client return');
 assert.equal(await ev('document.querySelectorAll(".bottom-nav-link").length'),5);report.checks.push('Admin to real client link and keyboard navigation passed');
 for(const route of ['/','/noches','/tragos','/wallet','/perfil']) {
  await nav(route,'app-bottom-nav');
  for(const width of [320,390,768,1280]) {
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await delay(70);
   const row=await ev('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,admin:!!document.querySelector("app-admin-layout"),nav:document.querySelectorAll(".bottom-nav-link").length})');
   assert(row.scrollWidth<=width);assert(!row.admin);assert.equal(row.nav,5);report.matrix.push({route,...row});
  }
 }
 await nav('/admin','app-admin-dashboard');assert((await ev('document.querySelector("h1").textContent')).includes('Órbita'));report.checks.push('Direct reload returns to default DEMO club; client/admin layouts separated');
 assert.equal(report.writes.length,0);assert.equal(report.errors.length,0);
 report.result='PASS';save();console.log(JSON.stringify({result:report.result,matrix:report.matrix.length,errors:report.errors,httpErrors:report.httpErrors,writes:report.writes}));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(JSON.stringify(report.failure));process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
