import {randomBytes,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import fs from 'node:fs';import path from 'node:path';
import {audit} from '../db.js';
const scrypt=promisify(scryptCallback);
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const PASSWORD_MIN=16;
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return `scrypt$${salt}$${key.toString('hex')}`;}
export async function checkPassword(password,encoded){if(typeof password!=='string'||password.length>256||!encoded)return false;const [type,salt,hex]=encoded.split('$');if(type!=='scrypt'||!salt||hex?.length!==128)return false;const key=await scrypt(password,salt,64);return timingSafeEqual(key,Buffer.from(hex,'hex'));}
export const publicStaff=u=>({id:u.id,name:u.name,email:u.email,role:u.role,active:!!u.active,mustChangePassword:!!u.must_change,created:u.created});
const cookieToken=req=>req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('afristem_session='))?.slice(17);
export async function createAuth(db,config){
 if(!db.prepare('SELECT 1 FROM staff LIMIT 1').get()){
  let email=config.adminEmail,password=config.adminPassword;
  if(!config.production){email=email||'owner@afristem.local';const file=path.join(config.data,'preview-admin.txt');password=password||(fs.existsSync(file)?fs.readFileSync(file,'utf8').trim():randomBytes(24).toString('base64url'));fs.writeFileSync(file,password,{mode:0o600});}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<PASSWORD_MIN||password.length>256||/replace-with|your-password/i.test(password))throw Error('First startup requires ADMIN_EMAIL and a unique ADMIN_PASSWORD (16–256 characters).');
  const id=randomUUID();db.prepare("INSERT INTO staff(id,name,email,role,password_hash,must_change) VALUES(?,?,?,'owner',?,0)").run(id,'School owner',email,await hashPassword(password));
  audit(db,null,'staff.bootstrap',id);
  if(!config.production)fs.writeFileSync(path.join(config.data,'preview-access.json'),JSON.stringify({email,password},null,2),{mode:0o600});
 }
 const dummyHash=await hashPassword(randomBytes(24).toString('hex'));
 function revoke(id){db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);}
 function issue(res,user){const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),now=Date.now();db.prepare('DELETE FROM sessions WHERE expires<? OR last_seen<?').run(now,now-30*60000);db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(digest(token),user.id,csrf,now+8*3600000,now);res.cookie('afristem_session',token,{httpOnly:true,sameSite:'strict',secure:config.production,maxAge:8*3600000,path:'/api'});return csrf;}
 async function login(req,res){
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase().slice(0,254):'';
  const password=typeof req.body?.password==='string'?req.body.password:'';
  const user=db.prepare('SELECT * FROM staff WHERE email=?').get(email);
  const valid=await checkPassword(password,user?.password_hash||dummyHash);
  // Re-read after the asynchronous password calculation: deactivation/reset wins races.
  const current=user&&db.prepare('SELECT * FROM staff WHERE id=?').get(user.id);
  if(!valid||!current?.active||current.password_hash!==user.password_hash||current.locked_until>Date.now()||(current.password_expires&&current.password_expires<Date.now())){
   if(current&&current.locked_until<=Date.now()){const count=current.failed_attempts+1;db.prepare('UPDATE staff SET failed_attempts=?,locked_until=? WHERE id=?').run(count>=5?0:count,count>=5?Date.now()+15*60000:0,current.id);audit(db,current,count>=5?'auth.locked':'auth.failed',current.id);}
   return res.status(401).json({error:'Sign-in failed. Check your details, temporary password expiry, or try again in 15 minutes.'});
  }
  db.prepare('UPDATE staff SET failed_attempts=0,locked_until=0 WHERE id=?').run(current.id);
  const csrf=issue(res,current);audit(db,current,'auth.login',current.id);res.json({user:publicStaff(current),csrf});
 }
 function authenticate(req,res,next){
  const token=cookieToken(req);if(!token)return res.status(401).json({error:'Please sign in.'});
  const row=db.prepare('SELECT s.*,u.name,u.email,u.role,u.active,u.must_change FROM sessions s JOIN staff u ON u.id=s.user_id WHERE s.token=?').get(digest(token));
  if(!row||!row.active||row.expires<Date.now()||row.last_seen<Date.now()-30*60000){if(row)db.prepare('DELETE FROM sessions WHERE token=?').run(row.token);return res.status(401).json({error:'Your session expired. Please sign in again.'});}
  req.staff={id:row.user_id,name:row.name,email:row.email,role:row.role,active:true,mustChangePassword:!!row.must_change};req.session=row;
  if(!['GET','HEAD'].includes(req.method)&&req.headers['x-csrf-token']!==row.csrf)return res.status(403).json({error:'Security token expired. Refresh the page and try again.'});
  db.prepare('UPDATE sessions SET last_seen=? WHERE token=?').run(Date.now(),row.token);next();
 }
 function allow(...roles){return(req,res,next)=>{if(req.staff.mustChangePassword)return res.status(403).json({error:'Change your temporary password before accessing the workspace.',code:'PASSWORD_CHANGE_REQUIRED'});if(!roles.includes(req.staff.role))return res.status(403).json({error:'Your staff role does not allow this action.'});next();};}
 function logout(req,res){db.prepare('DELETE FROM sessions WHERE token=?').run(req.session.token);audit(db,req.staff,'auth.logout',req.staff.id);res.clearCookie('afristem_session',{path:'/api',httpOnly:true,sameSite:'strict',secure:config.production});res.json({ok:true});}
 async function changePassword(req,res){const {currentPassword,newPassword}=req.body||{};if(typeof newPassword!=='string'||newPassword.length<16||newPassword.length>256)return res.status(400).json({error:'Choose a unique passphrase of 16–256 characters.'});const user=db.prepare('SELECT * FROM staff WHERE id=?').get(req.staff.id);if(!(await checkPassword(currentPassword,user.password_hash)))return res.status(400).json({error:'Your current password is incorrect.'});if(await checkPassword(newPassword,user.password_hash))return res.status(400).json({error:'Use a different password.'});const hash=await hashPassword(newPassword);db.transaction(()=>{const fresh=db.prepare('SELECT * FROM staff WHERE id=?').get(user.id);if(!fresh.active||fresh.password_hash!==user.password_hash)throw Object.assign(Error('Account changed. Sign in again.'),{status:409});db.prepare('UPDATE staff SET password_hash=?,must_change=0,password_expires=NULL,failed_attempts=0,locked_until=0 WHERE id=?').run(hash,user.id);revoke(user.id);audit(db,req.staff,'auth.password_changed',user.id);}).immediate();res.clearCookie('afristem_session',{path:'/api'});res.json({ok:true,message:'Password changed. All sessions were signed out; sign in with your new password.'});}
 return {login,authenticate,allow,logout,changePassword,revoke};
}
