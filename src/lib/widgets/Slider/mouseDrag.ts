/** Mouse dragging complements native touch scrolling; it never captures touch pointers. */
export function attachMouseDrag(node: HTMLElement, positions: () => readonly number[], settle: (index: number) => void) {
	const view = node.ownerDocument.defaultView!;
	let gesture: { id: number; x: number; left: number; dragging: boolean } | undefined;
	let suppressClick = false;
	let saved: [string, string, string] | undefined;
	let frame = 0;
	let destination: number | undefined;
	function stopWatching() {
		if (frame) view.cancelAnimationFrame(frame);
		frame = 0;
		destination = undefined;
	}
	function restore() {
		stopWatching();
		if (saved) [node.style.scrollSnapType, node.style.userSelect, node.style.cursor] = saved;
		saved = undefined;
	}
	function watchSettling(target: number) {
		stopWatching();
		destination = target;
		let previous = node.scrollLeft;
		let stableFrames = 0;
		const started = view.performance.now();
		const check = () => {
			frame = 0;
			stableFrames = Math.abs(node.scrollLeft - previous) < 0.1 ? stableFrames + 1 : 0;
			previous = node.scrollLeft;
			// Also release the override if another navigation interrupts the target.
			if (Math.abs(node.scrollLeft - target) < 1 || stableFrames >= 12 || view.performance.now() - started > 2000) {
				restore();
				return;
			}
			frame = view.requestAnimationFrame(check);
		};
		frame = view.requestAnimationFrame(check);
	}
	function scrollend() {
		// Ignore queued scrollend events from the last direct drag movement.
		if (destination !== undefined && Math.abs(node.scrollLeft - destination) < 1) restore();
	}
	function finish(snap: boolean) {
		const current = gesture;
		if (!current) return;
		gesture = undefined;
		const left = node.scrollLeft;
		if (node.hasPointerCapture?.(current.id)) node.releasePointerCapture(current.id);
		if (!current.dragging || !snap) {
			restore();
			return;
		}
		const stops = positions();
		if (!stops.length) {
			restore();
			return;
		}
		const nearest = (value: number) =>
			stops.reduce((best, position, index) => (Math.abs(position - value) < Math.abs(stops[best] - value) ? index : best), 0);
		let index = nearest(left);
		const start = nearest(current.left);
		const distance = left - current.left;
		if (index === start && Math.abs(distance) > Math.min(40, node.clientWidth * 0.15)) index += Math.sign(distance);
		index = Math.max(0, Math.min(index, stops.length - 1));
		if (saved) [node.style.userSelect, node.style.cursor] = [saved[1], saved[2]];
		// Keep snap disabled until smooth scrolling arrives, otherwise CSS re-snaps first.
		watchSettling(stops[index]);
		try {
			settle(index);
		} catch (error) {
			restore();
			throw error;
		}
	}
	function down(event: PointerEvent) {
		suppressClick = false;
		if (event.pointerType !== 'mouse') {
			restore();
			return;
		}
		if (event.button !== 0 || gesture || node.scrollWidth <= node.clientWidth) return;
		if ((event.target as Element).closest('button,input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
		stopWatching();
		node.scrollTo({ left: node.scrollLeft, behavior: 'instant' });
		gesture = { id: event.pointerId, x: event.clientX, left: node.scrollLeft, dragging: false };
	}
	function move(event: PointerEvent) {
		if (!gesture || gesture.id !== event.pointerId) return;
		if (!(event.buttons & 1)) {
			finish(true);
			return;
		}
		const delta = event.clientX - gesture.x;
		if (!gesture.dragging) {
			if (Math.abs(delta) < 5) return;
			gesture.dragging = true;
			suppressClick = true;
			saved ??= [node.style.scrollSnapType, node.style.userSelect, node.style.cursor];
			node.style.scrollSnapType = 'none';
			node.style.userSelect = 'none';
			node.style.cursor = 'grabbing';
			node.setPointerCapture?.(event.pointerId);
		}
		event.preventDefault();
		node.scrollTo({ left: gesture.left - delta, behavior: 'instant' });
	}
	function up(event: PointerEvent) {
		if (gesture?.id === event.pointerId) finish(true);
	}
	function cancel() {
		finish(false);
		restore();
	}
	function click(event: MouseEvent) {
		if (!suppressClick || event.detail === 0) return;
		suppressClick = false;
		event.preventDefault();
		event.stopImmediatePropagation();
	}
	function dragstart(event: DragEvent) {
		if (gesture) event.preventDefault();
	}
	node.addEventListener('pointerdown', down);
	node.addEventListener('click', click, true);
	node.addEventListener('dragstart', dragstart);
	node.addEventListener('lostpointercapture', up);
	node.addEventListener('scrollend', scrollend);
	node.addEventListener('wheel', cancel, { passive: true });
	view.addEventListener('pointermove', move, { passive: false });
	view.addEventListener('pointerup', up);
	view.addEventListener('pointercancel', up);
	view.addEventListener('blur', cancel);
	return () => {
		cancel();
		node.removeEventListener('pointerdown', down);
		node.removeEventListener('click', click, true);
		node.removeEventListener('dragstart', dragstart);
		node.removeEventListener('lostpointercapture', up);
		node.removeEventListener('scrollend', scrollend);
		node.removeEventListener('wheel', cancel);
		view.removeEventListener('pointermove', move);
		view.removeEventListener('pointerup', up);
		view.removeEventListener('pointercancel', up);
		view.removeEventListener('blur', cancel);
	};
}
