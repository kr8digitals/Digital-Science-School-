import path from 'node:path';
export function getConfig(root,env=process.env,{publicOnly=false}={}){
 const config={publicOnly,hostingTarget:env.HOSTING_TARGET||'generic',persistentStorageConfirmed:env.PERSISTENT_STORAGE_CONFIRMED==='true',root,data:path.resolve(env.DATA_DIR||path.join(root,'data')),port:Number(env.PORT||3000),production:env.NODE_ENV==='production',live:env.LAUNCH_MODE==='live',publicUrl:(env.PUBLIC_URL||'').replace(/\/$/,''),trustProxy:Number(env.TRUST_PROXY_HOPS??1),adminEmail:(env.ADMIN_EMAIL||'').trim().toLowerCase(),adminPassword:env.ADMIN_PASSWORD||'',paystackKey:env.PAYSTACK_SECRET_KEY||'',paymentsEnabled:env.PAYMENTS_ENABLED==='true',policiesApproved:env.POLICIES_APPROVED==='true',mailMode:env.MAIL_DELIVERY||'off',smtpHost:env.SMTP_HOST||'',smtpPort:Number(env.SMTP_PORT||587),smtpSecure:env.SMTP_SECURE==='true',smtpUser:env.SMTP_USER||'',smtpPass:env.SMTP_PASSWORD||'',mailFrom:env.MAIL_FROM||'',mailTestRecipient:env.MAIL_TEST_RECIPIENT||'',uploadsReviewed:env.UPLOAD_SCANNING_REVIEWED==='true'};
 if(publicOnly&&(config.live||config.paymentsEnabled||config.mailMode!=='off'))throw Error('Public-only startup cannot enable live admissions, payments or email. Configure private persistent storage and owner access first.');
 if(!['generic','hostinger-managed','hostinger-vps'].includes(config.hostingTarget))throw Error('HOSTING_TARGET must be generic, hostinger-managed or hostinger-vps.');
 if(!Number.isInteger(config.port)||config.port<1||config.port>65535)throw Error('PORT must be an integer between 1 and 65535.');
 if(config.production&&!publicOnly&&(config.hostingTarget!=='generic'||config.live)){
  if(!env.DATA_DIR||!path.isAbsolute(env.DATA_DIR)||!config.persistentStorageConfirmed)throw Error('Deployment requires an absolute private DATA_DIR and PERSISTENT_STORAGE_CONFIRMED=true after checking persistence with your host.');
  const lower=config.data.toLowerCase().split(path.sep);
  if(lower.includes('public_html')||lower.includes('hbuilds'))throw Error('DATA_DIR must not be inside Hostinger public_html or hbuilds deployment folders.');
  if(config.hostingTarget==='hostinger-managed'){
   const relative=path.relative(path.resolve(root),config.data);
   if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Managed Hostinger DATA_DIR must be outside the application source directory.');
  }
 }
 if(!['off','smtp'].includes(config.mailMode))throw Error('MAIL_DELIVERY must be off or smtp.');
 if(!Number.isInteger(config.trustProxy)||config.trustProxy<0||config.trustProxy>5)throw Error('TRUST_PROXY_HOPS must be between 0 and 5.');
 if(config.publicUrl){const u=new URL(config.publicUrl);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('PUBLIC_URL must be an origin without a path, credentials or query.');}
 if(config.live&&(!config.publicUrl.startsWith('https://')||!config.policiesApproved))throw Error('Live mode requires an HTTPS PUBLIC_URL and POLICIES_APPROVED=true after actual policy approval.');
 if(config.paystackKey.startsWith('sk_live_')&&!config.live)throw Error('Use a Paystack test key in preview, never a live key.');
 if(config.paymentsEnabled&&(!config.paystackKey||!config.publicUrl.startsWith('https://')))throw Error('Payments require PAYSTACK_SECRET_KEY and an HTTPS PUBLIC_URL.');
 if(config.paymentsEnabled&&config.live&&!config.paystackKey.startsWith('sk_live_'))throw Error('Live payments require a live Paystack secret.');
 const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if(config.mailMode==='smtp'){
  if(!config.smtpHost||!config.smtpUser||!config.smtpPass||!email.test(config.mailFrom)||!config.publicUrl.startsWith('https://'))throw Error('SMTP needs a host, username, password, plain sender email and HTTPS PUBLIC_URL.');
  if(!config.live&&!email.test(config.mailTestRecipient))throw Error('Preview SMTP requires MAIL_TEST_RECIPIENT; all messages are redirected there.');
  if(config.live&&config.mailTestRecipient)throw Error('Remove MAIL_TEST_RECIPIENT before live email delivery.');
 }
 return config;
}
