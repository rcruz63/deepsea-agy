import { defineConfig } from 'vitest/config';

// Unifica el entorno de compilación y tests para garantizar la misma resolución de módulos ESNext
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
