// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Optional external Playwright runtime has no local type declarations.
// @ts-nocheck -- Optional standalone browser runner, no Playwright dependency in the UI kit.
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = createHttpServer(async (req, res) => {
	if (req.url !== '/')
		return vite.middlewares(req, res, () => {
			res.statusCode = 404;
			res.end();
		});
	try {
		const { render } = await vite.ssrLoadModule('svelte/server');
		const { default: Harness } = await vite.ssrLoadModule('/tests/browser/Harness.svelte');
		const { body, head } = render(Harness);
		res.setHeader('Content-Type', 'text/html');
		res.end(
			`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${head}</head><body><div id="app">${body}</div><script type="module" src="/tests/browser/client.js"></script></body></html>`
		);
	} catch (error) {
		res.statusCode = 500;
		res.end(String(error));
	}
});
const vite = await createServer({
	configFile: false,
	plugins: [svelte({ configFile: false, compilerOptions: { css: 'injected' } })],
	server: { middlewareMode: true, hmr: { server } },
	appType: 'custom'
});
let browser;
try {
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const url = `http://127.0.0.1:${server.address().port}`;
	browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE });
	const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 1000 } });
	const ssr = await noJS.newPage();
	await ssr.goto(url);
	const desktop = await ssr.locator('.slider-slide').first().boundingBox();
	const desktopViewport = await ssr.locator('.slider-viewport').boundingBox();
	assert.ok(Math.abs(desktop.width - (desktopViewport.width - 24) / 3) < 1, 'desktop SSR 3 columns before JS');
	await ssr.setViewportSize({ width: 390, height: 900 });
	const mobile = await ssr.locator('.slider-slide').first().boundingBox();
	const mobileViewport = await ssr.locator('.slider-viewport').boundingBox();
	assert.ok(Math.abs(mobile.width - mobileViewport.width) < 1, 'mobile SSR 1 column before JS');
	await noJS.close();

	const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (error) => errors.push(String(error)));
	page.on('console', (message) => {
		if (/hydration|effect_update_depth/.test(message.text())) errors.push(message.text());
	});
	await page.goto(url);
	await page.waitForSelector('html[data-hydrated="true"]');
	await page.waitForFunction(() => window.harness.getSlider().pageCount === 3);
	assert.notEqual(
		await page.locator('.slider-navigation').evaluate((node) => getComputedStyle(node).display),
		'flex',
		'decorations absent without CSS import'
	);
	await page.evaluate(() => import('/tests/browser/styles.js'));
	await page.waitForFunction(() => getComputedStyle(document.querySelector('.slider-navigation')).display === 'flex');
	await page.evaluate(() => document.querySelector('.slider').classList.remove('styled'));
	assert.notEqual(
		await page.locator('.slider-navigation').evaluate((node) => getComputedStyle(node).display),
		'flex',
		'decorations require styled opt-in'
	);
	await page.evaluate(() => document.querySelector('.slider').classList.add('styled'));
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.waitForFunction(() => window.harness.getSlider().activeIndex === 1);
	await page.locator('.slider-viewport').focus();
	await page.keyboard.press('End');
	await page.waitForFunction(() => {
		const api = window.harness.getSlider();
		return api.isEnd && api.activeIndex === api.pageCount - 1;
	});
	await page.getByLabel('Input three').focus();
	await page.keyboard.press('Home');
	assert.equal(await page.evaluate(() => window.harness.getSlider().activeIndex), 2, 'input keys do not navigate slider');
	await page.setViewportSize({ width: 390, height: 1000 });
	await page.waitForFunction(() => window.harness.getSlider().pageCount === 5);
	await page.evaluate(() => {
		document.getElementById('app').style.transform = 'scale(.5)';
		window.dispatchEvent(new Event('resize'));
		window.harness.getSlider().slideTo(1, 'instant');
	});
	await page.waitForFunction(() => {
		const node = document.querySelector('.slider-viewport');
		return (
			Math.abs(node.scrollLeft - (node.children[1].offsetLeft - node.children[0].offsetLeft)) < 1 && window.harness.getSlider().activeIndex === 1
		);
	});
	assert.equal(await page.evaluate(() => window.harness.getSlider().activeIndex), 1, 'scaled ancestor uses layout-space positions');
	await page.evaluate(() => {
		document.getElementById('app').style.transform = '';
		window.harness.getSlider().slideTo(0, 'instant');
	});
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.waitForFunction(() => document.querySelector('.slider-viewport').scrollLeft === 0);
	await page.evaluate(() => {
		const api = window.harness.getSlider();
		api.slideNext();
		api.slideNext();
		api.slideNext();
		api.slidePrev();
		window.dispatchEvent(new Event('resize'));
	});
	await page.waitForFunction(() => {
		const node = document.querySelector('.slider-viewport');
		return (
			Math.abs(node.scrollLeft - (node.children[2].offsetLeft - node.children[0].offsetLeft)) < 1 && window.harness.getSlider().activeIndex === 2
		);
	});
	await page.evaluate(() => {
		const api = window.harness.getSlider();
		api.slidePrev();
		api.slidePrev();
		api.slideNext();
	});
	await page.waitForFunction(() => {
		const node = document.querySelector('.slider-viewport');
		return (
			Math.abs(node.scrollLeft - (node.children[1].offsetLeft - node.children[0].offsetLeft)) < 1 && window.harness.getSlider().activeIndex === 1
		);
	});
	await page.evaluate(() => window.harness.getSlider().slideTo(0, 'instant'));
	await page.waitForFunction(() => document.querySelector('.slider-viewport').scrollLeft === 0);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.getByRole('button', { name: 'Previous', exact: true }).click();
	await page.waitForFunction(() => document.querySelector('.slider-viewport').scrollLeft === 0);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.evaluate(() => {
		window.harness.setItems(['a', 'a']);
		window.harness.setPerView(1);
	});
	await page.waitForFunction(() => window.harness.getSlider().pageCount === 2);
	assert.equal(await page.locator('.slider-slide').count(), 2, 'duplicate primitive slides render');
	await page.evaluate(() => {
		window.harness.setItems(['wide']);
		window.harness.setPerView(0.5);
	});
	await page.waitForFunction(() => window.harness.getSlider().pageCount === 2 && document.querySelectorAll('.slider-slide').length === 1);
	await page.getByRole('button', { name: 'Next', exact: true }).click();
	await page.waitForFunction(() => {
		const node = document.querySelector('.slider-viewport');
		return node.scrollLeft > 0 && Math.abs(node.scrollLeft - (node.scrollWidth - node.clientWidth)) < 1;
	});
	await page.getByRole('button', { name: 'Previous', exact: true }).click();
	await page.waitForFunction(() => document.querySelector('.slider-viewport').scrollLeft === 0);
	await page.evaluate(() => window.harness.setItems(['one', 'two', 'three', 'four', 'five']));
	await page.evaluate(() => window.harness.setPerView(2));
	await page.waitForFunction(() => window.harness.getSlider().pageCount === 4);
	await page.evaluate(() => window.harness.setItems(['one', 'two']));
	await page.waitForFunction(() => window.harness.getSlider().pageCount === 1);
	await page.evaluate(() => window.harness.setItems([]));
	await page.waitForFunction(() => window.harness.getSlider().pageCount === 0);

	const alignmentResults = await page.evaluate(async () => {
		const { createZoomable } = await import('/src/lib/utils/zoomable/index.ts');
		const results = [];
		for (const align of ['center', 'top', 'bottom']) {
			const viewport = document.createElement('div');
			viewport.style.cssText = 'width:300px;height:400px;display:flex;align-items:flex-end;justify-content:center;border:2px solid black';
			const content = document.createElement('div');
			content.style.cssText = 'width:200px;height:100px;flex-shrink:0';
			viewport.append(content);
			document.body.append(viewport);
			const zoom = createZoomable({ align, duration: 0 });
			const cleanup = zoom.attachment(viewport);
			const position = () => {
				const parent = viewport.getBoundingClientRect(),
					child = content.getBoundingClientRect();
				return [child.left - parent.left - viewport.clientLeft, child.top - parent.top - viewport.clientTop];
			};
			const initial = position();
			zoom.zoomTo(5);
			zoom.reset();
			const reset = position();
			content.style.height = '200px';
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
			const resized = position();
			cleanup();
			results.push({ align, initial, reset, resized, positionRestored: viewport.style.position === '' });
			viewport.remove();
		}
		return results;
	});
	for (const result of alignmentResults) {
		const y = result.align === 'top' ? 0 : result.align === 'bottom' ? 300 : 150;
		assert.deepEqual(result.initial, [50, y], `flex-end content aligned ${result.align}`);
		assert.deepEqual(result.reset, [50, y]);
		assert.deepEqual(result.resized, [50, result.align === 'top' ? 0 : result.align === 'bottom' ? 200 : 100]);
		assert.equal(result.positionRestored, true);
	}

	await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
	assert.equal(await page.evaluate(() => window.harness.getZoom().getTransform().scale), 1.25);
	const zoomRect = await page.locator('.zoom').boundingBox();
	await page.mouse.move(zoomRect.x + 150, zoomRect.y + 100);
	await page.mouse.wheel(0, -200);
	await page.waitForFunction(() => window.harness.getZoom().getTransform().scale > 1.25);
	const before = await page.evaluate(() => window.harness.getZoom().getTransform());
	await page.mouse.down();
	await page.mouse.move(zoomRect.x + 120, zoomRect.y + 80, { steps: 5 });
	await page.mouse.up();
	const after = await page.evaluate(() => window.harness.getZoom().getTransform());
	assert.ok(after.x < before.x && after.y < before.y, 'real mouse pan');
	await page.getByRole('button', { name: 'Reset zoom', exact: true }).click();
	assert.equal(await page.evaluate(() => window.harness.getZoom().getTransform().scale), 1);

	await page.locator('.zoom').scrollIntoViewIfNeeded();
	const touchRect = await page.locator('.zoom').boundingBox();
	const cdp = await context.newCDPSession(page);
	const touch = (x, id) => ({ x: touchRect.x + x, y: touchRect.y + 100, id });
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(100, 1), touch(200, 2)] });
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(50, 1), touch(250, 2)] });
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	assert.ok((await page.evaluate(() => window.harness.getZoom().getTransform().scale)) > 1.5, 'native two-finger pinch');

	await page.waitForFunction(() => document.querySelector('.cropper-image').complete);
	const cropImage = await page.locator('.cropper-image').boundingBox();
	const cropFrame = await page.locator('.cropper-frame').boundingBox();
	const selection = await page.locator('.cropper-selection').boundingBox();
	assert.ok(cropFrame.height > cropImage.height, 'fixture reproduces original min-height bug');
	assert.ok(selection.y + selection.height <= cropImage.y + cropImage.height + 1, 'selection remains inside image');
	assert.ok(Math.abs(selection.width - selection.height) < 1, 'square crop is square in screen pixels');
	const exportSize = await page.evaluate(() => {
		const canvas = window.harness.getCropper().toCanvas();
		return [canvas.width, canvas.height];
	});
	assert.equal(exportSize[0], exportSize[1]);
	assert.ok(exportSize[0] > 0);
	await page.locator('.cropper-selection').focus();
	const oldCrop = await page.evaluate(() => window.harness.getCropper().getCrop());
	await page.keyboard.press('ArrowRight');
	assert.ok((await page.evaluate(() => window.harness.getCropper().getCrop().x)) > oldCrop.x, 'keyboard crop move');
	await page.evaluate(() => {
		const crop = window.harness.getCropper().getCrop();
		crop.width = 99;
	});
	assert.notEqual(await page.evaluate(() => window.harness.getCropper().getCrop().width), 99, 'API returns defensive copy');
	await page.evaluate(() => window.harness.setSource('/not-loaded.png'));
	await page.waitForFunction(() => {
		try {
			window.harness.getCropper().toCanvas();
			return false;
		} catch {
			return true;
		}
	});
	await page.evaluate(() => {
		window.revokedUrls = [];
		const revoke = URL.revokeObjectURL.bind(URL);
		URL.revokeObjectURL = (url) => {
			window.revokedUrls.push(url);
			revoke(url);
		};
		window.harness.setSource(
			new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'], {
				type: 'image/svg+xml'
			})
		);
	});
	await page.waitForFunction(() => {
		try {
			return window.harness.getCropper().toCanvas().width === 80;
		} catch {
			return false;
		}
	});
	const firstBlob = await page.locator('.cropper-image').getAttribute('src');
	await page.evaluate(() =>
		window.harness.setSource(
			new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="red"/></svg>'], {
				type: 'image/svg+xml'
			})
		)
	);
	await page.waitForFunction(() => {
		try {
			return window.harness.getCropper().toCanvas().width === 160;
		} catch {
			return false;
		}
	});
	const secondBlob = await page.locator('.cropper-image').getAttribute('src');
	assert.deepEqual(await page.evaluate(() => window.revokedUrls), [firstBlob], 'replaced Blob URL revoked exactly once');
	const beforeOutside = Number(await page.locator('#outside-count').textContent());
	await page.locator('.outside span').click();
	assert.equal(Number(await page.locator('#outside-count').textContent()), beforeOutside);
	await page.locator('#outside-button').click();
	assert.equal(Number(await page.locator('#outside-count').textContent()), beforeOutside + 1);
	await page.evaluate(() => window.harness.toggleOutside());
	await page.locator('#outside-button').click();
	assert.equal(Number(await page.locator('#outside-count').textContent()), beforeOutside + 1);
	await page.locator('.zoom').scrollIntoViewIfNeeded();
	const cleanupRect = await page.locator('.zoom').boundingBox();
	await page.mouse.move(cleanupRect.x + 100, cleanupRect.y + 100);
	await page.mouse.down();
	assert.equal(await page.evaluate(() => document.querySelector('.zoom').hasPointerCapture(1)), true, 'mouse pointer captured');
	await page.evaluate(() => {
		window.detachedViewport = document.querySelector('.zoom');
	});
	await page.evaluate(() => window.harness.disposeWidgets());
	await page.waitForFunction(() => !document.querySelector('.zoom'));
	await page.mouse.up();
	assert.equal(await page.evaluate(() => window.detachedViewport.hasPointerCapture(1)), false, 'capture released on unmount mid-gesture');
	assert.deepEqual(await page.evaluate(() => window.revokedUrls), [firstBlob, secondBlob], 'unmounted Blob URL revoked exactly once');
	assert.equal(
		await page.locator('head style').evaluateAll((nodes) => nodes.some((node) => node.textContent.includes('--slider-view:'))),
		false,
		'SSR instance stylesheet removed on unmount'
	);
	await page.evaluate(() => {
		window.harness.getZoom().zoomIn();
		window.harness.getSlider().slideNext();
	});
	assert.deepEqual(errors, [], 'no browser or hydration errors');
	console.log(
		'PASS: Chromium SSR CSS, hydration, optional package CSS import, duplicate slides, scaled ancestor, wide-slide terminal stop, rapid smooth navigation/reversal, responsive updates, keyboard isolation, wheel, mouse pan, native pinch, Cropper export/source changes, Blob cleanup, clickOutside reactivity, capture and stylesheet cleanup'
	);
} finally {
	await browser?.close();
	await new Promise((resolve) => server.close(resolve));
	await vite.close();
}
