import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	test: {
		globals: true,
		environment: 'happy-dom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
		},
	},
	resolve: {
		alias: {
			'survey-core/survey-core.min.css': new URL('./tests/__mocks__/empty.css', import.meta.url).pathname,
			'survey-creator-core/survey-creator-core.min.css': new URL('./tests/__mocks__/empty.css', import.meta.url)
				.pathname,
		},
	},
});
