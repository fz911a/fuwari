// Provider detection configuration
interface ProviderConfig {
	name: string;
	url: string;
	headerPatterns: string[];
	headerValuePatterns?: string[];
	serverPatterns: string[];
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
	{
		name: "Vercel Edge Network",
		url: "https://vercel.com/",
		headerPatterns: ["x-vercel-id", "x-vercel-cache"],
		headerValuePatterns: ["vercel"],
		serverPatterns: ["vercel"],
	},
	{
		name: "Netlify Edge",
		url: "https://www.netlify.com/",
		headerPatterns: ["x-nf-request-id", "x-nf-edge"],
		headerValuePatterns: ["netlify"],
		serverPatterns: ["netlify"],
	},
	{
		name: "AWS CloudFront",
		url: "https://aws.amazon.com/cloudfront/",
		headerPatterns: ["x-amz-cf-id", "x-amz-cf-pop", "x-cache"],
		headerValuePatterns: ["cloudfront"],
		serverPatterns: ["cloudfront"],
	},
	{
		name: "Fastly Edge Cloud",
		url: "https://www.fastly.com/",
		headerPatterns: ["x-fastly-request-id", "x-served-by", "fastly-restarts"],
		headerValuePatterns: ["fastly"],
		serverPatterns: ["fastly"],
	},
	{
		name: "Akamai Edge",
		url: "https://www.akamai.com/",
		headerPatterns: ["akamai", "x-akamai-transformed", "x-akamai-request-id"],
		headerValuePatterns: ["akamai"],
		serverPatterns: ["akamai", "akamaighost"],
	},
	{
		name: "Alibaba Cloud ESA",
		url: "https://www.aliyun.com/",
		headerPatterns: ["ali-ray"],
		headerValuePatterns: ["alibaba", "aliyun", "esa"],
		serverPatterns: ["esa"],
	},
	{
		name: "Cloudflare Edge",
		url: "https://www.cloudflare.com/",
		headerPatterns: ["cf-ray", "cf-cache-status", "cf-ew-via"],
		headerValuePatterns: ["cloudflare"],
		serverPatterns: ["cloudflare"],
	},
	{
		name: "Azure Front Door",
		url: "https://azure.microsoft.com/services/frontdoor/",
		headerPatterns: ["x-azure-ref", "x-azure-fdid", "x-cache"],
		headerValuePatterns: ["azurefd", "frontdoor"],
		serverPatterns: ["azurefrontdoor"],
	},
	{
		name: "Google Cloud CDN",
		url: "https://cloud.google.com/cdn",
		headerPatterns: [
			"x-cloud-trace-context",
			"x-goog-generation",
			"x-goog-hash",
		],
		headerValuePatterns: ["google"],
		serverPatterns: ["google frontend", "gfe"],
	},
	{
		name: "Tencent Cloud EdgeOne",
		url: "https://www.tencentcloud.com/products/edgeone",
		headerPatterns: ["eo-log-uuid", "x-nws-log-uuid"],
		headerValuePatterns: ["edgeone"],
		serverPatterns: ["edgeone"],
	},
	{
		name: "Bunny CDN",
		url: "https://bunny.net/",
		headerPatterns: ["cdn-pullzone", "cdn-requestid", "bunny-cdn-cache"],
		headerValuePatterns: ["bunny"],
		serverPatterns: ["bunnycdn"],
	},
	{
		name: "GitHub Pages",
		url: "https://pages.github.com/",
		headerPatterns: ["x-github-request-id", "x-github-backend"],
		headerValuePatterns: ["github"],
		serverPatterns: ["github.com"],
	},
];

// 缓存检测结果，避免重复请求
let providerCache: { name: string; url: string } | null = null;

export const detectProvider = (
	headerKeys: string[],
	serverHeader: string,
	headerValuesText = "",
) => {
	for (const config of PROVIDER_CONFIGS) {
		const matchesHeader = headerKeys.some((headerKey) =>
			config.headerPatterns.some((p) => headerKey.includes(p)),
		);
		const matchesServer = config.serverPatterns.some((p) =>
			serverHeader.includes(p),
		);
		const matchesHeaderValue =
			(config.headerValuePatterns || []).length > 0
				? config.headerValuePatterns?.some((p) => headerValuesText.includes(p))
				: false;

		if (matchesHeader || matchesServer || matchesHeaderValue) {
			return { name: config.name, url: config.url };
		}
	}

	return { name: "Global Edge Network", url: "" };
};

export const updateProviderDisplay = (
	proName: HTMLElement | null,
	proBox: HTMLElement | null,
	providerName: string,
	providerUrl: string,
) => {
	if (!proName || !proBox) return;

	proName.innerText = providerName;

	if (providerUrl) {
		proBox.addEventListener("click", () => {
			window.open(providerUrl, "_blank");
		});
	}

	proBox.style.opacity = "1";
};

export const fetchAndDetectProvider = async (
	proName: HTMLElement | null,
	proBox: HTMLElement | null,
) => {
	// 返回缓存的结果
	if (providerCache) {
		updateProviderDisplay(
			proName,
			proBox,
			providerCache.name,
			providerCache.url,
		);
		return;
	}

	try {
		const res = await fetch(window.location.href, {
			method: "HEAD",
			cache: "no-cache",
		});

		const serverHeader = (res.headers.get("server") || "").toLowerCase();
		const headerKeys = Array.from(res.headers.keys()).map((k) =>
			k.toLowerCase(),
		);
		const headerValuesText = Array.from(res.headers.entries())
			.map(([_, value]) => value.toLowerCase())
			.join(" ");

		const provider = detectProvider(headerKeys, serverHeader, headerValuesText);
		providerCache = provider; // 缓存结果
		updateProviderDisplay(proName, proBox, provider.name, provider.url);
	} catch (error) {
		console.warn("Failed to detect provider:", error);
		if (proName) proName.innerText = "Edge Service";
	}
};
