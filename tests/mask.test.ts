import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Mask, masked, type Tokens } from '../src/lib/utils/mask/Mask.js';

describe('Mask', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	it('masker applies default transforms and shape', () => {
		expect(Mask.masker('ab123', 'AA-###', true, Mask.tokens)).toBe('AB-123');
	});

	it('supports regex tokens with global flag reliably', () => {
		const tokens: Tokens = {
			...Mask.tokens,
			N: { pattern: /\d/g }
		};

		expect(Mask.masker('1234', 'NNNN', true, tokens)).toBe('1234');
	});

	it('does not mutate source masks in dynamic mode', () => {
		const source = ['###-###', '##-##'];
		const original = [...source];

		Mask.masker('123456', source, true, Mask.tokens);

		expect(source).toEqual(original);
	});
});

describe('masked action', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('normalizes input value and does not trigger duplicate input notifications', () => {
		const input = document.createElement('input');
		input.value = '1234567';
		document.body.appendChild(input);

		const seenValues: string[] = [];
		input.addEventListener('input', () => {
			seenValues.push(input.value);
		});

		const action = masked(input, '###-###');

		expect(input.value).toBe('123-456');

		input.value = '9999999';
		input.dispatchEvent(new Event('input', { bubbles: true }));

		expect(input.value).toBe('999-999');
		expect(seenValues).toEqual(['999-999']);

		action.destroy();
	});

	it('supports update and destroy lifecycle', () => {
		const input = document.createElement('input');
		input.value = '123456';
		document.body.appendChild(input);

		const action = masked(input, '###-###');
		expect(input.value).toBe('123-456');

		action.update('##-##');
		expect(input.value).toBe('12-34');

		action.destroy();
		input.value = '87654';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		expect(input.value).toBe('87654');
	});

	it('throws when wrapper contains no single input', () => {
		const wrapper = document.createElement('div');
		expect(() => masked(wrapper as unknown as HTMLInputElement, '###')).toThrow('mask requires 1 input');
	});
});
