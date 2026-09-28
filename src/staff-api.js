let csrf='';
export function clearStaffToken(){csrf='';}
export async function staffApi(url,options={}){
 const response=await fetch('/api/admin'+url,{...options,headers:{'Content-Type':'application/json',...(options.method&&options.method!=='GET'?{'X-CSRF-Token':csrf}:{}),...options.headers}});
 let data;try{data=await response.json();}catch{throw Error('The server is unavailable. Please try again.');}
 if(!response.ok){const e=Error(data.error||'The request could not be completed.');e.status=response.status;throw e;}
 if(data.csrf)csrf=data.csrf;return data;
}
export const post=body=>({method:'POST',body:JSON.stringify(body)});
