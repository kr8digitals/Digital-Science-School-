import {getConfig} from './config.js';

// Public, non-secret defaults for this school's deployment. No credentials belong here.
export const DEFAULT_PUBLIC_URL='https://digitalschool.afristemglobal.org';
export function resolveStartupConfig(root,env=process.env){
 const production=env.NODE_ENV==='production';
 // Missing persistent storage never becomes an ephemeral admissions database.
 // Explicit live mode still fails validation instead of silently downgrading.
 const publicOnly=production&&!env.DATA_DIR?.trim()&&env.LAUNCH_MODE!=='live';
 const effective={...env,PUBLIC_URL:env.PUBLIC_URL||DEFAULT_PUBLIC_URL};
 // Full production startup must opt into persistent storage, even in preview.
 if(production&&!publicOnly)effective.HOSTING_TARGET=env.HOSTING_TARGET||'hostinger-managed';
 return getConfig(root,effective,{publicOnly});
}
