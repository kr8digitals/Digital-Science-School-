// Vercel serverless entry point.
//
// Vercel has no persistent local disk, so this target deliberately runs the
// stateless "public website only" application: programmes, resources, FAQs and
// the quiz work, while applications, uploads, payments and staff access answer
// 503 until a real persistent data layer is configured (see docs/DEPLOY-VERCEL.md).
// No SQLite database is created and better-sqlite3 is never loaded here.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getConfig} from '../server/config.js';
import {createPublicApplication} from '../server/public-app.js';
import {DEFAULT_PUBLIC_URL} from '../server/startup.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = getConfig(
  root,
  {...process.env, PUBLIC_URL: process.env.PUBLIC_URL || DEFAULT_PUBLIC_URL},
  {publicOnly: true},
);
const {app} = createPublicApplication(config);

export default app;
