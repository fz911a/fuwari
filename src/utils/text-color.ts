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

/**
 * Calculate image brightness
 * @param imageUrl - Image URL to analyze
 * @returns Brightness value (0-255)
 */
export const getImageBrightness = (imageUrl: string): Promise<number> => {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve(128);
					return;
				}

				ctx.drawImage(img, 0, 0);

				// Sample center area of image for better accuracy
				const imageData = ctx.getImageData(
					Math.floor(canvas.width * 0.25),
					Math.floor(canvas.height * 0.25),
					Math.floor(canvas.width * 0.5),
					Math.floor(canvas.height * 0.5),
				);

				const data = imageData.data;
				let brightness = 0;

				// Calculate average brightness
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i];
					const g = data[i + 1];
					const b = data[i + 2];

					// Using luminance formula
					brightness += (r * 299 + g * 587 + b * 114) / 1000;
				}

				brightness = Math.floor(brightness / (data.length / 4));
				resolve(brightness);
			} catch {
				resolve(128);
			}
		};

		img.onerror = () => {
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
