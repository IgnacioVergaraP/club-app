const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-frontend412-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let acceptDialog=true;let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-19',browser:'Chrome Headless real, isolated profile; local Angular development; no payment session created',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],writes:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'camera-review.json',JSON.stringify(report,null,2));}
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










 await send('Page.addScriptToEvaluateOnNewDocument',{source:`
 Object.defineProperty(window,'BarcodeDetector',{configurable:true,value:undefined});
 window.__camera={requests:0,streams:[],asset:'drink-001.svg',denied:false};
 navigator.mediaDevices.getUserMedia=async constraints=>{
  window.__camera.requests++;
  if(window.__camera.denied)throw new DOMException('Denied for test','NotAllowedError');
  const image=new Image();image.src='/assets/qr-demo/'+window.__camera.asset;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=740;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,740,740);ctx.drawImage(image,185,185,370,370);
  const stream=canvas.captureStream(5);window.__camera.streams.push(stream);return stream;
 };
 `});
 async function spa(route,selector){await ev(`history.pushState({},'',${JSON.stringify(route)});dispatchEvent(new PopStateEvent('popstate'))`);await until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),route);await delay(150);}
 async function matrix(label){phase=label;for(const width of [320,390,768,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await delay(100);assert.equal(await ev('document.documentElement.scrollWidth>innerWidth'),false,label+' overflow');report.matrix.push({label,width});if([390,1280].includes(width))await shot(label+'-'+width);}}
 await nav('/staff/barra','app-staff-qr-camera');assert.equal(await ev('window.BarcodeDetector'),undefined);assert.equal(await ev('window.__camera.requests'),0);
 // Do not load jsQR before activating the camera.
 assert.equal(await ev("performance.getEntriesByType('resource').some(r=>r.name.includes('qr-software-detector'))"),false);
 await click('app-staff-qr-camera button');await until(()=>ev("!!document.querySelector('.result[data-outcome=ready]')"),'decode drink without native support');
 assert.equal(await ev('window.__camera.requests'),1);assert(await ev("window.__camera.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))"));
 await matrix('bar-software-read');
 // Keep the original canje rules: decode -> inspect -> explicit confirm.
 await click('.result button.primary');await until(()=>ev("!!document.querySelector('.result[data-outcome=success]')"),'confirmed redemption');
 await click('.result .again');await click('app-staff-qr-camera button');await until(()=>ev("!!document.querySelector('.result[data-outcome=used]')"),'same QR rejected');await matrix('bar-used');
 await spa('/wallet','app-wallet');await ev("[...document.querySelectorAll('.wallet-tabs button')].find(b=>b.textContent==='Tragos').click()");await delay(200);assert(await ev("document.querySelector('.drink-card').textContent.includes('Canjeado')"));
 await spa('/staff/puerta','app-staff-qr-camera');await ev("window.__camera.asset='ticket-001.svg'");await click('app-staff-qr-camera button');await until(()=>ev("!!document.querySelector('.result[data-outcome=ready]')"),'ticket software decode');await matrix('door-software-read');
 await click('.result button.primary');await until(()=>ev("!!document.querySelector('.result[data-outcome=success]')"),'entry confirm');
 await click('.result .again');await ev("window.__camera.denied=true");await click('app-staff-qr-camera button');await until(()=>ev("document.querySelector('app-staff-qr-camera .state').textContent.includes('denegado')"),'permission denied');assert(await ev("!!document.querySelector('#staff-manual-code')"));
 assert(await ev("window.__camera.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))"));
 report.camera={source:'Synthetic camera stream drawn from real local Wallet SVGs; BarcodeDetector removed; real bundled jsQR decoding',physicalCameraTested:false,iPhoneTested:false,requests:await ev('window.__camera.requests'),noPermissionOnEntry:true,noDecoderLoadedBeforeActivation:true,qrStopsCamera:true,duplicateQrRejected:true,walletStateUpdated:true,manualAvailableAfterDenied:true};
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.equal(report.httpErrors.length,0,JSON.stringify(report.httpErrors));assert.equal(report.writes.length,0,JSON.stringify(report.writes));report.result='PASS';save();console.log(JSON.stringify({result:'PASS',camera:report.camera,matrix:report.matrix.length}));
})().catch(e=>{report.result='FAIL';report.failure={phase,message:e.stack||e.message};save();console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome.kill('SIGTERM');});
