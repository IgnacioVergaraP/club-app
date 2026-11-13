const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-review42-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-12',browser:'Chrome Headless real, isolated profile; local Angular development; no payment session created',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],writes:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'final-review.json',JSON.stringify(report,null,2));}
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






async function set(selector,value){await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input '+${JSON.stringify(selector)});if(e.type==='checkbox')e.checked=${JSON.stringify(value)};else e.value=${JSON.stringify(value)};e.dispatchEvent(new Event(e.type==='checkbox'||e.tagName==='SELECT'?'change':'input',{bubbles:true}));e.dispatchEvent(new Event('blur',{bubbles:true}));})()`);await delay(60);}
async function matrix(label,shots=true){phase=label;for(const width of [320,390,768,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await delay(80);const row=await ev(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,header:document.querySelector('app-header')?.getBoundingClientRect().top,nav:document.querySelectorAll('.bottom-nav-link').length})`);assert(row.scrollWidth<=width,label+' overflow '+width);report.matrix.push({screen:label,...row});if(shots&&[390,1280].includes(width))await shot(label+'-'+width);}}
async function chooseAdd(){await ev(`[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Agregar tipo')).click()`);await delay(80);}
async function menuLink(route){await click('nav a[href="'+route+'"]');await delay(150);}

 await nav('/admin','app-admin-dashboard');await matrix('dashboard');
 assert(!(await ev('document.body.textContent')).includes('Comisión acumulada'));
 await nav('/admin/eventos','app-admin-events');assert.equal(await ev('document.querySelectorAll(".event-card").length'),4);assert(await ev('[...document.querySelectorAll(".event-card")].every(card=>card.querySelector(".actions select").value===card.querySelector(".badge").getAttribute("data-status"))'));await matrix('events-list');
 await click('a[href="/admin/eventos/nuevo"]');await until(()=>ev('!!document.querySelector("#event-name")'),'new form');await matrix('events-form-new');
 await click('button[type=submit]');assert(await ev('!!document.querySelector("input[aria-invalid=true]")'));
 await set('#event-name','Noche QA 42');await set('#event-description','Evento ficticio creado durante la revisión 4.2');await set('#event-date','2026-12-12');await set('#event-start','23:00');await set('#event-end','05:00');await set('#event-status','published');
 await click('button[type=submit]');assert((await ev('document.querySelector("app-admin-event-form").textContent')).includes('agrega al menos'));
 await chooseAdd();await chooseAdd();await chooseAdd();await ev('document.querySelectorAll(".remove")[2].click()');assert.equal(await ev('document.querySelectorAll("fieldset").length'),2);
 for(const [index,name,price,capacity,max] of [[0,'General',12000,100,10],[1,'VIP',25000,40,4]]){const prefix='fieldset:nth-child('+(index+1)+') ';await set(prefix+'[formControlName=name]',name);await set(prefix+'[formControlName=priceClp]',price);await set(prefix+'[formControlName=capacity]',capacity);await set(prefix+'[formControlName=maxPerPurchase]',max);}
 await set('fieldset:first-child [formControlName=priceClp]',-1);await click('button[type=submit]');assert(await ev('!!document.querySelector("input[aria-invalid=true]")'));
 await set('fieldset:first-child [formControlName=priceClp]',12000);await set('#event-next-day',false);await click('button[type=submit]');assert((await ev('document.body.textContent')).includes('término debe ser posterior'));await matrix('events-form-errors');
 await set('#event-next-day',true);await matrix('events-form-valid');await click('button[type=submit]');await until(()=>ev('!!document.querySelector("app-admin-event-detail")'),'created details');
 assert((await ev('document.querySelector("h1").textContent')).includes('Noche QA 42'));assert((await ev('document.querySelector("app-admin-event-detail").textContent')).includes('General'));await matrix('event-detail');
 await click('a[href$="/editar"]');await until(()=>ev('!!document.querySelector("#event-name")'),'edit');await set('#event-name','Noche QA 42 editada');await matrix('events-form-edit');await click('button[type=submit]');await until(()=>ev('!!document.querySelector("app-admin-event-detail")'),'edit saved');
 await click('a[href="/admin/eventos"]');await until(()=>ev('!!document.querySelector("app-admin-events")'),'return list');
 await set('input[type=search]','QA 42 editada');assert.equal(await ev('document.querySelectorAll(".event-card").length'),1);
 await set('.actions select','cancelled');assert((await ev('document.querySelector(".badge").textContent')).includes('Cancelado'));
 await set('.filters select','published');assert.equal(await ev('document.querySelectorAll(".event-card").length'),0);await matrix('events-filter-empty');
 await ev(`[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Limpiar filtros')).click()`);await delay(80);await set('.filters label:last-child select','desc');
 await menuLink('/admin/ventas');assert((await ev('document.querySelector("h1").textContent')).includes('Ventas'));await menuLink('/admin/eventos');await set('input[type=search]','QA 42 editada');assert.equal(await ev('document.querySelectorAll(".event-card").length'),1);assert((await ev('document.querySelector(".badge").textContent')).includes('Cancelado'));
 report.checks.push('Create, invalid required/publication/price/schedule, add/remove tickets, edit, status, filter empty, reset, sort and retained data across SPA sections');
 await nav('/admin/eventos','app-admin-events');await set('input[type=search]','QA 42 editada');assert.equal(await ev('document.querySelectorAll(".event-card").length'),0);report.checks.push('Reload discards newly created DEMO records');
 await nav('/admin/eventos/missing','app-admin-event-detail');assert((await ev('document.querySelector("h1").textContent')).includes('no disponible'));

 for(const [route,label] of [['/','inicio'],['/noches','noches'],['/tragos','tragos'],['/wallet','wallet'],['/perfil','perfil']]){
  await nav(route,'app-bottom-nav');await matrix('glass-'+label);
  for(const width of [320,390,768,1280]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await ev('window.scrollTo(0,document.body.scrollHeight)');await delay(80);
   const row=await ev(`(()=>{const nav=document.querySelector('.bottom-nav'),r=nav.getBoundingClientRect(),style=getComputedStyle(nav),links=[...document.querySelectorAll('.bottom-nav-link')],controls=[...document.querySelectorAll('.layout-content a,.layout-content button,.layout-content summary,.layout-content input')].filter(e=>!!e.getClientRects().length);const blocked=controls.filter(e=>{const c=e.getBoundingClientRect();return c.top<r.bottom&&c.bottom>r.top&&c.right>r.left&&c.left<r.right});return {width:innerWidth,navTop:r.top,navBottom:r.bottom,left:r.left,right:r.right,bottom:style.bottom,blur:style.backdropFilter,active:links.filter(e=>e.getAttribute('aria-current')==='page').length,blocked:blocked.map(e=>e.textContent.slice(0,60)),header:document.querySelector('app-header').getBoundingClientRect().top};})()`);
   assert.equal(row.active,1);assert(row.left>0&&row.right<width);assert(row.navBottom<844);assert(Math.abs(row.header)<1);assert.equal(row.blocked.length,0,label+' content behind bar');report.checks.push({screen:label,...row});
  }
 }
 // Native keyboard traversal among real client tabs.
 await ev('document.querySelector(".bottom-nav-link").focus()');await key('Tab');assert.equal(await ev('document.activeElement.getAttribute("aria-label")'),'Noches');await key('Enter');await delay(200);assert((await ev('location.pathname')).includes('noches'));
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});assert.equal(await ev('getComputedStyle(document.querySelector(".bottom-nav-link")).transitionDuration'),'0s');await shot('glass-reduced-motion');
 await send('Emulation.setEmulatedMedia',{features:[]});
 // Disable only the @supports branch to emulate a browser without backdrop-filter.
 assert(await ev(`(()=>{let disabled=0;function visit(rules){for(const rule of rules){if(rule.conditionText?.includes('backdrop-filter')&&rule.cssText.includes('.bottom-nav')){for(const child of rule.cssRules){child.style?.setProperty('backdrop-filter','none');child.style?.setProperty('-webkit-backdrop-filter','none');child.style?.setProperty('background','#111117');disabled++}}else if(rule.cssRules)visit(rule.cssRules)}}for(const sheet of document.styleSheets){try{visit(sheet.cssRules)}catch{}}return disabled>0})()`));
 assert.equal(await ev('getComputedStyle(document.querySelector(".bottom-nav")).backgroundColor'),'rgb(17, 17, 23)');await shot('glass-opaque-fallback');report.checks.push('Opaque fallback branch emulated by disabling @supports declarations; reduced motion tested with media emulation');
 // Read-only selected cart layout; no payment request is initiated.
 await nav('/tragos','app-bottom-nav');await click('.plus-btn');await until(()=>ev('!!document.querySelector(".cart-summary")'),'cart summary');await matrix('glass-selected-cart');
 for(const width of [320,390,768,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});await ev('window.scrollTo(0,document.body.scrollHeight)');await delay(100);const r=await ev(`({summaryBottom:document.querySelector('.cart-summary').getBoundingClientRect().bottom,navTop:document.querySelector('.bottom-nav').getBoundingClientRect().top,lastProductBottom:[...document.querySelectorAll('.product-card')].at(-1).getBoundingClientRect().bottom,summaryTop:document.querySelector('.cart-summary').getBoundingClientRect().top})`);assert(r.summaryBottom<=r.navTop);assert(r.lastProductBottom<=r.summaryTop);report.checks.push({screen:'selected-cart',width,...r});}
 assert.equal(report.writes.length,0);assert.equal(report.errors.length,0);assert.equal(report.httpErrors.length,0);
 report.result='PASS';save();console.log(JSON.stringify({result:report.result,matrix:report.matrix.length,errors:report.errors,writes:report.writes}));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(e);process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
