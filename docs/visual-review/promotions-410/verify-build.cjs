const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../frontend'),dist=path.join(root,'dist/frontend/browser'),ngsw=JSON.parse(fs.readFileSync(path.join(dist,'ngsw.json'))),manifest=JSON.parse(fs.readFileSync(path.join(dist,'manifest.webmanifest')));
assert.equal(manifest.name,'Club VOID');assert.equal(manifest.short_name,'VOID');assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/wallet');
for(const icon of manifest.icons){const b=fs.readFileSync(path.join(dist,icon.src)),size=Number(icon.sizes.split('x')[0]);assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);assert(icon.purpose.includes('maskable'));}
assert(fs.existsSync(path.join(dist,'ngsw-worker.js')));assert.equal(ngsw.dataGroups.length,0);let files=0;
for(const [name,hash]of Object.entries(ngsw.hashTable)){assert(!name.includes('/api/')&&!name.includes('fintoc'));assert.equal(crypto.createHash('sha1').update(fs.readFileSync(path.join(dist,name))).digest('hex'),hash,name);files++;}
const isNavigation=url=>ngsw.navigationUrls.some(r=>r.positive&&new RegExp(r.regex).test(url))&&!ngsw.navigationUrls.some(r=>!r.positive&&new RegExp(r.regex).test(url));
for(const p of ['/','/wallet','/noches','/noches/demo','/tragos','/perfil'])assert(isNavigation(p),p);
for(const p of ['/api/orders','/checkout','/checkout/resultado','/carrito','/admin','/ngsw.json'])assert(!isNavigation(p),p);
for(const group of ngsw.assetGroups){assert.equal(group.installMode,'prefetch');assert.equal(group.patterns.length,0);}
const before=JSON.parse(fs.readFileSync('/private/tmp/void410-before.json'));for(const name of ['frontend/package.json','frontend/package-lock.json'])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../../',name))).digest('hex'),before[name],name);
const result={result:'PASS',hashedFiles:files,icons:manifest.icons.map(i=>i.sizes),cacheDataGroups:0,externalCachePatterns:0,paymentAndApiNavigationExcluded:true,dependenciesUnchangedFrom410Baseline:true};fs.writeFileSync(path.join(__dirname,'pwa-build-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
