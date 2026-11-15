const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-admin44-reference-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let acceptDialog=true;let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-14',browser:'Chrome Headless real, isolated profile; local Angular development; no payment session created',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],writes:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'sales-reference-review.json',JSON.stringify(report,null,2));}
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error('CDP timeout '+method));},45000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));});}
async function ev(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(fn,label){const end=Date.now()+30000;while(Date.now()<end){if(await fn())return;await delay(100);}throw Error('Timeout '+label);}
async function click(sel){await ev(`document.querySelector(${JSON.stringify(sel)}).click()`);await delay(140);}
async function nav(route,sel){await send('Page.navigate',{url:'http://localhost:4300'+route});await until(()=>ev(`!!document.querySelector(${JSON.stringify(sel)})`),route);await delay(150);}
async function key(k,code=k){const v={Enter:13,Tab:9,ArrowRight:39,ArrowLeft:37,Home:36,End:35}[k]||0;await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode:v,nativeVirtualKeyCode:v,...(k==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode:v,nativeVirtualKeyCode:v});await delay(70);}
async function shot(label){await ev('window.scrollTo(0,0)');await delay(100);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=label+'.png';fs.writeFileSync(out+file,Buffer.from(r.data,'base64'));report.screenshots.push(file);}
(async()=>{
 const pf=path.join(profile,'DevToolsActivePort');await until(()=>fs.existsSync(pf),'chrome');const port=fs.readFileSync(pf,'utf8').split('\n')[0];
 const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});
 ws.on('message',raw=>{const m=JSON.parse(raw);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}
 if(m.method==='Page.javascriptDialogOpening'){report.checks.push({dialog:m.params.type,accepted:acceptDialog});send('Page.handleJavaScriptDialog',{accept:acceptDialog}).catch(()=>{});}
 if(m.method==='Network.requestWillBeSent'&&!['GET','HEAD','OPTIONS'].includes(m.params.request.method))report.writes.push({phase,method:m.params.request.method,url:m.params.request.url.split('?')[0]});
 if(m.method==='Runtime.exceptionThrown')report.errors.push({phase,text:m.params.exceptionDetails.text});
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.errors.push({phase,text:m.params.args.map(a=>a.value||a.description||'').join(' ').slice(0,220)});
 if(m.method==='Network.responseReceived'&&m.params.response.status>=400){const u=new URL(m.params.response.url);report.httpErrors.push({phase,host:u.hostname,path:u.pathname,status:m.params.response.status});}});
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');








async function set(selector,value){await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await delay(120);}
async function matrix(label,full=false){phase=label;for(const width of [320,390,768,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});await delay(150);const row=await ev(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.querySelector('h1')?.textContent})`);assert(row.scrollWidth<=width,label+' overflow '+width);report.matrix.push({screen:label,...row});if([390,1280].includes(width)){await shot(label+'-'+width);if(full){const m=await send('Page.getLayoutMetrics');const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(m.cssContentSize.height),scale:1}});const file=label+'-full-'+width+'.png';fs.writeFileSync(out+file,Buffer.from(r.data,'base64'));report.screenshots.push(file);}}}}
const count=()=>ev('document.querySelectorAll("tbody tr").length');
await nav('/admin/ventas','app-admin-sales tbody tr');assert.equal(await count(),5);assert.equal(await ev('document.querySelectorAll("thead th").length'),8);await matrix('sales-reference-list',true);
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});await ev(`document.querySelector('.desktop-list button[data-order="DEMO-ORD-0001"]').focus()`);await key('Enter');assert.equal(await ev('location.pathname'),'/admin/ventas');assert.equal(await ev('document.querySelector("#desktop-order-detail [data-status=approved]").textContent'),'Aprobado');assert.equal(await ev('document.querySelector("#desktop-order-detail [data-status=pending]").textContent'),'Pendiente');await matrix('sales-reference-selected',true);
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});await click('#desktop-order-detail .close-panel');await delay(100);assert.equal(await ev('document.activeElement.dataset.order'),'DEMO-ORD-0001');assert.equal(await ev('document.querySelectorAll("app-admin-sale-panel").length'),0);report.keyboard.push('Enter opens desktop inline detail; Close restores focus to the order button without navigation.');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:960,deviceScaleFactor:1,mobile:false});await ev(`document.querySelector('.mobile-list button[data-order="DEMO-ORD-0002"]').focus()`);await key('Enter');assert.equal(await ev('document.querySelector("#mobile-order-detail [data-status=partial]").textContent'),'Parcial');await matrix('sales-reference-partial',true);
await click('#period-week');assert.equal(await count(),10);assert.equal(await ev('document.querySelectorAll("app-admin-sale-panel").length'),0);assert((await ev('document.querySelector("app-admin-sales-summary").textContent')).includes('$156.000'));await set('#sales-type','mixed');await set('#sales-payment','approved');assert.equal(await count(),1);assert((await ev('document.querySelector("app-admin-sales-summary").textContent')).includes('$29.000'));await matrix('sales-reference-filters');await set('#sales-search','missing');assert.equal(await count(),0);await matrix('sales-reference-empty');await click('.empty button');assert.equal(await count(),5);
await click('#period-custom');const today=await ev('ng.getComponent(document.querySelector("app-admin-sales")).sales.today');await set('#sales-from','2026-01-01');await set('#sales-to',today);assert.equal(await count(),12);await matrix('sales-reference-custom');await set('#sales-from','2099-01-01');assert(await ev('!!document.querySelector("[role=alert]")'));await matrix('sales-reference-invalid');await click('.empty button');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:960,deviceScaleFactor:1,mobile:false});await click('#admin-menu-toggle');assert.equal(await ev('document.querySelector("#admin-menu-toggle").getAttribute("aria-expanded")'),'true');await key('Escape');assert.equal(await ev('document.querySelector("#admin-menu-toggle").getAttribute("aria-expanded")'),'false');report.keyboard.push('Mobile card opens with Enter; changing filters closes stale detail; menu responds to Escape.');
for(const [route,selector,label] of [['/admin','app-admin-dashboard','dashboard'],['/admin/eventos','app-admin-events','events'],['/admin/tragos','app-admin-drinks','drinks'],['/wallet','app-bottom-nav','wallet'],['/checkout/resultado?verified=true','app-payment-result','payment-result']]){await nav(route,selector);await matrix(label+'-regression');}
await nav('/admin/ventas/DEMO-ORD-0001','app-admin-sale-detail');assert((await ev('document.querySelector(".totals").textContent')).includes('$49.000'));await matrix('sales-reference-direct-route');
assert.equal(report.writes.length,0);assert.equal(report.errors.length,0);assert.equal(report.httpErrors.length,0);report.result='PASS';save();console.log(JSON.stringify({result:report.result,matrix:report.matrix.length,screenshots:report.screenshots.length}));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(e);process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
