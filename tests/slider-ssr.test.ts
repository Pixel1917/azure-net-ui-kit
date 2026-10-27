// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

describe('real server compilation', () => {
	it('renders slider responsive CSS and Cropper image without browser globals', async () => {
		const server = await createServer({
			configFile: false,
			plugins: [svelte({ configFile: false })],
			server: { middlewareMode: true, hmr: false, ws: false },
			appType: 'custom'
		});
		try {
			const { render } = await server.ssrLoadModule('svelte/server');
			const { default: SliderHarness } = await server.ssrLoadModule('/tests/fixtures/SliderHarness.svelte');
			const result = render(SliderHarness);
			expect(result.body).toContain('>A<');
			expect(result.head).toContain('@media(min-width:768px)');
			expect(result.head).toContain('--slider-view:3');
			const { default: Cropper } = await server.ssrLoadModule('/src/lib/widgets/Cropper/Cropper.svelte');
			expect(render(Cropper, { props: { src: '/image.jpg' } }).body).toContain('src="/image.jpg"');
			const { createZoomable } = await server.ssrLoadModule('/src/lib/utils/zoomable/index.ts');
			expect(createZoomable().getTransform().scale).toBe(1);
		} finally {
			await server.close();
		}
	}, 20000);
});
