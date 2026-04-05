export interface SearchResult {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
}

export interface PagefindSearchResponse {
	results: Array<{
		data: () => Promise<SearchResult>;
	}>;
}

export interface PagefindClient {
	search: (query: string) => Promise<PagefindSearchResponse>;
	options?: (settings: { excerptLength: number }) => Promise<void> | void;
}

let pagefindClient: PagefindClient | null = null;

export const getPagefindClient = (): PagefindClient | null => pagefindClient;

export const setPagefindClient = (client: PagefindClient | null) => {
	pagefindClient = client;
};

export const createFallbackPagefindClient = (): PagefindClient => ({
	search: async () => ({ results: [] }),
	options: async () => undefined,
});