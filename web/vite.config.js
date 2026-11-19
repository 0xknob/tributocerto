import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev local: `npm run dev` e o proxy repassa /api ao Caddy (http://localhost).
// Produção/local-docker: o site é servido pelo próprio Caddy (mesma origem).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost",
    },
  },
  build: {
    sourcemap: false,
  },
});
