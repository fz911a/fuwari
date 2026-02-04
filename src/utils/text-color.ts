/**
 * Detect background brightness and adjust text color accordingly
 */

interface ColorConfig {
	lightModeTextColor: string; // 浅色模式文字颜色
	darkModeTextColor: string; // 深色模式文字颜色
	enableAutoDetect: boolean; // 启用自动检测
	threshold: number; // 亮度阈值（0-255）
}

export const defaultColorConfig: ColorConfig = {
	lightModeTextColor: "rgb(30, 30, 30)", // 深色文字（用于亮背景）
	darkModeTextColor: "rgb(245, 245, 245)", // 浅色文字（用于暗背景）
	enableAutoDetect: true,
	threshold: 128,
};

// 缓存图像亮度计算结果
const brightnessCache = new Map<string, number>();

/**
 * Calculate image brightness with caching
 * @param imageUrl - Image URL to analyze
 * @returns Brightness value (0-255)
 */
export const getImageBrightness = (imageUrl: string): Promise<number> => {
	// 检查缓存
	const cached = brightnessCache.get(imageUrl);
	if (cached !== undefined) {
		return Promise.resolve(cached);
	}

	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = Math.min(img.width, 200); // 限制最大尺寸以提高性能
				canvas.height = Math.min(img.height, 200);

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve(128);
					return;
				}

				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				// Sample center area of image for better accuracy
				const sampleX = Math.floor(canvas.width * 0.25);
				const sampleY = Math.floor(canvas.height * 0.25);
				const sampleWidth = Math.floor(canvas.width * 0.5);
				const sampleHeight = Math.floor(canvas.height * 0.5);

				const imageData = ctx.getImageData(
					sampleX,
					sampleY,
					sampleWidth,
					sampleHeight,
				);

				const data = imageData.data;
				let brightness = 0;
				let pixelCount = 0;

				// Calculate average brightness using optimized loop
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i];
					const g = data[i + 1];
					const b = data[i + 2];

					// Using luminance formula: 0.299*R + 0.587*G + 0.114*B
					brightness += (r * 299 + g * 587 + b * 114) / 1000;
					pixelCount++;
				}

				brightness = Math.floor(brightness / pixelCount);
				brightnessCache.set(imageUrl, brightness);
				resolve(brightness);
			} catch (error) {
				console.warn("Failed to calculate image brightness:", error);
				resolve(128);
			}
		};

		img.onerror = () => {
			console.warn("Failed to load image for brightness detection:", imageUrl);
			resolve(128);
		};

		img.src = imageUrl;
	});
};

/**
 * Determine if text should be dark or light based on brightness
 */
export const shouldUseDarkText = (
	brightness: number,
	threshold = 128,
): boolean => {
	return brightness > threshold;
};

/**
 * Apply text color based on background brightness
 */
export const applyAdaptiveTextColor = async (
	imageUrl: string,
	config: ColorConfig = defaultColorConfig,
): Promise<void> => {
	if (!config.enableAutoDetect) return;

	try {
		const brightness = await getImageBrightness(imageUrl);
		const useDarkText = shouldUseDarkText(brightness, config.threshold);

		const color = useDarkText
			? config.lightModeTextColor
			: config.darkModeTextColor;
		document.documentElement.style.setProperty("--adaptive-text-color", color);
	} catch {
		// Fallback to default
		const defaultColor = config.darkModeTextColor;
		document.documentElement.style.setProperty(
			"--adaptive-text-color",
			defaultColor,
		);
	}
};

/**
 * Get CSS variable for adaptive text color
 */
export const getAdaptiveColorCSS = (): string => {
	return "var(--adaptive-text-color)";
};
