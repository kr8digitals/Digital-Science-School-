import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{allowedHosts:true,fs:{strict:true,deny:['**/.env','**/.env.*','**/*.{crt,pem}','**/.git/**','**/data/**','**/server/**','**/docs/**','**/tests/**','**/.cache/**']}},build:{outDir:'dist'}});
