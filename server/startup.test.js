import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {resolveStartupConfig,DEFAULT_PUBLIC_URL} from './startup.js';import {createPublicApplication} from './public-app.js';
test('zero-variable production startup uses public-only mode and the actual school URL',()=>{
 const c=resolveStartupConfig('/srv/school',{NODE_ENV:'production'});assert.equal(c.publicOnly,true);assert.equal(c.publicUrl,DEFAULT_PUBLIC_URL);assert.equal(c.paymentsEnabled,false);assert.equal(c.mailMode,'off');
});
test('empty imported optional values do not prevent public-only startup',()=>{
 const c=resolveStartupConfig('/srv/school',{NODE_ENV:'production',HOSTING_TARGET:'hostinger-managed',DATA_DIR:'',ADMIN_EMAIL:'',ADMIN_PASSWORD:'',PUBLIC_URL:''});assert.equal(c.publicOnly,true);
});
test('public-only startup never permits payments, mail or live admissions',()=>{
 for(const extra of [{PAYMENTS_ENABLED:'true'},{MAIL_DELIVERY:'smtp'},{LAUNCH_MODE:'live',POLICIES_APPROVED:'true'}])assert.throws(()=>resolveStartupConfig('/srv/school',{NODE_ENV:'production',...extra}),/storage|DATA_DIR/);
});
test('full production startup still requires a safe confirmed persistent directory',()=>{
 const env={NODE_ENV:'production',DATA_DIR:'/srv/private/school',PERSISTENT_STORAGE_CONFIRMED:'true'};
 assert.equal(resolveStartupConfig('/srv/school',env).publicOnly,false);
 assert.throws(()=>resolveStartupConfig('/srv/school',{...env,PERSISTENT_STORAGE_CONFIRMED:'false'}),/PERSISTENT_STORAGE_CONFIRMED/);
 assert.throws(()=>resolveStartupConfig('/srv/school',{...env,DATA_DIR:'/srv/school/data'}),/outside/);
});
test('stateless public APIs serve learning content but reject every personal-data operation',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'afristem-public-'));
 const config=resolveStartupConfig(root,{NODE_ENV:'production',TRUST_PROXY_HOPS:'0'});const {app,mail}=createPublicApplication(config);assert.equal(mail,null);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port;
 try{
  const health=await (await fetch(url+'/api/health')).json();assert.equal(health.mode,'public-only');assert.equal(health.admissionsReady,false);
  const content=await (await fetch(url+'/api/content')).json();assert.equal(content.operationsReady,false);assert.ok(content.programmes.length);
  const quiz=await (await fetch(url+'/api/quiz')).json();assert.ok(quiz.length);assert.equal(quiz[0].answer,undefined);
  const graded=await fetch(url+'/api/quiz/grade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:quiz.map(()=>0)})});assert.equal(graded.status,200);
  for(const route of ['/applications/student','/applications/teacher','/contact','/track','/payments/initialize','/payments/webhook','/admin/login']){
   const response=await fetch(url+'/api'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"name":"Fictional QA"}'});assert.equal(response.status,503,route);assert.equal((await response.json()).code,'SETUP_REQUIRED');
  }
  assert.equal((await fetch(url+'/api/admin/applications')).status,503);assert.deepEqual(fs.readdirSync(root),[],'No runtime database or credentials created');
 }finally{await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}
});
