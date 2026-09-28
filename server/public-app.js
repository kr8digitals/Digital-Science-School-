import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {programmes,faqs,resources,quiz} from './content.js';

// Stateless initial deployment: no database, uploads, owner account or email worker.
export function createPublicApplication(config){
 const app=express();app.disable('x-powered-by');app.set('trust proxy',config.trustProxy);
 app.use(helmet({frameguard:false,contentSecurityPolicy:{directives:{'frame-ancestors':null,'img-src':["'self'",'data:'],'script-src':["'self'"],'upgrade-insecure-requests':null}}}));
 app.use(compression());
 app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.use('/api',rateLimit({windowMs:60000,limit:150,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many requests. Please wait a minute.'}}));
 app.get('/api/health',(_req,res)=>res.json({ok:true,version:'2.2.0',mode:'public-only',admissionsReady:false}));
 app.get('/api/content',(_req,res)=>res.json({programmes,faqs,resources,operationsReady:false,preview:true,paymentsEnabled:false,emailEnabled:false,admissionFee:1000}));
 app.get('/api/quiz',(_req,res)=>res.json(quiz.map(({answer,explanation,...q})=>q)));
 app.post('/api/quiz/grade',express.json({limit:'2kb'}),(req,res)=>{
  const a=req.body?.answers;
  if(!Array.isArray(a)||a.length!==quiz.length||a.some(v=>!Number.isInteger(v)||v<0||v>3))return res.status(400).json({error:'Answer all five questions first.'});
  res.json({score:a.filter((v,i)=>v===quiz[i].answer).length,total:quiz.length,review:quiz.map((q,i)=>({...q,selected:a[i]}))});
 });
 // Reject before reading form/multipart bodies; never pretend a submission was saved.
 app.use('/api',(_req,res)=>res.status(503).json({code:'SETUP_REQUIRED',error:'Online applications, tracking, payments and staff access are not open yet. Please contact AFRISTEM directly. No submission has been saved.'}));
 app.get('/robots.txt',(_req,res)=>res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
 app.use((error,_req,res,_next)=>res.status(error.status||500).json({error:error.status===413?'Request too large.':'The request could not be processed.'}));
 return {app,mail:null};
}
