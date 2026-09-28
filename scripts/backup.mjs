import 'dotenv/config';import Database from 'better-sqlite3';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const data=path.resolve(process.env.DATA_DIR||'data'),base=path.resolve(process.env.BACKUP_DIR||path.join(data,'backups'));
if(!fs.existsSync(path.join(data,'school.sqlite')))throw Error('Database not found. Run the application first.');
const directory=path.join(base,new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(path.join(directory,'uploads'),{recursive:true,mode:0o700});
const source=new Database(path.join(data,'school.sqlite'),{readonly:true});await source.backup(path.join(directory,'school.sqlite'));source.close();
const snapshot=new Database(path.join(directory,'school.sqlite'));const documents=snapshot.prepare('SELECT id,path FROM documents').all();
const files=[];const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const document of documents){const expected=path.join(data,'uploads',document.id+'.pdf');if(path.resolve(document.path)!==expected||!fs.existsSync(expected)){snapshot.close();throw Error('A document is missing or outside the private upload directory. Backup is incomplete; do not use it for recovery.');}const target=path.join(directory,'uploads',document.id+'.pdf');fs.copyFileSync(expected,target);fs.chmodSync(target,0o600);files.push({path:'uploads/'+document.id+'.pdf',sha256:sha(target)});}
// Restore must not revive browser sessions or send notices captured mid-delivery.
snapshot.prepare('DELETE FROM sessions').run();snapshot.pragma('wal_checkpoint(TRUNCATE)');snapshot.close();fs.chmodSync(path.join(directory,'school.sqlite'),0o600);files.unshift({path:'school.sqlite',sha256:sha(path.join(directory,'school.sqlite'))});
const manifest={format:'afristem-backup-v2',completedAt:new Date().toISOString(),documents:documents.length,files};fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
fs.writeFileSync(path.join(data,'backup-status.json'),JSON.stringify({completedAt:manifest.completedAt,documents:manifest.documents}),{mode:0o600});console.log('Backup completed:',directory);console.log('Contains personal data and staff password hashes. Encrypt and protect the off-site copy; the local backup is not encrypted.');
