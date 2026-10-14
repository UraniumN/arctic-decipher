import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        investigation: fileURLToPath(new URL("./src/index.html", import.meta.url)),
        erp: fileURLToPath(new URL("./src/erp.html", import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
  },
});
