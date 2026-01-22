//localmodules/basePath.js

import path from 'path';
import process from 'process';
import { app } from 'electron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const __basePath = path.resolve(__dirname, '..');
export const __appDataPath = app.getPath('userData');
