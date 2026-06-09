import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  // 预打包重型依赖，加速首次加载
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@tauri-apps/api/core",
      "@tauri-apps/api/window",
      "zustand",
      "dayjs",
      "dayjs/plugin/relativeTime",
      "dayjs/locale/zh-cn",
    ],
  },
  // 构建优化
  build: {
    target: "esnext",
    minify: "esbuild",
  },
}));
