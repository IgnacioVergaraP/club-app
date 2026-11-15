const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-wizard42ux-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let acceptDialog=true;let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-14',browser:'Chrome Headless real, isolated profile; local Angular development; no payment session created',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],writes:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'image-upload-review.json',JSON.stringify(report,null,2));}
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error('CDP timeout '+method));},20000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}));});}
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







async function set(selector,value){await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input '+${JSON.stringify(selector)});if(e.type==='checkbox')e.checked=${JSON.stringify(value)};else e.value=${JSON.stringify(value)};e.dispatchEvent(new Event(e.type==='checkbox'||e.tagName==='SELECT'?'change':'input',{bubbles:true}));e.dispatchEvent(new Event('blur',{bubbles:true}));})()`);await delay(65);}
async function matrix(label,full=false){phase=label;for(const width of [320,390,768,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await delay(80);const row=await ev(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overlay:!!document.querySelector('vite-error-overlay'),title:document.querySelector('h1')?.textContent,step:document.querySelector('#wizard-step-heading')?.textContent})`);assert(!row.overlay,'Development overlay on '+label);assert(row.scrollWidth<=width,label+' overflow '+width);report.matrix.push({screen:label,...row});if([390,1280].includes(width)){await shot(label+'-'+width);if(full){const m=await send('Page.getLayoutMetrics');const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(m.cssContentSize.height),scale:1}});const file=label+'-full-'+width+'.png';fs.writeFileSync(out+file,Buffer.from(r.data,'base64'));report.screenshots.push(file);}}}}
async function uploadImage(file){const doc=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#event-image'});await send('DOM.setFileInputFiles',{nodeId,files:[file]});await until(()=>ev('!document.querySelector("input[type=file][aria-busy=true]")'),'image loading');await delay(100);}
async function next(){await click('#wizard-next');}
async function stepIs(text){assert((await ev('document.querySelector("#wizard-step-heading").textContent')).includes(text));}
async function addTicket(name,price,capacity,max){await click('.add-ticket');await set('.ticket-editor [formControlName=name]',name);await set('.ticket-editor [formControlName=priceClp]',price);await set('.ticket-editor [formControlName=capacity]',capacity);await ev('document.querySelector(".ticket-editor details").open=true');await set('.ticket-editor [formControlName=maxPerPurchase]',max);await click('.done-ticket');}


 fs.writeFileSync(path.join(os.tmpdir(),'void-upload-invalid.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
 await nav('/admin/eventos/nuevo','app-admin-event-form');await set('#event-name','Imagen local QA');
 assert.equal(await ev('document.querySelector("#event-image").type'),'file');
 await uploadImage(path.join(__dirname,'../../../frontend/src/assets/events/void-dj.jpg'));
 await until(()=>ev('document.querySelector("app-admin-event-preview img").getAttribute("src").startsWith("data:image/jpeg;base64,")'),'image preview');
 assert(await ev('[...document.querySelectorAll("app-admin-event-preview img")].every(i=>i.complete&&i.naturalWidth>0)'));
 const original=await ev('document.querySelector("app-admin-event-preview img").getAttribute("src")');
 await matrix('image-upload',true);
 await uploadImage(path.join(os.tmpdir(),'void-upload-invalid.svg'));assert((await ev('document.querySelector("#image-error").textContent')).includes('JPG, PNG o WEBP'));
 assert.equal(await ev('document.querySelector("app-admin-event-preview img").getAttribute("src")'),original);
 await click('#wizard-save-draft');await until(()=>ev('!!document.querySelector("app-admin-event-detail")'),'saved');assert.equal(await ev('document.querySelector(".detail>img").getAttribute("src")'),original);
 await click('a[href$="/editar"]');await until(()=>ev('!!document.querySelector("#event-image")'),'edit');assert.equal(await ev('document.querySelector("app-admin-event-preview img").getAttribute("src")'),original);
 await click('a[href="/admin/eventos"]');await until(()=>ev('!!document.querySelector("app-admin-events")'),'list');await set('input[type=search]','Imagen local QA');await click('.actions button');await until(()=>ev('!!document.querySelector("#event-image")'),'duplicate');assert.equal(await ev('document.querySelector("app-admin-event-preview img").getAttribute("src")'),original);
 report.checks.push('Actual file input selection, JPEG preview decoded, invalid SVG rejected preserving prior image, draft/edit/duplicate retain image in memory');
 assert.equal(report.writes.length,0);assert.equal(report.errors.length,0);assert.equal(report.httpErrors.length,0);report.result='PASS';save();console.log(JSON.stringify({result:report.result,matrix:report.matrix.length,writes:report.writes,errors:report.errors}));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(e);process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
