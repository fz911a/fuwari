import { h } from "hastscript";
import { visit } from "unist-util-visit";

const DIRECTIVE_NODE_TYPES = new Set([
	"containerDirective",
	"leafDirective",
	"textDirective",
]);

function hasDirectiveLabel(node) {
	if (!Array.isArray(node.children) || node.children.length === 0) {
		return false;
	}

	const firstChild = node.children[0];
	return Boolean(firstChild?.data?.directiveLabel);
}

export function parseDirectiveNode() {
	return (tree) => {
		visit(tree, (node) => {
			if (DIRECTIVE_NODE_TYPES.has(node.type)) {
				if (typeof node.name !== "string" || node.name.length === 0) {
					return;
				}

				// biome-ignore lint/suspicious/noAssignInExpressions: <check later>
				const data = node.data || (node.data = {});
				node.attributes =
					node.attributes && typeof node.attributes === "object"
						? node.attributes
						: {};
				if (hasDirectiveLabel(node)) {
					// Add a flag to the node to indicate that it has a directive label
					node.attributes["has-directive-label"] = true;
				}
				const hast = h(node.name, node.attributes);

				data.hName = hast.tagName;
				data.hProperties = hast.properties;
			}
		});
	};
}
