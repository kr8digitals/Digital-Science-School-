import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
try{
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/programmes','/resources','/quiz','/programme-finder','/register','/apply-to-teach','/contact','/track','/admin','/payment/return']){
   await page.goto(base+route,{waitUntil:'networkidle'});
   await page.getByText('Website preview · Online applications are not open yet.',{exact:false}).waitFor();
   if(['/register','/apply-to-teach','/contact','/track','/admin','/payment/return'].includes(route)){
    await page.getByRole('heading',{name:'Online applications are not open yet.'}).waitFor();
    assert.equal(await page.locator('input, textarea, input[type="file"]').count(),0,'No unavailable form fields: '+route);
    assert.equal(await page.locator('a[href="mailto:info@afristemschools.org"]').count()>0,true);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow: '+width+' '+route);
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log('Public-only browser checks passed: 11 routes at 390, 768 and 1440px; gated forms; direct contacts; no exceptions or overflow.');
}finally{await browser.close();}
