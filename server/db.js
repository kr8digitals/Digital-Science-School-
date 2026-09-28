import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
export function openDatabase(directory) {
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  fs.mkdirSync(path.join(directory,'uploads'),{recursive:true,mode:0o700});
  const db=new Database(path.join(directory,'school.sqlite'));
  db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON'); db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY,kind TEXT NOT NULL,name TEXT,email TEXT,payload TEXT,status TEXT DEFAULT 'received',created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,application_id TEXT REFERENCES applications(id),name TEXT,path TEXT);
    CREATE TABLE IF NOT EXISTS payments(reference TEXT PRIMARY KEY,application_id TEXT REFERENCES applications(id),amount INTEGER,currency TEXT,status TEXT DEFAULT 'pending',created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,action TEXT,record_id TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,applied TEXT DEFAULT CURRENT_TIMESTAMP);
  `);
  function column(table,name,type) { if(!db.pragma(`table_info(${table})`).some(c=>c.name===name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`); }
  db.transaction(()=>{
    // Version 2 retires all shared-password sessions. Existing applications/uploads stay intact.
    if(!db.prepare('SELECT 1 FROM schema_migrations WHERE version=2').get()) {
      db.exec('DROP TABLE IF EXISTS sessions');
      db.prepare('INSERT INTO schema_migrations(version) VALUES(2)').run();
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,role TEXT NOT NULL CHECK(role IN ('owner','admissions','finance')),password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,must_change INTEGER NOT NULL DEFAULT 1,password_expires INTEGER,failed_attempts INTEGER NOT NULL DEFAULT 0,locked_until INTEGER NOT NULL DEFAULT 0,created TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES staff(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL,last_seen INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS email_outbox(id TEXT PRIMARY KEY,event_key TEXT UNIQUE NOT NULL,recipient TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL,record_id TEXT,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,total_attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL,lease_until INTEGER NOT NULL DEFAULT 0,last_error TEXT,accepted_at TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS outbox_due ON email_outbox(status,next_attempt);
      CREATE INDEX IF NOT EXISTS applications_kind_created ON applications(kind,created);
      CREATE INDEX IF NOT EXISTS payment_application ON payments(application_id);
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    `);
    column('audit','actor_id','TEXT');column('audit','actor_name','TEXT');
    for(const [name,type] of [['authorization_url','TEXT'],['access_code','TEXT'],['init_started','INTEGER DEFAULT 0'],['lease_until','INTEGER DEFAULT 0'],['checked_at','TEXT'],['last_error','TEXT'],['provider_id','TEXT']]) column('payments',name,type);
  }).immediate();
  try {fs.chmodSync(path.join(directory,'school.sqlite'),0o600);}catch{}
  return db;
}
export function audit(db,actor,action,recordId=null){
  db.prepare('INSERT INTO audit(action,record_id,actor_id,actor_name) VALUES(?,?,?,?)').run(action,recordId,actor?.id||null,actor?`${actor.name} <${actor.email}>`:'System');
}
