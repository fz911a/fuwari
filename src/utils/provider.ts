// Provider detection configuration
interface ProviderConfig {
	name: string;
	url: string;
	headerPatterns: string[];
	serverPatterns: string[];
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
	{
		name: "Alibaba Cloud ESA",
		url: "https://www.aliyun.com/",
		headerPatterns: ["ali-ray"],
		serverPatterns: ["esa"],
	},
	{
		name: "Cloudflare Edge",
		url: "https://www.cloudflare.com/",
		headerPatterns: ["cf-ray"],
		serverPatterns: ["cloudflare"],
	},
];

export const detectProvider = (headerKeys: string[], serverHeader: string) => {
	for (const config of PROVIDER_CONFIGS) {
		const matchesHeader = config.headerPatterns.some((p) =>
			headerKeys.includes(p),
		);
		const matchesServer = config.serverPatterns.some((p) =>
			serverHeader.includes(p),
		);

		if (matchesHeader || matchesServer) {
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
	try {
		const res = await fetch(window.location.href, {
			method: "HEAD",
			cache: "no-cache",
		});

		const serverHeader = (res.headers.get("server") || "").toLowerCase();
		const headerKeys = Array.from(res.headers.keys()).map((k) =>
			k.toLowerCase(),
		);

		const provider = detectProvider(headerKeys, serverHeader);
		updateProviderDisplay(proName, proBox, provider.name, provider.url);
	} catch (_error) {
		if (proName) proName.innerText = "Edge Service";
	}
};
