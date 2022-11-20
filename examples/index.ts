import { rollup } from '../src/rollup.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

rollup({
  entry: path.resolve(__dirname, './src/index.js'),
})
