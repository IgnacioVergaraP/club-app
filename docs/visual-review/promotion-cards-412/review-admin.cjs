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


 for(const width of [320,390,768,1280]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await nav('/admin/promociones','app-admin-promotions');
  for(const view of ['promotions','history']){
   phase=view+'-'+width;if(view==='history')await click('#promotion-tab-history');
   const r=await ev(`(()=>{const el=document.querySelector('app-admin-promotions');return {overflow:document.documentElement.scrollWidth>innerWidth,tabs:[...el.querySelectorAll('[role=tab]')].map(t=>t.textContent),selected:[...el.querySelectorAll('[role=tab][aria-selected=true]')].map(t=>t.id),metrics:!!el.querySelector('.metrics'),filters:!!el.querySelector('.filters'),ids:[...el.querySelectorAll('.filters input,.filters select')].map(t=>t.id),rows:el.querySelectorAll('[data-promotion]').length,fab:!!el.querySelector('.admin-create-fab')}})()`);
   assert.equal(r.overflow,false);assert.equal(r.metrics,false);assert.deepEqual(r.tabs,['Promociones','Historial']);assert.deepEqual(r.selected,['promotion-tab-'+view]);assert.equal(r.filters,view==='history');
   if(view==='promotions'){assert.equal(r.rows,5);assert(r.fab);assert.equal(await ev("document.querySelectorAll('.promotion-card').length"),5);const fits=await ev("[...document.querySelectorAll('.card-actions')].every(a=>[...a.children].every(b=>b.getBoundingClientRect().right<=a.getBoundingClientRect().right+1))");assert(fits,'actions fit at '+width);assert.equal(await ev("document.querySelectorAll('app-admin-promotions table:not(.history)').length"),0);}else assert.deepEqual(r.ids,['promotion-search','promotion-filter-type','promotion-filter-audience','promotion-period']);
   report.matrix.push({width,view,...r});await shot(phase);
  }
  await ev("const period=document.querySelector('#promotion-period');period.value='custom';period.dispatchEvent(new Event('change',{bubbles:true}))");await delay(80);assert(await ev("!!document.querySelector('#promotion-from')&&!!document.querySelector('#promotion-to')"));
  await click('#promotion-tab-promotions');assert.equal(await ev("document.querySelectorAll('[data-promotion]').length"),5);assert.equal(await ev("!!document.querySelector('.filters')"),false);
 }
 await ev("document.querySelector('#promotion-tab-promotions').focus()");await key('ArrowRight');assert.equal(await ev('document.activeElement.id'),'promotion-tab-history');await key('ArrowRight');assert.equal(await ev('document.activeElement.id'),'promotion-tab-promotions');
 await ev("document.querySelector('.promotion-card .promotion-more summary').focus()");await key('Enter');assert.equal(await ev("document.querySelector('.promotion-more').open"),true);await key('Escape');assert.equal(await ev("document.querySelector('.promotion-more').open"),false);
 await click('.promotion-card button[aria-label^="Ver "]');assert(await ev("!!document.querySelector('.detail.panel')"));
 report.keyboard.push('More actions open natively and close with Escape; card View opens existing detail');
 report.keyboard.push('ArrowRight cycles both tabs, focus and single selection correct');assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.equal(report.httpErrors.length,0,JSON.stringify(report.httpErrors));assert.equal(report.writes.length,0);report.result='PASS';save();console.log(JSON.stringify({result:'PASS',matrix:report.matrix.length,screenshots:report.screenshots.length}));
})().catch(e=>{report.result='FAIL';report.failure=String(e.stack||e);save();console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome.kill('SIGTERM');});
