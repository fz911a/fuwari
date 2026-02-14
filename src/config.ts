import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	BackgroundConfig,
	ProfileConfig,
	SiteConfig,
	UmamiConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Fuwari",
	subtitle: "糖的小破站",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh-CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "状态",
			url: "https://status.lvcdy.cn", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/headphoto.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "与众不同的糖",
	bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
	links: [
		{
			name: "哔哩哔哩",
			icon: "fa6-brands:bilibili", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://space.bilibili.com/284464095",
		},
		{
			name: "Steam",
			icon: "fa6-brands:steam",
			url: "https://store.steampowered.com",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/saicaca/fuwari",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

export const umamiConfig: UmamiConfig = {
	enable: true,
	// For Umami Cloud use: https://cloud.umami.is
	// For self-hosted use your domain, e.g. https://umami.example.com
	baseUrl: "https://umami.lvcdy.cn",
	// Your Umami website ID (UUID). Set this to enable tracking.
	shareId: "1d2fc39b-523b-4fdc-9508-b0c677ce4285",
	// Optional: timezone for share pages or reporting
	timezone: "Asia/Shanghai",
};

// Text color adaptive configuration
export const textColorConfig = {
	// Enable automatic text color adjustment based on background brightness
	enableAutoDetect: true,
	// Light mode text color (used for bright backgrounds)
	lightModeTextColor: "rgb(30, 30, 30)",
	// Dark mode text color (used for dark backgrounds)
	darkModeTextColor: "rgb(245, 245, 245)",
	// Brightness threshold (0-255)
	threshold: 128,
};

// Background image configuration
export const backgroundConfig: BackgroundConfig = {
	type: "remote",
	src: "https://t.alcy.cc/ycy",
};
