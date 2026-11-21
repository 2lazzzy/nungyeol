import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
cpSync(here('./node_modules/@mediapipe/tasks-vision/wasm'), here('./public/vision/wasm'), { recursive: true });

export default defineConfig({ server: { port: 8138, strictPort: true } });
