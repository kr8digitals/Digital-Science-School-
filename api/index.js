// Vercel serverless entry point.
//
// Vercel has no persistent local disk, so this target deliberately runs the
// stateless "public website only" application: programmes, resources, FAQs and
// the quiz work, while applications, uploads, payments and staff access answer
// 503 until a real persistent data layer is configured (see docs/DEPLOY-VERCEL.md).
// No SQLite database is created and better-sqlite3 is never loaded here.
//
// Vercel's plain api/ directory only matches one path segment per file (a
// [...path].js file does not become a multi-segment catch-all there), so
// vercel.json rewrites every /api/* request to this function with the original
// suffix in ?__path=. Restore it before Express routes the request.
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

const API_PREFIX = '/api';

function restoreRequestPath(req) {
  const raw = typeof req.url === 'string' ? req.url : '';
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  const captured = params.get('__path');
  if (captured === null) return;
  params.delete('__path');
  const suffix = params.toString();
  const segment = captured.replace(/^\/+/, '');
  req.url = API_PREFIX + (segment ? '/' + segment : '') + (suffix ? '?' + suffix : '');
}

export default function handler(req, res) {
  restoreRequestPath(req);
  app(req, res);
}
