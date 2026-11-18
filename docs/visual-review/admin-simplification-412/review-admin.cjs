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

 const cases=[
  ['dashboard','/admin','app-admin-dashboard',null],
  ['events','/admin/eventos','app-admin-events','Nuevo evento'],
  ['events-past','/admin/eventos','app-admin-events','Nuevo evento'],
  ['drinks','/admin/tragos','app-admin-drinks','Nuevo trago'],
  ['inventory','/admin/inventario','app-admin-inventory','Nuevo ingrediente'],
  ['inventory-beverages','/admin/inventario?view=beverages','app-admin-inventory','Nuevo ingrediente'],
  ['inventory-low','/admin/inventario?view=low','app-admin-inventory','Nuevo ingrediente'],
  ['staff','/admin/personal','app-admin-staff','Agregar trabajador'],
  ['promotions','/admin/promociones','app-admin-promotions','Nueva promoción']
 ];
 for(const width of [320,390,768,1280]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  for(const [name,route,selector,label]of cases){phase=name+'-'+width;await nav(route,selector);
   if(name==='events-past')await click('#events-tab-past');
   const result=await ev(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),fab=el.querySelector('.admin-create-fab');const r=fab?.getBoundingClientRect(),s=fab&&getComputedStyle(fab);return {overflow:document.documentElement.scrollWidth>innerWidth,heading:el.querySelector('h1')?.textContent,fab:fab?{label:fab.getAttribute('aria-label'),width:r.width,height:r.height,right:innerWidth-r.right,bottom:innerHeight-r.bottom,position:s.position,radius:s.borderRadius,hit:fab.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}:null,text:el.innerText,filterSelects:el.querySelectorAll('.filters select').length,tabs:[...el.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim()),rows:el.querySelectorAll('.stock-row').length}})()`);
   assert.equal(result.overflow,false,phase+' overflow');
   if(label){assert.equal(result.fab.label,label,phase);assert.equal(result.fab.position,'fixed',phase);assert.equal(result.fab.width,60,phase);assert.equal(result.fab.height,60,phase);assert(result.fab.right>=0&&result.fab.bottom>=0,phase);assert(result.fab.hit,phase+' overlay');}
   if(name==='dashboard'){assert(!result.text.includes('Ventas recientes'));assert(!result.text.includes('Actividad reciente'));}
   if(name.startsWith('events')){assert.deepEqual(result.tabs,['Próximos','Pasados']);assert(!result.text.includes('Los cambios duran'));assert.equal(result.filterSelects,0);if(name==='events')assert(!result.text.includes('Archivo de octubre'));else assert(result.text.includes('Archivo de octubre'));}
   if(name==='drinks')assert.equal(result.filterSelects,0);
   if(name.startsWith('inventory')){assert.deepEqual(result.tabs,['Alcoholes','Bebidas','Bajo stock']);assert(!result.text.includes('registrados'));assert(!result.text.includes('Revisa los mínimos'));assert(!result.text.includes('Cambios solo en esta sesión'));assert.equal(result.filterSelects,0);if(name==='inventory-low')assert.equal(result.rows,2);}
   delete result.text;report.matrix.push({phase,width,...result});await shot(phase);
  }
 }
 // Real keyboard activation of the events tabs and floating action.
 await nav('/admin/eventos','app-admin-events');await ev("document.querySelector('#events-tab-upcoming').focus()");await key('ArrowRight');
 assert.equal(await ev("document.activeElement.id"),'events-tab-past');assert.equal(await ev("document.querySelector('#events-tab-past').getAttribute('aria-selected')"),'true');
 await key('Home');assert.equal(await ev("document.activeElement.id"),'events-tab-upcoming');
 await ev("document.querySelector('app-admin-events .admin-create-fab').focus()");await key('Enter');await until(()=>ev("location.pathname==='/admin/eventos/nuevo'&&!!document.querySelector('app-admin-event-form')"),'event creation');
 report.keyboard.push('Event tabs arrows/Home; floating action Enter opens event wizard');
 await nav('/admin/inventario','app-admin-inventory');await ev("document.querySelector('#inventory-tab-alcohols').focus()");await key('End');await until(()=>ev("document.querySelector('#inventory-tab-low').getAttribute('aria-selected')==='true'"),'low stock tab');assert.equal(await ev('document.activeElement.id'),'inventory-tab-low');
 report.keyboard.push('Inventory End selects Bajo stock and retains focus');
 for(const [route,selector,destination]of [['/admin/tragos','app-admin-drinks','/admin/tragos/nuevo'],['/admin/personal','app-admin-staff','/admin/personal/nuevo'],['/admin/inventario','app-admin-inventory','/admin/inventario/ingredientes/nuevo'],['/admin/promociones','app-admin-promotions','/admin/promociones/nueva']]){await nav(route,selector);await click(selector+' .admin-create-fab');await until(()=>ev(`location.pathname===${JSON.stringify(destination)}`),'create '+destination);}
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.equal(report.httpErrors.length,0,JSON.stringify(report.httpErrors));assert.equal(report.writes.length,0,JSON.stringify(report.writes));
 report.result='PASS';save();console.log(JSON.stringify({result:report.result,matrix:report.matrix.length,screenshots:report.screenshots.length,keyboard:report.keyboard,errors:report.errors}));
})().catch(e=>{report.result='FAIL';report.failure=String(e.stack||e);save();console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome.kill('SIGTERM');});
