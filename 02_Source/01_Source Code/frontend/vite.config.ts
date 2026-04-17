import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["jspdf", "jspdf-autotable"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/hooks/**/*.ts",
        "src/lib/**/*.ts",
        "src/services/**/*.ts",
        "src/auth/**/*.ts",
        "src/auth/**/*.tsx",
        "src/stores/**/*.ts",
        "src/pages/dashboard/utils/**/*.ts",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/main.tsx",
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
})
