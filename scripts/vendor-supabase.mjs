// Copies the supabase-js UMD bundle from node_modules into js/vendor/supabase.min.js.
// This keeps the site offline-capable (loads the SDK without a CDN).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
const destDir = join(root, 'js', 'vendor');
const dest = join(destDir, 'supabase.min.js');

if (!existsSync(src)) {
  console.error(`Source bundle not found: ${src}`);
  console.error('Run `npm install` first (installs @supabase/server which bundles supabase-js).');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Vendored supabase-js UMD -> ${dest}`);