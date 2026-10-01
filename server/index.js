import 'dotenv/config';import path from 'node:path';import {fileURLToPath} from 'node:url';import express from 'express';
import {openDatabase} from './db.js';import {resolveStartupConfig} from './startup.js';import {createApplication} from './app.js';import {createPublicApplication} from './public-app.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const config=resolveStartupConfig(root);const db=config.publicOnly?null:openDatabase(config.data);
const {app,mail}=config.publicOnly?createPublicApplication(config):await createApplication({db,config});
if(!config.production){const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true,allowedHosts:true},appType:'spa'});app.use(vite.middlewares);}else{
 app.use(express.static(path.join(root,'dist'),{maxAge:'1h',setHeaders:(res,file)=>{if(file.endsWith('.html'))res.setHeader('Cache-Control','no-cache');}}));
 app.get('/{*path}',(_req,res)=>{res.set('Cache-Control','no-cache');res.sendFile(path.join(root,'dist','index.html'));});
}
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`AFRISTEM v2.2.1 is listening on port ${config.port}. ${config.publicOnly?'Public website only':config.live?'Live':'Preview'} mode; email ${config.mailMode}; payments ${config.paymentsEnabled?'enabled':'disabled'}.`));mail?.start();
let closing=false;async function shutdown(){if(closing)return;closing=true;const deadline=setTimeout(()=>process.exit(1),35000);deadline.unref();await new Promise(resolve=>server.close(resolve));await mail?.stop();if(db){db.pragma('wal_checkpoint(TRUNCATE)');db.close();}process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
