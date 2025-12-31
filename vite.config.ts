

import { defineConfig, loadEnv } from 'vite';
// Fix: Import process from node:process to resolve TypeScript type errors for cwd() in Node.js environment
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Load environment variables from the current directory.
  // Using an empty string as the third argument allows loading variables without the VITE_ prefix if needed,
  // but we prioritize VITE_GEMINI_API_KEY for standard Vite practice.
  const env = loadEnv(mode, process.cwd(), '');
  
  const apiKey = env.VITE_GEMINI_API_KEY || env.API_KEY || '';

  return {
    define: {
      // 1. Direct replacement of the string 'process.env.API_KEY'
      'process.env.API_KEY': JSON.stringify(apiKey),
      
      // 2. Provision of a global process.env object to avoid 'process is not defined' errors
      'process.env': {
        API_KEY: JSON.stringify(apiKey)
      }
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true // Allow access via network if needed
    }
  };
});
