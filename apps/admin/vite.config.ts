import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

const STORE_PROXY_ENV = ["STORE_HOST", "INTERNAL_API_KEY"];

function requireProxyEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL;
  if (!apiUrl || !URL.canParse(apiUrl)) {
    throw new Error(
      "VITE_API_URL is missing or not a URL. The admin's API proxy forwards to it: set it in your host's environment (for example Vercel's Environment Variables), not only in .env.local, which is never deployed.",
    );
  }
  const missing = STORE_PROXY_ENV.filter((name) => !env[name]);
  if (env.VERCEL && missing.length > 0) {
    throw new Error(
      `${missing.join(" and ")} must be set in your host's environment. STORE_HOST is the address of the store this admin controls (its own domain, for example my-shop.vercel.app); INTERNAL_API_KEY must equal the backend's.`,
    );
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === "build") requireProxyEnv(mode);
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { port: 5273 },
  };
});
