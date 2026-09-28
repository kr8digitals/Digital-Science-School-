// Production entry point for Hostinger and other Node.js process managers.
// Development intentionally uses `npm run dev` instead.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
process.env.NODE_ENV='production';
const root=path.dirname(fileURLToPath(import.meta.url));
if(!fs.existsSync(path.join(root,'dist','index.html'))){
  console.error('The frontend build is missing. Run npm ci --include=dev, then npm run build before starting the app.');
  process.exit(1);
}
await import('./server/index.js');
