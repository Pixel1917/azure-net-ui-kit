import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'happy-dom',
		include: ['tests/**/*.test.ts'],
		exclude: ['node_modules', 'dist', '.svelte-kit']
	},
	resolve: {
		conditions: ['browser', 'development', 'module', 'import', 'default'],
		alias: {
			'@azure-net/tools/environment': resolve(__dirname, 'tests/mocks/toolsEnvironment.ts')
		}
	}
});
