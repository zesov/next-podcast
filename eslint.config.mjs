import { dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import Next.js ESLint configurations directly
const nextConfig = require("./node_modules/eslint-config-next/dist/index.js");
const nextCoreWebVitalsConfig = require("./node_modules/eslint-config-next/dist/core-web-vitals.js");
const nextTypescriptConfig = require("./node_modules/eslint-config-next/dist/typescript.js");

// Combine the configurations
const eslintConfig = [
  ...nextCoreWebVitalsConfig,
  ...nextTypescriptConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
