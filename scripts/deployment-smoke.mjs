// Isolated production-start test: never connects to an existing school database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import Database from 'better-sqlite3';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'afristem-deploy-'));
const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');
const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
const base=`http://127.0.0.1:${port}`;
const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',PORT:String(port),
 DOTENV_CONFIG_PATH:path.join(temporary,'no-env-file'),HOSTING_TARGET:'hostinger-managed',
 PERSISTENT_STORAGE_CONFIRMED:'true',DATA_DIR:temporary,TRUST_PROXY_HOPS:'0',
 LAUNCH_MODE:'preview',PUBLIC_URL:'https://deployment-test.example.com',PAYMENTS_ENABLED:'false',
 MAIL_DELIVERY:'off',ADMIN_EMAIL:'deployment-test@example.com',ADMIN_PASSWORD:randomBytes(32).toString('base64url')};
let child;
async function start(){
 child=spawn(process.execPath,['app.js'],{env,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{
  let logs='';const timer=setTimeout(()=>reject(Error('Production startup timed out. '+logs)),20000);
  const done=error=>{clearTimeout(timer);error?reject(error):resolve();};
  child.once('error',done);child.once('exit',code=>done(Error('Production startup exited: '+code+' '+logs)));
  child.stdout.on('data',buffer=>{logs=(logs+buffer.toString()).slice(-4000);if(logs.includes('is listening on port'))done();});
  child.stderr.on('data',buffer=>{logs=(logs+buffer.toString()).slice(-4000);});
 });
}
async function stop(){
 if(!child||child.exitCode!==null)return;
 const exited=once(child,'exit');const timer=setTimeout(()=>child.kill('SIGKILL'),40000);
 child.kill('SIGTERM');const [code]=await exited;clearTimeout(timer);assert.equal(code,0,'Clean server shutdown');child=null;
}
try{
 await start();
 assert.equal((await (await fetch(base+'/api/health')).json()).ok,true);
 for(const route of ['/','/programmes','/admin']){
  const response=await fetch(base+route);assert.equal(response.status,200,route);
  const html=await response.text();assert.ok(html.includes('id="root"'),route);assert.ok(!html.includes('/@vite/client'));
  if(route==='/'){
   const asset=html.match(/src="([^\"]+\.js)"/);assert.ok(asset,'Compiled script exists');
   const script=await fetch(base+asset[1]);assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);
  }
 }
 assert.equal((await fetch(base+'/api/admin/me')).status,401,'Staff API requires authentication');
 await stop();
 const db=new Database(path.join(temporary,'school.sqlite'));
 const owner=db.prepare('SELECT id FROM staff WHERE role=?').get('owner');assert.ok(owner);
 db.prepare('INSERT INTO applications(id,kind,name,email,payload) VALUES(?,?,?,?,?)').run('EDU-DEPLOY-QA','teacher','Deployment smoke','qa@example.com','{}');
 const document='a'.repeat(32);const pdf=path.join(temporary,'uploads',document+'.pdf');
 fs.writeFileSync(pdf,'%PDF-1.4\nFictional deployment QA\n%%EOF');
 db.prepare('INSERT INTO documents VALUES(?,?,?,?)').run(document,'EDU-DEPLOY-QA','QA.pdf',pdf);db.close();
 await start();assert.equal((await fetch(base+'/api/health')).status,200);await stop();
 const reopened=new Database(path.join(temporary,'school.sqlite'),{readonly:true});
 assert.equal(reopened.prepare('SELECT id FROM staff WHERE role=?').get('owner').id,owner.id);
 assert.equal(reopened.prepare('SELECT count(*) AS total FROM applications WHERE id=?').get('EDU-DEPLOY-QA').total,1);
 assert.equal(reopened.prepare('SELECT path FROM documents WHERE id=?').get(document).path,pdf);
 assert.match(fs.readFileSync(pdf,'utf8'),/^%PDF/);assert.equal(reopened.pragma('integrity_check',{simple:true}),'ok');reopened.close();
 console.log('Deployment smoke passed: production entry, compiled routes/assets, protected staff API, clean shutdown, database and PDF preservation across restart.');
 console.log('This local test does not verify Hostinger filesystem persistence across redeploys.');
}finally{await stop();fs.rmSync(temporary,{recursive:true,force:true});}
