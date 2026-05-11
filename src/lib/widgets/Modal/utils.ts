type CssValue = string | number | null | undefined;

export interface ModalInlineStyles {
	position?: CssValue;
	top?: CssValue;
	right?: CssValue;
	bottom?: CssValue;
	left?: CssValue;
	zIndex?: CssValue;

	display?: CssValue;
	width?: CssValue;
	height?: CssValue;
	minWidth?: CssValue;
	minHeight?: CssValue;
	maxWidth?: CssValue;
	maxHeight?: CssValue;

	margin?: CssValue;
	marginTop?: CssValue;
	marginRight?: CssValue;
	marginBottom?: CssValue;
	marginLeft?: CssValue;

	padding?: CssValue;
	paddingTop?: CssValue;
	paddingRight?: CssValue;
	paddingBottom?: CssValue;
	paddingLeft?: CssValue;

	background?: CssValue;
	backgroundColor?: CssValue;
	color?: CssValue;
	opacity?: CssValue;

	border?: CssValue;
	borderRadius?: CssValue;
	boxShadow?: CssValue;
	backdropFilter?: CssValue;

	overflow?: CssValue;
	overflowX?: CssValue;
	overflowY?: CssValue;

	alignItems?: CssValue;
	justifyContent?: CssValue;
	flexDirection?: CssValue;
	gap?: CssValue;

	transform?: CssValue;
	transition?: CssValue;
	filter?: CssValue;
	pointerEvents?: CssValue;
}

const UNIT_LESS_PROPERTIES = new Set(['z-index', 'opacity']);

const toKebabCase = (value: string): string => {
	return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
};

const normalizeCssValue = (property: string, value: CssValue): string | null => {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (typeof value === 'number') {
		return UNIT_LESS_PROPERTIES.has(property) ? String(value) : `${value}px`;
	}

	return String(value).trim();
};

export const stylesToCssText = (styles?: ModalInlineStyles): string => {
	if (!styles) return '';

	return Object.entries(styles)
		.map(([key, value]) => {
			const property = toKebabCase(key);
			const normalizedValue = normalizeCssValue(property, value);

			if (normalizedValue === null) return null;
			return `${property}: ${normalizedValue}`;
		})
		.filter(Boolean)
		.join('; ');
};
