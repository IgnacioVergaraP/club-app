const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-frontend412-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let acceptDialog=true;let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-18',browser:'Chrome Headless real, isolated profile; local Angular development; no payment session created',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],writes:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'admin-review.json',JSON.stringify(report,null,2));}
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


 async function input(sel,value){await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('blur'));})()`);await delay(70);}
 for(const width of [320,390,768,1280]){
  phase='schedule-'+width;await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await nav('/admin/eventos/nuevo','app-admin-event-form');await input('#event-name','Noche revisión');await click('#wizard-next');await until(()=>ev("!!document.querySelector('#event-date')"),'date step');
  await input('#event-end','06:00');await input('#event-date','2026-11-28');
  assert.equal(await ev("document.querySelector('#event-end-date').value"),'2026-11-29');
  const r=await ev(`(()=>{const panel=document.querySelector('.date-step');return{overflow:document.documentElement.scrollWidth>innerWidth,heading:panel.querySelector('h2').textContent,groups:panel.querySelectorAll('fieldset').length,helpOpen:panel.querySelector('details').open,summary:panel.querySelector('.schedule-summary').textContent,fields:[...panel.querySelectorAll('input[type=date],input[type=time]')].map(i=>{const r=i.getBoundingClientRect(),p=i.closest('fieldset').getBoundingClientRect();return{id:i.id,height:r.height,width:r.width,inside:r.left>=p.left-1&&r.right<=p.right+1}})}})()`);
  assert.equal(r.overflow,false,phase);assert.equal(r.groups,2);assert.equal(r.helpOpen,false);assert(r.summary.includes('sábado 23:00 → domingo 06:00'),r.summary);assert(r.fields.every(f=>f.height===44&&f.inside),JSON.stringify(r.fields));
  report.matrix.push({width,...r});await ev("document.querySelector('.date-step').scrollIntoView({block:'start'})");await delay(100);const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=phase+'.png';fs.writeFileSync(out+file,Buffer.from(shot.data,'base64'));report.screenshots.push(file);
  // Preserve an explicitly entered end when the start changes.
  await input('#event-date','2026-11-27');assert.equal(await ev("document.querySelector('#event-end-date').value"),'2026-11-29');
  await click('#wizard-next');assert(await ev("!!document.querySelector('.date-step #schedule-error')"));
  await input('#event-date','2026-11-28');await click('#wizard-next');assert(await ev("!!document.querySelector('app-admin-event-tickets')"));
  await ev("[...document.querySelectorAll('.step-actions button')].find(b=>b.textContent.includes('Atrás')).click()");await delay(100);assert.equal(await ev("document.querySelector('#event-date').value"),'2026-11-28');
  await ev("document.querySelector('.schedule-help summary').focus()");await key('Enter');assert.equal(await ev("document.querySelector('.schedule-help').open"),true);
 }
 report.keyboard.push('Collapsible help opens with Enter; Back/Continue preserve values; invalid >24h blocks progress');assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.equal(report.httpErrors.length,0,JSON.stringify(report.httpErrors));assert.equal(report.writes.length,0);report.result='PASS';save();console.log(JSON.stringify({result:'PASS',matrix:report.matrix.length,screenshots:report.screenshots.length}));
})().catch(e=>{report.result='FAIL';report.failure=String(e.stack||e);save();console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome.kill('SIGTERM');});
