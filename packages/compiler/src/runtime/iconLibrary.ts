import { createElement, forwardRef, type ElementType, type SVGProps } from "react";

type ModuleExports = Record<string, unknown>;
type LoadModule = (specifier: string) => Promise<ModuleExports>;
type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

function isReactComponent(value: unknown) {
  return typeof value === "function" ||
    (typeof value === "object" && value !== null && "$$typeof" in value);
}

function isIconName(name: string) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function isHugeiconsDefinition(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value.every(node =>
    Array.isArray(node) && node.length === 2 && typeof node[0] === "string" &&
    typeof node[1] === "object" && node[1] !== null && !Array.isArray(node[1]));
}

/** Use the project's renderer for data-based libraries, preserving its SVG semantics. */
export async function loadIconLibrary(library: string, loadModule: LoadModule) {
  const module = await loadModule(library);
  const icons: Record<string, ElementType> = {};
  if (library === "@hugeicons/core-free-icons") {
    const definitions = Object.entries(module).filter(([name, value]) =>
      isIconName(name) && isHugeiconsDefinition(value));
    if (definitions.length > 0) {
      const { HugeiconsIcon } = await loadModule("@hugeicons/react");
      if (!isReactComponent(HugeiconsIcon)) {
        throw new Error("@hugeicons/react does not export HugeiconsIcon. Install a compatible Hugeicons React renderer in this project.");
      }
      for (const [name, icon] of definitions) {
        const Component = forwardRef<SVGSVGElement, IconProps>((props, ref) =>
          createElement(HugeiconsIcon as ElementType, { ...props, icon, ref }));
        Component.displayName = name;
        icons[name] = Component;
      }
    }
  } else {
    for (const [name, value] of Object.entries(module)) {
      if (isIconName(name) && isReactComponent(value)) icons[name] = value as ElementType;
    }
  }
  if (Object.keys(icons).length === 0) {
    throw new Error(`${library} does not export supported icons. Choose an installed icon library or subpath.`);
  }
  return icons;
}
