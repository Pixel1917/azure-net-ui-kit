export interface CropRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type CropperResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface CropperApi {
	getCrop(): CropRect;
	reset(): void;
	toCanvas(options?: CropperExportOptions): HTMLCanvasElement;
	toBlob(options?: CropperExportOptions): Promise<Blob>;
	toDataUrl(options?: CropperExportOptions): string;
}

export interface CropperExportOptions {
	type?: string;
	quality?: number;
	fill?: string;
	rounded?: boolean;
}

export interface CropperProps {
	src: string | Blob;
	aspectRatio?: number;
	initialCrop?: CropRect;
	minWidth?: number;
	minHeight?: number;
	borderRadius?: string | number;
	disabled?: boolean;
	grid?: boolean;
	className?: string;
	containerClassName?: string;
	containerStyle?: string;
	imageClassName?: string;
	overlayColor?: string;
	cropBorderColor?: string;
	cropHandleColor?: string;
	cropHandleSize?: string | number;
	onChange?: (crop: CropRect) => void;
	onReady?: (api: CropperApi) => void;
}
