import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_BASE_URL || "http://localhost:8900";

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      tsconfigPaths: true,
      alias: [
        {
          find: /^react-native\/Libraries\/Utilities\/codegenNativeComponent/,
          replacement: path.resolve(__dirname, "src/lib/codegenShim.ts"),
        },
        { find: /^react-native$/, replacement: "react-native-web" },
      ],
      extensions: [
        ".web.tsx",
        ".web.ts",
        ".web.jsx",
        ".web.js",
        ".tsx",
        ".ts",
        ".jsx",
        ".js",
      ],
    },
    // Pin the dev server to 6000 so it matches the backend's Microsoft SSO
    // redirect target (FRONTEND_URL) and CORS_ALLOWED_ORIGINS.
    server: {
      port: 6000,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/ai": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/health": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/docs": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/openapi.json": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
