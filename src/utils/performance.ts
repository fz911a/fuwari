/**
 * 性能监控和优化工具
 */

interface PerformanceMetrics {
	fcp: number | undefined; // First Contentful Paint
	lcp: number | undefined; // Largest Contentful Paint
	cls: number | undefined; // Cumulative Layout Shift
	fid: number | undefined; // First Input Delay
	ttfb: number | undefined; // Time to First Byte
}

// 扩展 PerformanceEntry 类型定义
interface LargestContentfulPaintEntry extends PerformanceEntry {
	renderTime?: number;
	loadTime?: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
	hadRecentInput?: boolean;
	value?: number;
}

interface FirstInputEntry extends PerformanceEntry {
	processingDuration?: number;
}

interface PerformanceNavigationTiming extends PerformanceEntry {
	fetchStart: number;
	responseStart: number;
}

const metrics: PerformanceMetrics = {
	fcp: undefined,
	lcp: undefined,
	cls: undefined,
	fid: undefined,
	ttfb: undefined,
};

let monitoringInitialized = false;

function observeEntries(
	entryType: string,
	onEntries: (entries: PerformanceEntry[]) => void,
	errorMessage: string,
) {
	try {
		const observer = new PerformanceObserver((list) => {
			onEntries(list.getEntries());
		});
		observer.observe({ entryTypes: [entryType] });
	} catch (error) {
		console.warn(errorMessage, error);
	}
}

function hasCollectedMetrics(): boolean {
	return Object.values(metrics).some((value) => value !== undefined);
}

/**
 * 初始化性能监控
 */
export const initializePerformanceMonitoring = () => {
	if (monitoringInitialized) {
		return;
	}
	monitoringInitialized = true;

	if ("PerformanceObserver" in window) {
		observeEntries(
			"paint",
			(entries) => {
				for (const entry of entries) {
					if (entry.name === "first-contentful-paint") {
						metrics.fcp = Math.round(entry.startTime);
					}
				}
			},
			"Failed to observe paint events:",
		);

		observeEntries(
			"largest-contentful-paint",
			(entries) => {
				const lastEntry = entries[
					entries.length - 1
				] as LargestContentfulPaintEntry;
				if (lastEntry) {
					metrics.lcp = Math.round(
						lastEntry.renderTime || lastEntry.loadTime || 0,
					);
				}
			},
			"Failed to observe LCP events:",
		);

		observeEntries(
			"layout-shift",
			(entries) => {
				for (const entry of entries) {
					const layoutEntry = entry as LayoutShiftEntry;
					if (!(layoutEntry.hadRecentInput ?? false)) {
						metrics.cls = (metrics.cls || 0) + (layoutEntry.value ?? 0);
					}
				}
			},
			"Failed to observe CLS events:",
		);

		observeEntries(
			"first-input",
			(entries) => {
				for (const entry of entries) {
					const fidEntry = entry as FirstInputEntry;
					metrics.fid = Math.round(fidEntry.processingDuration ?? 0);
				}
			},
			"Failed to observe FID events:",
		);
	}

	if ("performance" in window && "getEntriesByType" in window.performance) {
		const navigationEntries = window.performance.getEntriesByType(
			"navigation",
		) as PerformanceNavigationTiming[];
		if (navigationEntries.length > 0) {
			const navEntry = navigationEntries[0];
			metrics.ttfb = Math.round(navEntry.responseStart - navEntry.fetchStart);
		}
	}

	window.addEventListener("pagehide", reportMetrics, { once: true });
};

/**
 * 报告性能指标
 */
export const reportMetrics = () => {
	if (hasCollectedMetrics()) {
		console.log("Performance Metrics:", {
			fcp: metrics.fcp ? `${metrics.fcp}ms` : "N/A",
			lcp: metrics.lcp ? `${metrics.lcp}ms` : "N/A",
			cls: metrics.cls ? metrics.cls.toFixed(3) : "N/A",
			fid: metrics.fid ? `${metrics.fid}ms` : "N/A",
			ttfb: metrics.ttfb ? `${metrics.ttfb}ms` : "N/A",
		});
	}
};

/**
 * 获取当前性能指标
 */
export const getMetrics = (): PerformanceMetrics => {
	return metrics;
};

/**
 * 优化图像加载 - 使用 Intersection Observer 实现懒加载
 */
export const enableImageLazyLoading = () => {
	if (!("IntersectionObserver" in window)) {
		return;
	}

	const imageObserver = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				const img = entry.target as HTMLImageElement;
				if (img.dataset.src) {
					img.src = img.dataset.src;
					img.removeAttribute("data-src");
					imageObserver.unobserve(img);
				}
			}
		});
	});

	// 观察所有带 data-src 属性的图像
	document.querySelectorAll("img[data-src]").forEach((img) => {
		imageObserver.observe(img);
	});
};

/**
 * 预加载关键资源
 */
export const preloadCriticalResources = (urls: string[]) => {
	urls.forEach((url) => {
		const link = document.createElement("link");
		link.rel = "preload";
		link.as = url.endsWith(".js")
			? "script"
			: url.endsWith(".css")
				? "style"
				: "fetch";
		link.href = url;
		document.head.appendChild(link);
	});
};
