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

/**
 * 初始化性能监控
 */
export const initializePerformanceMonitoring = () => {
	// 监听 First Contentful Paint
	if ("PerformanceObserver" in window) {
		try {
			const paintObserver = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					if (entry.name === "first-contentful-paint") {
						metrics.fcp = Math.round(entry.startTime);
					}
				}
			});
			paintObserver.observe({ entryTypes: ["paint"] });
		} catch (e) {
			console.warn("Failed to observe paint events:", e);
		}

		// 监听 Largest Contentful Paint
		try {
			const lcpObserver = new PerformanceObserver((list) => {
				const entries = list.getEntries();
				const lastEntry = entries[
					entries.length - 1
				] as LargestContentfulPaintEntry;
				if (lastEntry) {
					metrics.lcp = Math.round(
						lastEntry.renderTime || lastEntry.loadTime || 0,
					);
				}
			});
			lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
		} catch (e) {
			console.warn("Failed to observe LCP events:", e);
		}

		// 监听 Cumulative Layout Shift
		try {
			const clsObserver = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const layoutEntry = entry as LayoutShiftEntry;
					if (!(layoutEntry.hadRecentInput ?? false)) {
						metrics.cls = (metrics.cls || 0) + (layoutEntry.value ?? 0);
					}
				}
			});
			clsObserver.observe({ entryTypes: ["layout-shift"] });
		} catch (e) {
			console.warn("Failed to observe CLS events:", e);
		}

		// 监听 First Input Delay
		try {
			const fidObserver = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const fidEntry = entry as FirstInputEntry;
					metrics.fid = Math.round(fidEntry.processingDuration ?? 0);
				}
			});
			fidObserver.observe({ entryTypes: ["first-input"] });
		} catch (e) {
			console.warn("Failed to observe FID events:", e);
		}
	}

	// 获取 Time to First Byte
	if ("performance" in window && "getEntriesByType" in window.performance) {
		const navigationEntries = window.performance.getEntriesByType(
			"navigation",
		) as PerformanceNavigationTiming[];
		if (navigationEntries.length > 0) {
			const navEntry = navigationEntries[0];
			metrics.ttfb = Math.round(navEntry.responseStart - navEntry.fetchStart);
		}
	}

	// 页面卸载时报告指标
	window.addEventListener("unload", () => {
		reportMetrics();
	});
};

/**
 * 报告性能指标
 */
export const reportMetrics = () => {
	// 这里可以将指标发送到分析服务
	// 例如：Google Analytics, Sentry 等
	if (metrics.fcp || metrics.lcp || metrics.cls !== undefined) {
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
