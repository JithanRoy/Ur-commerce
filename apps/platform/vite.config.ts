import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

function requireApiUrl(mode: string) {
  const apiUrl = loadEnv(mode, process.cwd(), "VITE_").VITE_API_URL;
  if (!apiUrl || !URL.canParse(apiUrl)) {
    throw new Error(
      "VITE_API_URL is missing or not a URL. It is baked in at build time: set it in your host's build environment (for example Render's Environment tab), not only in .env.local, which is never deployed.",
    );
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === "build") requireApiUrl(mode);
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { port: 5373, strictPort: true },
  };
});
