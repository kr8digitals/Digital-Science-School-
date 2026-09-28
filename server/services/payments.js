import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {audit} from '../db.js';
export class PaymentError extends Error {constructor(message,status=409){super(message);this.status=status;}}
export function createPaystack(config,fetcher=fetch){
 async function request(endpoint,options={}){
  let r;try{r=await fetcher('https://api.paystack.co'+endpoint,{...options,headers:{Authorization:`Bearer ${config.paystackKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});}catch{throw new PaymentError('The payment service did not respond. The existing reference is retained; do not start a separate payment.',503);}
  let payload;try{payload=await r.json();}catch{throw new PaymentError('Payment service returned an unreadable response. Please reconcile this attempt.',503);}
  if(r.status===404)throw Object.assign(new PaymentError('The provider has not found this reference. Do not create another charge while the outcome is uncertain.',409),{notFound:true});
  if(!r.ok||!payload.status)throw new PaymentError('The provider could not complete this request. The payment reference is retained for reconciliation.',503);
  return payload.data;
 }
 return {initialize:p=>request('/transaction/initialize',{method:'POST',body:JSON.stringify(p)}),verify:r=>request('/transaction/verify/'+encodeURIComponent(r))};
}
export function validWebhookSignature(buffer,signature,key){if(!key||!Buffer.isBuffer(buffer)||typeof signature!=='string'||!/^[a-f0-9]{128}$/i.test(signature))return false;return timingSafeEqual(createHmac('sha512',key).update(buffer).digest(),Buffer.from(signature,'hex'));}
export function createPayments(db,config,notifications,provider=createPaystack(config)){
 function applyVerified(reference,v,actor=null){
  return db.transaction(()=>{
   const p=db.prepare('SELECT * FROM payments WHERE reference=?').get(reference);if(!p)return null;
   if(p.status==='paid')return {status:'paid',reference,amount:p.amount/100,currency:p.currency};
   const exact=v?.reference===p.reference&&v?.amount===p.amount&&v?.currency===p.currency;
   if(!exact){db.prepare("UPDATE payments SET status='mismatch',checked_at=CURRENT_TIMESTAMP,last_error='Provider reference, amount or currency mismatch.' WHERE reference=?").run(reference);audit(db,actor,'payment.verification_mismatch',reference);return {status:'mismatch',reference};}
   if(v.status==='success'){
    db.prepare("UPDATE payments SET status='paid',provider_id=?,checked_at=CURRENT_TIMESTAMP,last_error=NULL,lease_until=0 WHERE reference=?").run(String(v.id||''),reference);
    notifications.receipt(p);audit(db,actor,'payment.verified',reference);
    return {status:'paid',reference,amount:p.amount/100,currency:p.currency};
   }
   const status=['failed','abandoned','reversed'].includes(v.status)?v.status:'pending';
   db.prepare('UPDATE payments SET status=?,checked_at=CURRENT_TIMESTAMP,last_error=NULL WHERE reference=?').run(status,reference);audit(db,actor,'payment.checked:'+status,reference);return {status,reference};
  }).immediate();
 }
 async function verify(reference,actor=null){
  const p=db.prepare('SELECT * FROM payments WHERE reference=?').get(reference);if(!p)return null;
  if(p.status==='paid')return {status:'paid',reference,amount:p.amount/100,currency:p.currency};
  try{return applyVerified(reference,await provider.verify(reference),actor);}catch(e){db.prepare('UPDATE payments SET checked_at=CURRENT_TIMESTAMP,last_error=? WHERE reference=?').run('Provider verification unavailable; preserve reference and check again.',reference);throw e;}
 }
 async function initialize(application){
  const row=db.transaction(()=>{
   const previous=db.prepare('SELECT * FROM payments WHERE application_id=? ORDER BY created').all(application.id);
   if(previous.some(p=>p.status==='paid'))throw new PaymentError('Your admission form fee is already paid. Check application tracking for the receipt.');
   // Legacy v1 could create several attempts. Never silently pick one or delete them.
   if(previous.length>1)throw new PaymentError('Multiple previous attempts need finance review. Do not make another payment.');
   if(previous.length)return previous[0];
   const reference='PAY-'+randomBytes(16).toString('hex').toUpperCase();
   db.prepare("INSERT INTO payments(reference,application_id,amount,currency,status) VALUES(?,?,100000,'NGN','new')").run(reference,application.id);
   return db.prepare('SELECT * FROM payments WHERE reference=?').get(reference);
  }).immediate();
  if(row.status==='mismatch'||row.status==='reversed')throw new PaymentError('This payment needs finance review. Do not attempt another charge.');
  // One durable reference per application. Duplicate clicks reuse the same checkout;
  // ambiguous initializations never create a replacement reference.
  if(row.authorization_url&&['pending','new'].includes(row.status))return {url:row.authorization_url,reference:row.reference,reused:true};
  const acquired=db.prepare('UPDATE payments SET lease_until=? WHERE reference=? AND lease_until<?').run(Date.now()+45000,row.reference,Date.now());
  if(!acquired.changes)throw new PaymentError('Your checkout is being prepared or checked. Wait a moment, then retry the same application.');
  try{
   const current=db.prepare('SELECT * FROM payments WHERE reference=?').get(row.reference);
   if(current.status==='paid')throw new PaymentError('Your admission form fee is already paid.');
   if(current.init_started||current.status!=='new'){
    const result=await verify(row.reference);
    if(result.status==='paid')throw new PaymentError('Payment is already verified. View your receipt in application tracking.');
    const latest=db.prepare('SELECT * FROM payments WHERE reference=?').get(row.reference);
    if(latest.authorization_url&&result.status==='pending')return {url:latest.authorization_url,reference:row.reference,reused:true};
    throw new PaymentError('This existing payment attempt needs finance assistance before another checkout. Please quote '+row.reference+'.');
   }
   db.prepare("UPDATE payments SET init_started=1,status='initializing' WHERE reference=?").run(row.reference);
   let p;try{p=await provider.initialize({email:application.email,amount:100000,currency:'NGN',reference:row.reference,callback_url:config.publicUrl+'/payment/return'});}catch(e){db.prepare("UPDATE payments SET status='uncertain',last_error='Checkout initialization outcome is uncertain. Reconcile the existing reference.' WHERE reference=? AND status!='paid'").run(row.reference);audit(db,null,'payment.initialization_uncertain',row.reference);throw e;}
   let u;try{u=new URL(p?.authorization_url);}catch{}
   if(!u||u.protocol!=='https:'||u.hostname!=='checkout.paystack.com'||(u.port&&u.port!=='443')||u.username||u.password||p.reference!==row.reference){db.prepare("UPDATE payments SET status='uncertain',last_error='Unexpected checkout response. Finance review required.' WHERE reference=? AND status!='paid'").run(row.reference);throw new PaymentError('The provider returned unexpected checkout details. Do not make another payment.',502);}
   db.prepare("UPDATE payments SET authorization_url=?,access_code=?,status=CASE WHEN status='paid' THEN 'paid' ELSE 'pending' END,last_error=NULL WHERE reference=?").run(u.href,String(p.access_code||''),row.reference);audit(db,null,'payment.checkout_created',row.reference);
   if(db.prepare('SELECT status FROM payments WHERE reference=?').get(row.reference).status==='paid')throw new PaymentError('Payment already verified. Check application tracking.');
   return {url:u.href,reference:row.reference,reused:false};
  }finally{db.prepare('UPDATE payments SET lease_until=0 WHERE reference=?').run(row.reference);}
 }
 function webhook(body,signature){
  if(!validWebhookSignature(body,signature,config.paystackKey))throw new PaymentError('Invalid signature.',401);
  let event;try{event=JSON.parse(body.toString('utf8'));}catch{throw new PaymentError('Invalid webhook JSON.',400);}
  if(event.event==='charge.success'&&event.data?.status==='success'&&typeof event.data.reference==='string')applyVerified(event.data.reference,event.data);
 }
 return {initialize,verify,webhook,applyVerified};
}
