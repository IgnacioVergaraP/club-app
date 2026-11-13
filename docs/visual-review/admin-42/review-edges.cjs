const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-initial42-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-12',browser:'Chrome Headless real, isolated profile; local Angular development; no payment session created',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],writes:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'edge-review.json',JSON.stringify(report,null,2));}
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






 await nav('/tragos','app-bottom-nav');await click('.plus-btn');
 const protocol=await fetch(`http://127.0.0.1:${port}/json/protocol`).then(r=>r.json());
 const command=protocol.domains.find(d=>d.domain==='Emulation').commands.find(c=>c.name==='setSafeAreaInsetsOverride');
 report.checks.push({safeAreaOverrideSupported:!!command});
 if(command){
  await send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:0,right:0,bottom:34}});
  for(const width of [320,390,768,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await ev('window.scrollTo(0,document.body.scrollHeight)');await delay(120);
   const row=await ev(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bottom:getComputedStyle(document.querySelector('.bottom-nav')).bottom,navTop:document.querySelector('.bottom-nav').getBoundingClientRect().top,navBottom:document.querySelector('.bottom-nav').getBoundingClientRect().bottom,summaryBottom:document.querySelector('.cart-summary').getBoundingClientRect().bottom})`);
   assert.equal(row.bottom,'40px');assert(row.summaryBottom<=row.navTop);assert(row.scrollWidth<=width);report.matrix.push(row);if(width===390)await shot('glass-safe-area-390');
  }
  await send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:0,right:0,bottom:0}});
 }
 // Use a controlled visible error to exercise the existing expanded summary spacing, without contacting payments.
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:false});
 await ev(`(()=>{const host=document.querySelector('app-cart-summary');ng.getComponent(host).error='No pudimos abrir Fintoc. Mensaje de error controlado para revisar espacio y reintento.';ng.applyChanges(ng.getComponent(host));})()`);
 for(const width of [320,390,768,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await ev('window.scrollTo(0,document.body.scrollHeight)');await delay(100);const row=await ev(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,summaryTop:document.querySelector('.cart-summary').getBoundingClientRect().top,summaryBottom:document.querySelector('.cart-summary').getBoundingClientRect().bottom,lastProductBottom:[...document.querySelectorAll('.product-card')].at(-1).getBoundingClientRect().bottom,navTop:document.querySelector('.bottom-nav').getBoundingClientRect().top})`);assert(row.scrollWidth<=width);assert(row.lastProductBottom<=row.summaryTop);assert(row.summaryBottom<=row.navTop);report.checks.push({errorSpacing:row});}
 assert.equal(report.writes.length,0);assert.equal(report.errors.length,0);report.result='PASS';save();console.log(JSON.stringify({result:report.result,checks:report.checks,matrix:report.matrix}));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(e);process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
