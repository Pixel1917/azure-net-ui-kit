export type TokenSettings = { pattern?: RegExp; escape?: boolean; transform?: (v: string) => string };
export type Tokens = Record<string, TokenSettings>;
export type MaskValue = string | string[];
export type MaskedOptions = {
	mask?: MaskValue;
	tokens?: Tokens;
	emitInitialInput?: boolean;
};

type ResolvedMaskConfig = {
	mask?: MaskValue;
	tokens: Tokens;
	emitInitialInput: boolean;
};

export class Mask {
	static tokens: Tokens = {
		X: { pattern: /[0-9a-zA-Z]/ },
		S: { pattern: /[a-zA-Z]/ },
		A: { pattern: /[a-zA-Z]/, transform: (v: string) => v.toUpperCase() },
		a: { pattern: /[a-zA-Z]/, transform: (v: string) => v.toLowerCase() },
		'#': { pattern: /\d/ },
		'!': { escape: true }
	};

	private static matchesPattern(pattern: RegExp, value: string): boolean {
		pattern.lastIndex = 0;
		return pattern.test(value);
	}

	static dynamicMask(maskIt: typeof Mask.maskIt, masks: string[], tokens: Tokens) {
		const sortedMasks = [...masks].sort((a, b) => a.length - b.length);
		return function (value: string, masked = true) {
			let i = 0;
			while (i < sortedMasks.length) {
				const currentMask = sortedMasks[i];
				i++;
				const nextMask = sortedMasks[i];
				if (!(nextMask && maskIt(value, nextMask, true, tokens).length > currentMask.length)) {
					return maskIt(value, currentMask, masked, tokens);
				}
			}
			return '';
		};
	}

	static maskIt(value: string, mask: string | undefined = undefined, masked = true, tokens: Tokens) {
		value = value || '';
		mask = mask || '';
		let iMask = 0;
		let iValue = 0;
		let output = '';
		while (iMask < mask.length && iValue < value.length) {
			let cMask = mask[iMask];
			const masker = tokens[cMask as keyof Tokens];
			const cValue = value[iValue];
			if (masker && !masker.escape) {
				if (!masker.pattern || this.matchesPattern(masker.pattern, cValue)) {
					output += masker.transform ? masker.transform(cValue) : cValue;
					iMask++;
				}
				iValue++;
			} else {
				if (masker && masker.escape) {
					iMask++;
					cMask = mask[iMask];
				}
				if (masked) output += cMask;
				if (cValue === cMask) iValue++;
				iMask++;
			}
		}

		let restOutput = '';
		while (iMask < mask.length && masked) {
			const cMask = mask[iMask];
			if (tokens[cMask]) {
				restOutput = '';
				break;
			}
			restOutput += cMask;
			iMask++;
		}

		return output + restOutput;
	}

	static masker(value: string, mask: MaskValue | undefined = undefined, masked = true, tokens: Tokens) {
		return Array.isArray(mask) ? this.dynamicMask(Mask.maskIt.bind(this), mask, tokens)(value, masked) : this.maskIt(value, mask, masked, tokens);
	}
}

const resolveInput = (node: HTMLInputElement): HTMLInputElement => {
	if (node.tagName.toUpperCase() === 'INPUT') return node;

	const inputNodes = node.getElementsByTagName('input');
	if (inputNodes.length !== 1) {
		throw new Error(`mask requires 1 input, found ${inputNodes.length}`);
	}
	return inputNodes[0];
};

const createConfig = (maskOrOptions?: MaskValue | MaskedOptions, legacyTokens?: Tokens): ResolvedMaskConfig => {
	if (typeof maskOrOptions === 'object' && maskOrOptions !== null && !Array.isArray(maskOrOptions)) {
		return {
			mask: maskOrOptions.mask,
			tokens: maskOrOptions.tokens ? { ...Mask.tokens, ...maskOrOptions.tokens } : Mask.tokens,
			emitInitialInput: maskOrOptions.emitInitialInput ?? false
		};
	}

	return {
		mask: maskOrOptions,
		tokens: legacyTokens ? { ...Mask.tokens, ...legacyTokens } : Mask.tokens,
		emitInitialInput: false
	};
};

const recalculateCaret = (oldValue: string, nextValue: string, caret: number): number => {
	if (caret <= 0 || oldValue === nextValue) return Math.min(caret, nextValue.length);

	const anchor = oldValue.charAt(caret - 1);
	if (!anchor) return Math.min(caret, nextValue.length);

	let nextCaret = caret;
	while (nextCaret < nextValue.length && nextValue.charAt(nextCaret - 1) !== anchor) {
		nextCaret++;
	}
	return Math.min(nextCaret, nextValue.length);
};

const applyMaskValue = (input: HTMLInputElement, config: ResolvedMaskConfig): boolean => {
	if (!config.mask) return false;
	const previous = input.value;
	const next = Mask.masker(previous, config.mask, true, config.tokens);
	if (previous === next) return false;

	const selectionEnd = input.selectionEnd ?? previous.length;
	input.value = next;

	if (document.activeElement === input) {
		const caret = recalculateCaret(previous, next, selectionEnd);
		input.setSelectionRange(caret, caret);
	}

	return true;
};

const maskEventType = 'input';

type MaskedActionResult = {
	update: (next?: MaskValue | MaskedOptions, tokens?: Tokens) => void;
	destroy: () => void;
};

export const masked = (node: HTMLInputElement, maskOrOptions?: MaskValue | MaskedOptions, tokens?: Tokens): MaskedActionResult => {
	const input = resolveInput(node);
	let config = createConfig(maskOrOptions, tokens);

	const handleInput = () => {
		applyMaskValue(input, config);
	};

	input.addEventListener(maskEventType, handleInput);

	const changedOnInit = applyMaskValue(input, config);
	if (changedOnInit && config.emitInitialInput) {
		input.dispatchEvent(new Event(maskEventType, { bubbles: true }));
	}

	return {
		update(nextMaskOrOptions, nextTokens) {
			config = createConfig(nextMaskOrOptions, nextTokens);
			const changed = applyMaskValue(input, config);
			if (changed && config.emitInitialInput) {
				input.dispatchEvent(new Event(maskEventType, { bubbles: true }));
			}
		},
		destroy() {
			input.removeEventListener(maskEventType, handleInput);
		}
	};
};
