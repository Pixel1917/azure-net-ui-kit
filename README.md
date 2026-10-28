# Svelte library

Everything you need to build a Svelte library, powered by [`sv`](https://npmjs.com/package/sv).

Read more about creating a library [in the docs](https://svelte.dev/docs/kit/packaging).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.15.1 create --template library --types ts --add prettier eslint --install pnpm azure-net-ui-kit
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Everything inside `src/lib` is part of your library, everything inside `src/routes` can be used as a showcase or preview app.

## Building

To build your library:

```sh
npm pack
```

To create a production version of your showcase app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Publishing

Go into the `package.json` and give your package the desired name through the `"name"` option. Also consider adding a `"license"` field and point it to a `LICENSE` file which you can create from a template (one popular option is the [MIT license](https://opensource.org/license/mit/)).

To publish your library to [npm](https://www.npmjs.com):

```sh
npm publish
```

## Modal components

`modalManager.create` prepares a handle; its `show()` opens the modal.
`modalManager.show` opens immediately. Both infer props from a component,
a `{ default: Component }` module, or a promise resolving either form.
`create` is always synchronous. Only `show` becomes asynchronous for a promise input or a `loader`.
Use `loader: () => import(...)` to start loading at show time (plain `import(...)` starts immediately).
`component` and `loader` are mutually exclusive and both infer props:

```ts
import { modalManager } from '@azure-net/ui-kit/widgets';
import Dialog from './Dialog.svelte';

const prepared = modalManager.create({ component: Dialog, props: { title: 'Hello' } });
prepared.show();

const lazy = modalManager.create({
	loader: () => import('./Dialog.svelte'),
	props: { title: 'Hello' }
});
await lazy.show();

await modalManager.show({ component: import('./Dialog.svelte'), props: { title: 'Hello' } });
```

Import failures reject the returned promise without opening a modal. A pending
`show` cannot open in a container that was unmounted or replaced during loading.
Opening requires a mounted `ModalContainer`; preparing a handle does not.

## useAnimate

```svelte
<script lang="ts">
	import { useAnimate } from '@azure-net/ui-kit';
</script>

<section use:useAnimate={{ classes: ['visible', 'fade-in'], delay: 100, once: true }}>Content</section>
```

The action adds classes when the element intersects its observer root. Supply your
own CSS animations. Options: `classes`, `delay` (milliseconds), `root`, `rootMargin`,
`threshold`, `once` (default `true`), and `enabled` (default `true`). With `once: false`,
classes are removed on exit and added on re-entry. Delay is cancelled on exit.
Updates replace options and cancel stale work. After a one-time reveal, updated
classes apply immediately; use `once: false` to resume observation.
Disabling removes action-owned classes. Existing classes are preserved during cleanup.
Without IntersectionObserver, classes are applied immediately. SSR does nothing.

### Svelte attachments

Use `attachAnimation` with Svelte 5 `@attach`:

```svelte
<a {@attach attachAnimation({ classes: 'reveal-visible', delay: 200 * index })} class="reveal-zoom-in" href="/catalog">Project</a>
```

Import `attachAnimation` from `@azure-net/ui-kit`. It accepts the same options as
`useAnimate`. Reactive option changes recreate the attachment, disconnecting the
previous observer, cancelling its timer and removing its owned classes first.
Unmounting performs the same cleanup. `once` applies to each attachment lifecycle;
changing options starts a new lifecycle. Existing `use:useAnimate` remains available.

## Slider (Svelte 5.29+)

`Slider` is exported from `@azure-net/ui-kit/widgets`. It uses native horizontal
scroll snap, not Swiper. Naming is inspired by the [official Swiper API](https://swiperjs.com/swiper-api),
particularly `slidesPerView`, `spaceBetween`, numeric minimum-width `breakpoints`,
and `slideNext` / `slidePrev` / `slideTo`. It is not a drop-in Swiper implementation.

```svelte
<script lang="ts">
	import { Slider, type SliderApi } from '@azure-net/ui-kit/widgets';
	import '@azure-net/ui-kit/slider.css'; // Optional decorations; use with styled.
	const photos = [
		{ id: 'a', src: '/a.jpg', alt: 'Garden' },
		{ id: 'b', src: '/b.jpg', alt: 'Courtyard' },
		{ id: 'c', src: '/c.jpg', alt: 'House' }
	];
	let slider = $state<SliderApi>();
</script>

<Slider
	items={photos}
	getKey={(photo) => photo.id}
	slidesPerView={1}
	spaceBetween={16}
	breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3, spaceBetween: 24 } }}
	onReady={(api) => {
		slider = api;
	}}
	label="Project photographs"
	showNavigation
	showPagination
	styled
>
	{#snippet slide(photo, index)}
		<img src={photo.src} alt={photo.alt} style="display:block;width:100%" />
		<p>{index + 1}. {photo.alt}</p>
	{/snippet}
</Slider>
<button type="button" disabled={!slider || slider.isBeginning} onclick={() => slider?.slidePrev()}>Previous photo</button>
```

For your own navigation and pagination, supply snippets instead of the default
controls. Snippets receive the same stable API object as `onReady`:

```svelte
<Slider items={photos} getKey={(photo) => photo.id} slidesPerView={1}>
	{#snippet slide(photo)}<img src={photo.src} alt={photo.alt} />{/snippet}
	{#snippet navigation(api)}
		<button type="button" disabled={api.isBeginning} onclick={api.slidePrev}>Back</button>
		<button type="button" disabled={api.isEnd} onclick={api.slideNext}>Forward</button>
	{/snippet}
	{#snippet pagination(api)}
		{#each Array.from({ length: api.pageCount }, (_, i) => i) as page (page)}
			<button type="button" aria-current={api.activeIndex === page ? 'true' : undefined} onclick={() => api.slideTo(page)}>{page + 1}</button>
		{/each}
	{/snippet}
</Slider>
```

- `items` and `slide` are required. Without `getKey`, slides use positional reuse
  (index semantics), so duplicate primitives and repeated object references work.
  Provide `getKey` with unique identifiers to preserve item identity during reorder.
- `slidesPerView: 'auto'` uses CSS/intrinsic slide widths. Different widths are
  supported; ResizeObserver tracks size changes after image/font loading.
  Numeric/auto modes can be mixed in breakpoints.
- Layout defaults: `slidesPerView: 1`, `spaceBetween: 0` (pixels). Fractional
  positive slide counts are supported. Invalid counts/gaps fall back to 1/0.
- Breakpoints are viewport-width CSS media queries, sorted numerically. Each
  override merges with the base props, not with the preceding breakpoint.
  Responsive CSS and slide content are emitted during SSR, before hydration.
- `slideTo(index, behavior = 'smooth')` clamps to a valid **scroll position**;
  `slideNext()` / `slidePrev()` move one position. End positions that would scroll
  past the last slide are deduplicated, so `pageCount` can be less than item count.
  `activeIndex`, `pageCount`, `isBeginning`, and `isEnd` are reactive getters.
  During smooth navigation the boundary flags follow the requested target, allowing
  rapid reversal before the first animation finishes; `activeIndex` follows scrolling.
- `onReady(api)` runs after attachment (and again after layout-prop changes).
  `onChange(index)` follows actual scrolling, not just button requests.
  Geometry-dependent pagination starts empty during SSR and is measured on mount.
- The scrollbar is always hidden by structural CSS. Mouse dragging works after
  hydration and snaps on release. Links remain clickable, but a drag suppresses the
  subsequent click; inputs and buttons keep their normal behavior. Native
  touch/trackpad scrolling works without JavaScript. A focused viewport
  supports Left/Right/Home/End without intercepting keys in slide inputs.
  Reduced-motion preferences disable smooth programmatic scrolling.
- Only structural layout ships in the component. Import `@azure-net/ui-kit/slider.css`
  separately and set `styled` to add basic styles to
  built-in controls; `showNavigation` and `showPagination` default to false.
  `navigation`/`pagination` snippets take precedence. Use `className` and the
  `.azure-net-ui-slider-*` classes for customization. The root class is
  `azure-net-ui-slider`; the old generic `slider` classes are no longer emitted.
  Custom snippets own their styles.
- Scope: horizontal LTR, equal-width numeric mode or variable-width auto mode. No loop, autoplay, virtual slides,
  vertical/RTL mode, or Swiper dependency. Browser-native
  scroll timing is used. The generated inline stylesheet must be permitted by
  your CSP (for example, an appropriate style hash policy).

### Auto-width example

```svelte
<Slider items={photos} slidesPerView="auto" spaceBetween={16}>
	{#snippet slide(photo)}
		<article style="width: 280px">
			<img src={photo.src} alt={photo.alt} style="display:block;width:100%" />
		</article>
	{/snippet}
</Slider>
```

Widths apply in SSR too. Set a width on the snippet content or on
`.azure-net-ui-slider-slide`. Percentage-only child widths need a definite parent
width; prefer px, rem, or clamp() with viewport units for auto-width cards.
Use `breakpoints={{ 768: { slidesPerView: 3 }, 1200: { slidesPerView: 'auto' } }}`
to switch modes. For numeric mode, ensure fixed-width content fits its slide
(for example, add `max-width: 100%` to the card).

## Zoomable Attachment (Svelte 5.29+)

Attach to a viewport with one **untransformed HTML child**.
The viewport clips the child; only the child is transformed. Controls should be
outside that child. Set explicit viewport dimensions. Flex/grid alignment and
layout offsets are compensated; do not apply separate transforms to the child.
The first child is the zoom target: align positions its box, not an image inside
a full-height wrapper.

```svelte
<script lang="ts">
	import { createZoomable } from '@azure-net/ui-kit';
	let { src, alt }: { src: string; alt: string } = $props();
	const zoom = createZoomable({ minZoom: 1, maxZoom: 5, step: 1.25, duration: 160, align: 'center' });
</script>

{#key src}
	<div class="viewport" {@attach zoom.attachment}>
		<div><img {src} {alt} draggable="false" style="display:block;width:100%" /></div>
	</div>
{/key}
<button type="button" onclick={zoom.zoomIn}>Zoom in</button>
<button type="button" onclick={zoom.zoomOut}>Zoom out</button>
<button type="button" onclick={zoom.reset}>Reset</button>

<style>
	.viewport {
		width: 100%;
		height: 400px;
	}
</style>
```

For gesture-only use: `import { zoomable } from '@azure-net/ui-kit'`, then
`<div {@attach zoomable({ maxZoom: 4 })}><div>Content</div></div>`.

`createZoomable(options)` is safe during SSR and returns a stable controller:
`attachment`, `zoomIn()`, `zoomOut()`, `zoomTo(scale, point?)`, `panBy(x, y)`,
`reset()`, `getTransform()`. A point is in viewport-local CSS pixels; omitted
points use its center. `getTransform()` returns a defensive `{ x, y, scale }`
copy of the target transform (not the in-flight animation frame). Use
`onChange(transform)` to synchronize your own UI state. Methods do nothing before
mount and after cleanup; remounting resets the transform. One controller can be
attached to only one viewport at a time.

Options: `minZoom` (1), `maxZoom` (5), multiplicative `step` (1.25), `wheel`
(true), `wheelSpeed` (0.002), `duration` (160 milliseconds, 0 for immediate),
`align` ('center'), `bounds` (true), and `onChange`. `align` accepts 'center',
'top', or 'bottom' for vertical placement; horizontal placement is centered.
Mount and reset apply alignment even with bounds disabled. With bounds enabled,
small content stays aligned; larger content can be panned within its bounds.
ResizeObserver recalculates after image loading or
resizing. Without ResizeObserver, window resizing still recalculates bounds.
Use stable options for a controller; recreate it to change configuration. Reactive
options passed to `zoomable(...)` recreate that attachment and reset its transform.

Mouse/touch/pen panning uses pointer capture. Two-finger pinch keeps the gesture's
focal point and allows translation. Wheel deltas support pixel/line/page modes;
wheel scrolling is not prevented when already at a zoom limit. Button/wheel zoom
animates; active pointer gestures follow immediately. Reduced motion is honored.
Cleanup cancels animation frames, releases captures, disconnects observers,
removes all listeners, and restores the inline styles owned by the attachment.

Limits: dedicated HTML viewport only, no SVG controller, inertia, double-tap zoom,
or support for transformed ancestors. The first child must exist when attached;
key the viewport when replacing content. Touch gestures consume touch scrolling
inside the viewport. This is not a general-purpose replacement for every panzoom
feature, and introduces no runtime dependency.

## clickOutside Attachment

The existing `use:onClickOutside` action and `outside` custom event remain available.
The attachment adds a direct callback using the same event handling:

```svelte
<script lang="ts">
	import { clickOutside } from '@azure-net/ui-kit';
	let open = $state(false);
	let trigger = $state<HTMLButtonElement>();
</script>

<button
	bind:this={trigger}
	type="button"
	onclick={() => {
		open = !open;
	}}>Toggle</button
>
{#if open}
	<div
		{@attach clickOutside({
			initiator: trigger,
			onOutside: () => {
				open = false;
			}
		})}
	>
		Panel contents
	</div>
{/if}
```

Options: `initiator`, `enabled` (true), `event` ('click'; also 'pointerdown',
'mousedown', 'touchstart'), `capture` (true), `passive` (true), `onOutside(detail)`.
The callback receives `{ node, initiator, originalEvent }`. Inside clicks and
initiator descendants are ignored, including composed shadow-DOM paths. Listeners
use the element's owner document, including iframe documents. Reactive attachment
options replace listeners and unmount removes them. The action's `update` also
rebinds when `passive` changes. With `passive: false`, the callback may prevent the
original event; defaults are intentionally passive. No global DOM is read on import.

## Cropper

```svelte
<script lang="ts">
	import { Cropper, type CropperApi } from '@azure-net/ui-kit/widgets';
	let api = $state<CropperApi>();
	let readyToExport = $state(false);
</script>

<Cropper
	src="/photo.jpg"
	aspectRatio={1}
	minWidth={8}
	minHeight={8}
	onReady={(value) => {
		api = value;
	}}
/>
<button
	type="button"
	onclick={async () => {
		try {
			const blob = await api?.toBlob({ type: 'image/png', rounded: false });
			readyToExport = !!blob;
			// Upload or otherwise consume the blob here.
		} catch {
			readyToExport = false; // Not loaded yet, failed image, or a canvas security error.
		}
	}}>Export crop</button
>
<p>{readyToExport ? 'Exported' : 'Choose a crop and export when the image is loaded'}</p>
```

Coordinates and minimum sizes are percentages of the **image**, not its padded or
minimum-height frame. `aspectRatio` is the width/height ratio in displayed pixels.
When a fixed ratio and minimum size cannot fit together, image bounds and ratio
win. `initialCrop` is normalized to these constraints. Changing configuration
(`initialCrop`, ratio, minimums) resets the selection; ordinary responsive resizing
does not. Arrow keys move the focused selection or resize a focused handle; Shift
uses a larger step. Disabled controls cannot begin gestures.

`onReady` supplies the API on mount, not an image-load guarantee. Export throws
(or `toBlob` rejects) until the current source is loaded. `getCrop()` and
`onChange` values are copies. `reset()`, `toCanvas()`, `toBlob()`, and `toDataUrl()`
remain available. Source changes cancel gestures and invalidate old exports;
Blob URLs are revoked on replacement/unmount. Remote canvas export requires
`crossOrigin="anonymous"` (or appropriate credentials) **and** matching server CORS
headers. Canvas security errors propagate. Export rounds to natural image pixels,
so very small crops have a one-pixel minimum. Existing visual styles are retained.

## Regression Tests

Run from this package, using installed tools without modifying dependencies:

```sh
npm run check
./node_modules/.bin/vitest run
npm run prepack
```

The standalone browser harness uses Playwright if separately available:

```sh
node tests/browser/run.mjs
# Or point to an existing runtime and browser without adding dependencies:
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
PLAYWRIGHT_EXECUTABLE=/absolute/path/to/chromium \
node tests/browser/run.mjs
```

It runs a temporary localhost server, checks SSR CSS with JavaScript disabled at
mobile/desktop widths, hydrates in Chromium, then exercises navigation, reactive
layout/items, keyboard isolation, wheel, real mouse pan, CDP two-finger pinch,
Cropper geometry/export/keyboard, clickOutside updates, and unmount. Unit tests
cover bounds, ratio math, invalid input, pointer isolation, and cleanup. Chromium
coverage does not establish Safari/Firefox or physical-device compatibility.
