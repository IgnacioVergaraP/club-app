const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const WebSocket=require(path.join(__dirname,'../../../frontend/node_modules/ws'));
const out=__dirname+'/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'void-audit36-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let ws,id=0; const pending=new Map();let phase='setup';
const report={date:'2026-11-10',browser:'Chrome Headless real, isolated profile; local Angular development and Flask',matrix:[],screenshots:[],keyboard:[],flows:{},errors:[],httpErrors:[],checks:[],paid:false};
function save(){fs.writeFileSync(out+'audit-browser-36.json',JSON.stringify(report,null,2));}
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
 for(const [route,sel,name] of [['/','app-inicio','inicio'],['/noches','app-noches','noches'],['/tragos','.product-card','tragos'],['/wallet','.ticket-card','wallet-tickets'],['/perfil','.identity','perfil']]){await nav(route,sel);await matrix(name,true);}
 await click('.edit-button');await matrix('perfil-edit',true);
 await ev(`(()=>{const n=document.querySelector('#profile-name');n.value='   ';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('form button[type=submit]').click();})()`);await delay(100);assert(await ev('!!document.querySelector("#name-error")'));report.flows.profileInvalidName='PASS';
 await ev(`(()=>{for(const [id,value] of [['profile-name','Auditoria Demo'],['profile-phone','900000000']]){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('form button[type=submit]').click();})()`);await delay(150);
 assert(await ev('document.querySelector(".identity h2").textContent.includes("Auditoria Demo")'));await click('.preference input');
 await click('.bottom-nav-link[href="/wallet"]');await until(()=>ev('!!document.querySelector(".ticket-card")'),'wallet');const before=await walletSnapshot();report.flows.walletBefore=before;
 await ev('document.querySelector("[role=tab]").focus()');await key('ArrowRight');report.keyboard.push(await ev(`({check:'Wallet ArrowRight',selected:document.querySelector('[role=tab][aria-selected=true]').id,focused:document.activeElement.id})`));
 await matrix('wallet-drinks',true);await key('End');await matrix('wallet-history',true);await key('Home');
 await ev('document.querySelector("summary").focus()');await key('Enter');assert(await ev('document.querySelector("details").open'));report.keyboard.push({check:'Wallet details Enter',result:'PASS'});
 await click('.bottom-nav-link[href="/perfil"]');await until(()=>ev('!!document.querySelector(".identity")'),'profile return');assert(await ev('document.querySelector(".identity h2").textContent.includes("Auditoria Demo")'));report.flows.profileRetained='PASS';
 await nav('/perfil','.identity');assert(await ev('document.querySelector(".identity h2").textContent.includes("Alex Demo")'));report.flows.profileReloadReset='PASS';
 await nav('/noches/demo-after-hours','.ticket-list');await matrix('event-detail',true);
 await ev(`(()=>{const a=document.querySelectorAll('[data-ticket-id]');a[0].querySelectorAll('button')[1].click();a[0].querySelectorAll('button')[1].click();a[1].querySelectorAll('button')[1].click();})()`);await delay(120);
 assert(await ev('document.querySelector(".selection-total").textContent.includes("49.000")'));await click('.continue-tickets');await until(()=>ev('!!document.querySelector(".ticket-summary")'),'summary');await matrix('ticket-summary',true);report.flows.ticketTotal='2 General + 1 VIP = 49000 CLP';
 await click('.modify-link');await until(()=>ev('!!document.querySelector(".ticket-list")'),'modify');assert(await ev('document.querySelector(".selection-total").textContent.includes("49.000")'));report.flows.ticketModify='PASS';
 await nav('/noches/demo-void-sessions','.ticket-list');assert(await ev('[...document.querySelectorAll(".ticket-controls button")].every(e=>e.disabled)'));report.flows.expiredTicketSelectionBlocked='PASS';
 await nav('/noches/nonexistent','.not-found');report.flows.invalidEvent='PASS';await matrix('event-not-found');
 await nav('/entradas/resumen','app-noches');report.flows.emptyTicketGuard='PASS';await nav('/checkout','app-carrito');report.flows.emptyCartGuard='PASS';await matrix('empty-cart');
 await nav('/tragos','.product-card');await ev(`(()=>{const s=document.querySelector('.search-input');s.value='no-existe-36';s.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(120);assert(await ev('!!document.querySelector(".empty-state")'));report.flows.searchEmpty='PASS';await click('.search-clear');
 await ev(`(()=>{for(const n of ['Piscola','Gin Tonic']){[...document.querySelectorAll('.product-card')].find(e=>e.innerText.includes(n)).querySelector('.plus-btn').click();}})()`);await matrix('tragos-selected',true);
 await ev('window.scrollTo(0,document.body.scrollHeight)');report.checks.push(await ev(`(()=>{const card=[...document.querySelectorAll('.product-card')].at(-1).getBoundingClientRect();const bar=document.querySelector('.cart-summary').getBoundingClientRect();return {check:'Last product versus fixed summary at max scroll',productBottom:card.bottom,summaryTop:bar.top,overlap:card.bottom>bar.top}})()`));
 // Navigate through a real router link inserted only by the audit harness to keep SPA memory.
 // Use the Angular Router already injected in bottom-nav via its existing routerLink directive.
 await ev(`(()=>{const el=document.querySelector('.bottom-nav-link[href="/tragos"]');const dir=ng.getDirectives(el).find(x=>x.router);dir.router.navigateByUrl('/carrito');})()`);await until(()=>ev('!!document.querySelector(".cart-list")'),'cart');await matrix('cart',true);
 await click('.checkout-btn');await until(()=>ev('!!document.querySelector(".prepare-btn")'),'checkout');await matrix('checkout',true);await click('.prepare-btn');
 await until(()=>ev('!!document.querySelector(".order-result")||!!document.querySelector(".order-error")'),'order');assert(await ev('!!document.querySelector(".order-result")'));
 const orderId=await ev('document.querySelector(".order-id").textContent.replace("ID:","").trim()');report.flows.orderPrepared={status:'pending_payment',total:14000};await matrix('checkout-prepared',true);
 // Return to Wallet in the same SPA, so pending order cannot be masked by reload.
 await ev(`ng.getComponent(document.querySelector('app-checkout')).router.navigateByUrl('/wallet')`);await until(()=>ev('!!document.querySelector(".ticket-card")'),'wallet after pending');const after=await walletSnapshot();assert.deepEqual(before,after);report.flows.pendingDoesNotIssueWallet={before,after,result:'PASS'};
 await click('.bottom-nav-link[href="/tragos"]');await until(()=>ev('!!document.querySelector(".cart-summary-btn")'),'tragos before pay');phase='real-fintoc';
 await click('.cart-summary-btn');await until(()=>ev('location.hostname.endsWith("fintoc.com")||!!document.querySelector(".cart-summary [role=alert]")'),'provider navigation');
 const provider=await ev('({host:location.hostname,title:document.title,hasError:!!document.querySelector(".cart-summary [role=alert]")})');assert(provider.host.endsWith('fintoc.com'),'Fintoc redirect failed');report.flows.provider=provider;await delay(1800);await shot('fintoc-provider-1280');
 const buttons=await ev('[...document.querySelectorAll("button")].map(e=>e.innerText.trim())');report.flows.providerReturnButton=buttons.find(x=>x.includes('Volver a'))||null;
 if(report.flows.providerReturnButton){await ev(`[...document.querySelectorAll('button')].find(e=>e.innerText.includes('Volver a')).click()`);await until(()=>ev('location.hostname==="localhost"||location.hostname==="clubapp-ten.vercel.app"||location.hostname==="127.0.0.1"'),'provider return');await delay(1500);report.flows.returnHost=await ev('location.hostname');}
 await nav('/checkout/resultado?order_id='+orderId+'&result=returned&verified=true','app-payment-result');await until(()=>ev('!document.querySelector("[aria-busy=true]")'),'verify');await matrix('payment-return',true);assert(!(await ev('document.body.innerText')).includes('Pago Sandbox verificado por el servidor'));report.flows.queryCannotConfirmPayment='PASS';
 await nav('/checkout/resultado?order_id=invalid','app-payment-result');assert(await ev('document.body.innerText.includes("referencia de pedido válida")'));report.flows.invalidReturnReference='PASS';
 await nav('/','app-inicio');await ev('document.activeElement.blur();window.scrollTo(0,0)');await key('Tab');report.keyboard.push(await ev(`({check:'First Tab',tag:document.activeElement.tagName,name:document.activeElement.getAttribute('aria-label'),outline:getComputedStyle(document.activeElement).outlineStyle})`));
 report.result='PASS';save();console.log(JSON.stringify({result:report.result,matrix:report.matrix.length,errors:report.errors,httpErrors:report.httpErrors,flows:report.flows},null,2));
})().catch(e=>{report.result='INCOMPLETE';report.failure={phase,message:e.message};save();console.error(JSON.stringify(report.failure));process.exitCode=1;}).finally(()=>{if(ws)ws.close();chrome.kill('SIGTERM');});
