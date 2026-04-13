import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl, normalizePostSlug } from "@utils/url-utils.ts";

/**
 * Generic function to create a count map from items
 * @param items Array of items to count
 * @param keyFn Function to extract key from each item
 * @returns Count map object
 */
function createCountMap<T>(
	items: T[],
	keyFn: (item: T) => string | null | undefined,
): { [key: string]: number } {
	const countMap: { [key: string]: number } = {};
	items.forEach((item) => {
		const key = keyFn(item);
		if (key) {
			countMap[key] = (countMap[key] ?? 0) + 1;
		}
	});
	return countMap;
}

async function getPublishedPosts() {
	return getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
}

// // Retrieve posts and sort them by sticky status and publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getPublishedPosts();

	const sorted = allBlogPosts.sort((a, b) => {
		// 1. 获取置顶权重 (在 src/content.config.ts 中定义的字段)
		// 默认为 0，数字越大越靠前
		const stickyA = a.data.sticky ?? 0;
		const stickyB = b.data.sticky ?? 0;

		if (stickyA !== stickyB) {
			return stickyB - stickyA;
		}

		// 2. 如果置顶权重相同，则按发布日期排序
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 0; i < sorted.length; i++) {
		const nextPost = sorted[i - 1];
		const prevPost = sorted[i + 1];

		if (nextPost) {
			sorted[i].data.nextSlug = normalizePostSlug(nextPost.id);
			sorted[i].data.nextTitle = nextPost.data.title;
		}

		if (prevPost) {
			sorted[i].data.prevSlug = normalizePostSlug(prevPost.id);
			sorted[i].data.prevTitle = prevPost.data.title;
		}
	}

	return sorted;
}

export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};

export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: normalizePostSlug(post.id),
		data: post.data,
	}));

	return sortedPostsList;
}

export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getPublishedPosts();

	const countMap = createCountMap(
		allBlogPosts.flatMap((post) =>
			post.data.tags.map((tag: string) => ({ tag })),
		),
		(item) => item.tag,
	);

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getPublishedPosts();

	const countMap = createCountMap(allBlogPosts, (post) => {
		if (!post.data.category) {
			return i18n(I18nKey.uncategorized);
		}
		return post.data.category.trim();
	});

	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({
		name: key,
		count: countMap[key],
		url: getCategoryUrl(key),
	}));
}
