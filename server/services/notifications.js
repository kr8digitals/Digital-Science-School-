import nodemailer from 'nodemailer';
import {randomUUID} from 'node:crypto';
import {audit} from '../db.js';
export function createNotifications(db,config,injectedTransport=null){
 const enabled=config.mailMode==='smtp';
 const transport=injectedTransport||(enabled?nodemailer.createTransport({host:config.smtpHost,port:config.smtpPort,secure:config.smtpSecure,requireTLS:!config.smtpSecure,auth:{user:config.smtpUser,pass:config.smtpPass},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000,tls:{minVersion:'TLSv1.2',rejectUnauthorized:true}}):null);
 let running=false,timer=null;
 function enqueue({key,recipient,subject,body,kind,recordId=null}){
  const id=randomUUID();
  // Held messages are NEVER automatically activated when SMTP is later configured.
  db.prepare('INSERT OR IGNORE INTO email_outbox(id,event_key,recipient,subject,body,kind,record_id,status,next_attempt) VALUES(?,?,?,?,?,?,?,?,?)').run(id,key,recipient,subject,body,kind,recordId,enabled?'queued':'held',Date.now());
  return enabled?'queued':'disabled';
 }
 const footer=`\n\nAFRISTEM Digital Science School\ninfo@afristemschools.org | +234 810 554 1242\n${config.publicUrl?config.publicUrl+'/track':'Keep your reference and use the Track an application page on the school website.'}`;
 function application(row){return enqueue({key:`application:${row.id}`,recipient:row.email,subject:'AFRISTEM — we have received your '+(row.kind==='contact'?'message':'application'),body:`Thank you for contacting AFRISTEM.\n\nYour reference: ${row.id}\nWe have received your ${row.kind==='contact'?'message':'application'} for review. This is not confirmation of enrolment or appointment. Keep your reference for follow-up.${footer}`,kind:'application_received',recordId:row.id});}
 function status(row,eventId){return enqueue({key:`status:${eventId}`,recipient:row.email,subject:'AFRISTEM — an update on your application',body:`There is an update on reference ${row.id}.\n\nPlease check your application status on the school website using your reference and the email you applied with. Contact admissions if you need clarification. A status update is not a timetable or confirmation that classes have begun.${footer}`,kind:'status_update',recordId:row.id});}
 function receipt(payment){const row=db.prepare('SELECT email FROM applications WHERE id=?').get(payment.application_id);return enqueue({key:`receipt:${payment.reference}`,recipient:row.email,subject:'AFRISTEM — admission form payment confirmed',body:`Your admission form payment has been verified.\n\nReceipt reference: ${payment.reference}\nApplication: ${payment.application_id}\nAmount: NGN ${(payment.amount/100).toFixed(2)}\n\nThis payment covers the admission form only, not tuition, examination registration or guaranteed enrolment.${footer}`,kind:'payment_receipt',recordId:payment.application_id});}
 async function runOnce(){
  if(running||!enabled||!transport)return;running=true;
  try{
   const now=Date.now();db.prepare("UPDATE email_outbox SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'retrying' END,lease_until=0,next_attempt=?,last_error='Delivery worker interrupted; acceptance is uncertain.' WHERE status='sending' AND lease_until<?").run(now,now);
   const item=db.transaction(()=>{const row=db.prepare("SELECT * FROM email_outbox WHERE status IN ('queued','retrying') AND next_attempt<=? ORDER BY created LIMIT 1").get(now);if(!row)return null;db.prepare("UPDATE email_outbox SET status='sending',lease_until=?,attempts=attempts+1,total_attempts=total_attempts+1 WHERE id=?").run(now+120000,row.id);return {...row,attempts:row.attempts+1};}).immediate();
   if(!item)return;
   try{
    const to=config.live?item.recipient:config.mailTestRecipient;
    const result=await transport.sendMail({from:config.mailFrom,to,subject:(config.live?'':'[AFRISTEM PREVIEW] ')+item.subject,text:item.body,messageId:`<${item.id}@${config.mailFrom.split('@')[1]}>`,disableFileAccess:true,disableUrlAccess:true});
    if(!Array.isArray(result.accepted)||!result.accepted.some(a=>String(a).toLowerCase()===to.toLowerCase()))throw Error('SMTP did not accept the recipient.');
    db.prepare("UPDATE email_outbox SET status='accepted',accepted_at=CURRENT_TIMESTAMP,lease_until=0,last_error=NULL WHERE id=?").run(item.id);audit(db,null,'email.smtp_accepted',item.id);
   }catch(e){const terminal=item.attempts>=5;const code=String(e.code||'DELIVERY_ERROR').replace(/[^A-Z0-9_]/gi,'').slice(0,40);db.prepare('UPDATE email_outbox SET status=?,next_attempt=?,lease_until=0,last_error=? WHERE id=?').run(terminal?'failed':'retrying',Date.now()+Math.min(3600000,30000*2**(item.attempts-1)),`Mail service error (${code}). Check credentials, TLS and provider logs.`,item.id);audit(db,null,terminal?'email.failed':'email.retry_scheduled',item.id);}
  }finally{running=false;}
 }
 function start(){if(timer||!enabled)return;timer=setInterval(()=>runOnce().catch(()=>console.error('Email worker could not access its queue.')),5000);timer.unref();}
 async function stop(){if(timer)clearInterval(timer);timer=null;while(running)await new Promise(r=>setTimeout(r,50));transport?.close?.();}
 return {enabled,enqueue,application,status,receipt,runOnce,start,stop,get running(){return running;}};
}
