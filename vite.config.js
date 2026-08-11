import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "");
  const vitePort = Number(env.VITE_PORT) || 5173;
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@config": path.join(root, "config"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: vitePort,
      proxy: {
        "/socket.io": {
          target: proxyTarget,
          ws: true,
        },
        "/api": {
          target: proxyTarget,
        },
        // Do not proxy /config — Vite resolves @config/* imports as modules;
        // proxying returns raw application/json and breaks ?import.
      },
    },
  };
});
