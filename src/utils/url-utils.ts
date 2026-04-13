import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

function normalizePath(path: string): string {
	return path.replace(/^\/|\/$/g, "").toLowerCase();
}

function normalizeCategory(category: string): string {
	return category.trim().toLowerCase();
}

export function pathsEqual(path1: string, path2: string) {
	return normalizePath(path1) === normalizePath(path2);
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function normalizePostSlug(slugOrId: string): string {
	return slugOrId.replace(/\.(md|mdx)$/i, "");
}

export function getPostUrlBySlug(slug: string): string {
	return url(`/posts/${normalizePostSlug(slug)}/`);
}

export function getTagUrl(tag: string): string {
	if (!tag) return url("/archive/");
	return url(`/archive/?tag=${encodeURIComponent(tag.trim())}`);
}

export function getCategoryUrl(category: string | null): string {
	const trimmedCategory = category?.trim() ?? "";
	const normalizedUncategorized = normalizeCategory(
		i18n(I18nKey.uncategorized),
	);
	const normalizedCategory = normalizeCategory(trimmedCategory);

	if (
		normalizedCategory === "" ||
		normalizedCategory === normalizedUncategorized
	)
		return url("/archive/?uncategorized=true");
	return url(`/archive/?category=${encodeURIComponent(trimmedCategory)}`);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}
