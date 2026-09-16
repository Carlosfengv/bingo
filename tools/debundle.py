#!/usr/bin/env python3
"""
De-bundle the Bingo Electron app back into a source tree.

The shipped renderer/main/preload bundles are rolldown output that keeps
`//#region <original/path>` markers for every inlined module. Those markers are
a complete, ordered map of the original module graph, so we can slice the bundle
back into one file per original module.

What is recovered verbatim: module bodies (unminified, comments intact).
What is reconstructed: import headers, package manifests, non-JS assets.
What is lost by the build: TypeScript types, JSX syntax, source maps.
"""

import base64
import json
import os
import re
import shutil
import sys
from collections import Counter, OrderedDict

APP = "/tmp/lg/app/out"
DEST = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BUNDLES = [
    {"name": "renderer", "file": "renderer/assets/index-eCALDBjR.js"},
    {"name": "main", "file": "main/index.js"},
    {"name": "preload", "file": "preload/index.js"},
]

REGION_RE = re.compile(r"^//#region (.*)$")
ENDREGION_RE = re.compile(r"^//#endregion\s*$")

# rolldown emits a leading run of interop bindings at the top of the first
# module that uses them, e.g.
#   var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
#   var import_compiler_runtime = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
#       module.exports = require_react_compiler_runtime_production();
#   })))();
# and sometimes an entire third-party module inlined in place:
#   var require_foo = /* @__PURE__ */ __commonJSMin(((exports) => { ... }));
HOISTED_RE = re.compile(
    r"^var ((?:import|require)_[\w$]+) = (?=[\s\S]*?(?:__toESM|__commonJSMin|require_[\w$]+\())"
)
# CJS-interop rebinding of an already-hoisted alias, e.g.
#   var traverse$4 = import_lib$1.default.default || import_lib$1.default;
DERIVED_RE = re.compile(r"^var ([\w$]+) = (import_[\w$]+)\.[\w$.]+(?:\s*\|\||;)")


def read_balanced(lines, i, cap=400):
    """Return the index just past the statement starting at lines[i].

    Tracks (), [], {} while skipping strings and comments. This is only used to
    peel the short run of hoisted interop declarations at a region head, never
    whole modules, so it is capped: regex literals containing unbalanced braces
    would otherwise let the scan run away, and the union merge that needs
    statement-level accuracy happens in rebuild.mjs with a real parser.
    """
    depth = 0
    started = False
    n = min(len(lines), i + cap)
    while i < n:
        line = lines[i]
        j = 0
        L = len(line)
        while j < L:
            ch = line[j]
            nxt = line[j + 1] if j + 1 < L else ""
            if ch == "/" and nxt == "/":
                break
            if ch == "/" and nxt == "*":
                end = line.find("*/", j + 2)
                if end == -1:
                    break
                j = end + 2
                continue
            if ch in "\"'`":
                quote = ch
                j += 1
                while j < L:
                    if line[j] == "\\":
                        j += 2
                        continue
                    if line[j] == quote:
                        j += 1
                        break
                    j += 1
                continue
            if ch in "([{":
                depth += 1
                started = True
            elif ch in ")]}":
                depth -= 1
            j += 1
        i += 1
        if started and depth <= 0:
            break
        if not started and line.rstrip().endswith(";"):
            break
    return i


def read_comment(lines, i):
    """Consume a whole leading comment block starting at lines[i]."""
    block = []
    while i < len(lines):
        s = lines[i].strip()
        if s.startswith("//"):
            block.append(lines[i])
            i += 1
            continue
        if s.startswith("/*"):
            while i < len(lines):
                block.append(lines[i])
                done = "*/" in lines[i]
                i += 1
                if done:
                    break
            continue
        break
    return block, i


def partition_body(body):
    """Split a region body into (imports, defaults, inlined_deps, source).

    rolldown hoists interop bindings and any inlined third-party module to the
    top of the consuming region, *after* the module's own leading doc comments.
    Neither belongs to the file we are recovering, so we peel them off while
    preserving the comments in place.

    `imports` are namespace bindings (`import_react.useState`), which a
    namespace import reproduces exactly. `defaults` are CJS default-interop
    rebindings (`var traverse$4 = import_lib$1.default.default || ...`), which
    were `import traverse from "@babel/traverse"` in the original and must not
    become a namespace or the call site would invoke the module object.
    """
    imports = OrderedDict()
    defaults = OrderedDict()
    inlined = OrderedDict()
    trivia = []
    i = 0
    n = len(body)
    while i < n:
        line = body[i]
        if not line.strip():
            i += 1
            continue
        if line.lstrip().startswith(("//", "/*")):
            block, i = read_comment(body, i)
            trivia.extend(block)
            continue
        m = HOISTED_RE.match(line)
        if m:
            name = m.group(1)
            j = read_balanced(body, i)
            stmt = "\n".join(body[i:j])
            i = j
            am = re.search(r"=(.*)$", stmt, re.S)
            rhs = am.group(1) if am else ""
            if name.startswith("import_"):
                # Record every require_* the wrapper touches, not just the first:
                # rolldown's CJS interop wrapper for a package mentions its
                # helpers (tslib's __createBinding) before the package's own
                # modules, so first-wins picks the wrong package.
                imports[name] = re.findall(r"require_[\w$]+", rhs)[:8] or None
            else:
                inlined[name] = stmt
            continue
        m = DERIVED_RE.match(line)
        if m:
            src = imports.get(m.group(2))
            if isinstance(src, list):
                src = src[0] if src else None
            defaults[m.group(1)] = src or m.group(2)
            i += 1
            continue
        break
    src = trivia + body[i:]
    while src and not src[-1].strip():
        src.pop()
    return imports, defaults, inlined, src

DECL_RE = re.compile(
    r"^(?:var|let|const|function|class|async function)\s+([A-Za-z_$][\w$]*)"
)


def strip_root_nul(path):
    return path.lstrip("\0")


# Vite injects a couple of modules that belong to no source file. The preload
# helper is real code the bundle references by name, so it is recovered as a
# module like any other and imported where it is used.
SYNTHETIC = {
    "\\0vite/preload-helper.js": "src/renderer/vite-preload-helper.ts",
}


def is_app_path(path):
    """True for paths that belong to the project's own source."""
    if path in SYNTHETIC:
        return True
    # rolldown marks synthetic modules with a literal backslash-zero prefix.
    if path.startswith("\\0") or path.startswith("\0"):
        return False
    if path.startswith("../../node_modules") or path.startswith("node_modules"):
        return False
    return True


EXTERNAL_RE = re.compile(r'^(?:let|var|const)\s+([\w$]+)\s*=\s*require\("([^"]+)"\);')
# `let path$31 = __toESM(path, 1);` — a second binding for the same builtin.
REBIND_RE = re.compile(r'^(?:let|var|const)\s+([\w$]+)\s*=\s*__toESM\(([\w$]+)(?:,|\))')
# Cheap single-line form of a hoisted interop binding.
ALIAS_LINE_RE = re.compile(r"^var (import_[\w$]+) = ")

# Vite emits asset modules in two shapes: a data URL inlined into the chunk, or
# a pointer at the emitted file. Both carry a binary-asset extension on the
# region path, which is how we tell them apart from real code.
ASSET_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp",
    ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".webm", ".mp3", ".pdf",
}
DATA_URL_RE = re.compile(
    r'^(?:var|const|let)\s+[\w$]+\s*=\s*"(data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+))";?$'
)
URL_POINTER_RE = re.compile(
    r'^(?:var|const|let)\s+[\w$]+\s*=\s*""\s*\+\s*new URL\("([^"]+)"'
)


def is_asset_path(path):
    return os.path.splitext(path)[1].lower() in ASSET_EXT



def handle_asset(body, dest):
    """Recover a Vite asset module; return (info, spilled_code_lines).

    An asset region normally holds one statement. Occasionally rolldown folds a
    neighbouring module into the same region, so whatever follows the asset
    statement is real code that has to be handed to the next module rather than
    dropped.
    """
    i = 0
    while i < len(body) and not body[i].strip():
        i += 1
    if i >= len(body):
        return {"kind": "empty"}, []
    line = body[i]
    m = DATA_URL_RE.match(line)
    if m:
        data = base64.b64decode(m.group(3))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as fh:
            fh.write(data)
        return {"kind": "data-url", "mime": m.group(2), "bytes": len(data)}, body[i + 1:]
    m = URL_POINTER_RE.match(line)
    if m:
        return {"kind": "url-pointer", "file": m.group(1)}, body[i + 1:]
    return {"kind": "unrecognized"}, body[i:]


def parse_pnpm_dir(d):
    """`react@19.2.8_react@19.2.8` -> ('react', '19.2.8').

    pnpm encodes scopes with `+` and appends peer-dependency suffixes after an
    underscore, so the raw directory name needs both undone.
    """
    body = d.split("_")[0]
    if body.startswith("@"):
        scope, _, ver = body.rpartition("@")
        return scope.replace("+", "/"), ver
    name, _, ver = body.rpartition("@")
    return name, ver


def package_of_region(path):
    m = re.match(r"^\.\./\.\./node_modules/\.pnpm/[^/]+/node_modules/(.+)$", path)
    if not m:
        return None
    parts = m.group(1).split("/")
    return "/".join(parts[:2]) if parts[0].startswith("@") else parts[0]


def build_chunk_map():
    """Map Vite's dynamic-import chunks back to what they contain.

    Code splitting rewrites `import("html-to-image")` into
    `import("./es-fzqryS3e.js")`. The emitted chunk still carries region
    markers, so each one can be traced back to either an app module or a
    package.
    """
    assets = os.path.join(APP, "renderer/assets")
    out = {}
    for name in sorted(os.listdir(assets)):
        if not name.endswith(".js") or name.startswith("index-"):
            continue
        text = open(os.path.join(assets, name), encoding="utf-8", errors="replace").read()
        regions, _ = split_regions(text)
        app = [p for p, _, _l in regions if is_app_path(p)]
        deps = [d for d in (package_of_region(p) for p, _, _l in regions) if d]
        if app and not deps:
            out[name] = app[0]
        elif deps:
            out[name] = Counter(deps).most_common(1)[0][0]
    return out


def split_regions(text):
    """Yield (path, body_lines) for every //#region block in order."""
    lines = text.split("\n")
    regions = []
    cur_path = None
    cur = []
    cur_start = 0
    depth = 0
    preamble = []
    for lineno, line in enumerate(lines):
        m = REGION_RE.match(line)
        if m:
            if cur_path is not None:  # unterminated; bail out defensively
                regions.append((cur_path, cur, cur_start))
            cur_path = m.group(1)
            cur = []
            cur_start = lineno + 1
            depth = 1
            continue
        if cur_path is None:
            preamble.append(line)  # before the first region
            continue
        if ENDREGION_RE.match(line):
            depth -= 1
            if depth == 0:
                regions.append((cur_path, cur, cur_start))
                cur_path = None
                cur = []
                continue
        if line.startswith("//#region "):
            depth += 1
        cur.append(line)
    if cur_path is not None:
        regions.append((cur_path, cur, cur_start))
    return regions, preamble


def out_path_for(bundle_name, region_path):
    """Map an original region path onto a path inside _raw/."""
    if region_path in SYNTHETIC:
        return SYNTHETIC[region_path]
    p = strip_root_nul(region_path)
    if p.startswith("../../"):
        p = p[6:]
    if p.startswith("./"):
        p = p[2:]
    if p.startswith("packages/"):
        return os.path.join("packages", p[len("packages/"):])
    if p.startswith("src/"):
        return p
    return os.path.join("_recovered", bundle_name, p)


def main():
    index = {"bundles": {}, "modules": [], "aliases": {}, "dependencies": {},
             "require_defs": {}, "dep_symbols": {}, "externals": {}, "defaults": {},
             "chunks": {},
             "all_aliases": {}, "bundle_aliases": {}, "assets": {}, "dependency_versions": {}, "dep_lines": {},
             "merged": {}}

    # The same source module can compile differently per entry point: rolldown
    # tree-shakes each bundle independently, so `read.ts` ships a 74-line region
    # in the renderer and a 22-line one in main. Collect every candidate and
    # keep the richest, which is the tree-shaking superset.
    # Vite's code-split chunks, keyed by emitted filename.
    index["chunks"] = build_chunk_map()

    candidates = {}  # output rel -> list of (bundle, region_path, src, imports, defaults, inlined)

    for bundle in BUNDLES:
        full = os.path.join(APP, bundle["file"])
        text = open(full, encoding="utf-8", errors="replace").read()
        regions, preamble = split_regions(text)
        app_regions = [(p, b) for p, b, _l in regions if is_app_path(p)]
        dep_regions = [p for p, _b, _l in regions if not is_app_path(p)]

        # Node/Electron externals are declared in the preamble as
        # `let path = require("path");`, sometimes rebound via __toESM.
        for line in preamble:
            m = EXTERNAL_RE.match(line)
            if m:
                index["externals"][m.group(1)] = m.group(2)
                continue
            m = REBIND_RE.match(line)
            if m and m.group(2) in index["externals"]:
                index["externals"][m.group(1)] = index["externals"][m.group(2)]

        # rolldown names each Require function after the module it wraps and
        # defines it inside that module's region. Recording the mapping is what
        # lets us turn `import_react = require_react()` back into a specifier.
        # We also index top-level declarations in dependency regions so that
        # names inlined from node_modules (clsx, cva, useQuery, ...) resolve to
        # the right package instead of looking like free variables.
        for path, body, line_start in regions:
            app = is_app_path(path)
            for line in body:
                m = re.match(r"(?:var|function)\s+(require_[\w$]+)\b", line)
                if m:
                    index["require_defs"].setdefault(m.group(1), path)
                # Interop bindings are hoisted to a module top, but not always
                # to a region top (a mid-body first use leaves them mid-body).
                # Scanning every line catches the ones partition_body misses.
                #
                # These names are module-local: rolldown reuses `import_lib$2` in
                # every module, pointing at a different package each time. So the
                # per-region table is authoritative and `all_aliases` is only a
                # fallback -- keying off the global table resolved every module
                # but the first incorrectly (saveToCode's parser import came out
                # as @babel/traverse, which has no `parse`, so validation of every
                # save-to-code merge silently failed).
                am = ALIAS_LINE_RE.match(line)
                if am:
                    rm = re.search(r"require_[\w$]+", line)
                    if rm:
                        index["aliases"].setdefault(path, {})[am.group(1)] = rm.group(0)
                        # Also record per bundle. `var` in this flat CJS output is
                        # file-scoped, so rolldown declares each alias once -- in
                        # whichever region first needs it -- and every region in
                        # that bundle shares it. The name spaces are therefore
                        # per bundle: main's `import_lib$2` is @babel/parser while
                        # renderer's is @babel/traverse. A single global table
                        # lets the first bundle processed shadow the rest.
                        index["bundle_aliases"].setdefault(bundle["name"], {})[am.group(1)] = rm.group(0)
                if not app:
                    index["dep_lines"][path] = [bundle["file"], line_start, line_start + len(body)]
                    d = DECL_RE.match(line)
                    if d:
                        # Keep several candidates: common names (`is`, `path`,
                        # `fs`) are declared in hundreds of bundled packages,
                        # and first-wins picks an arbitrary one.
                        lst = index["dep_symbols"].setdefault(d.group(1), [])
                        if path not in lst and len(lst) < 8:
                            lst.append(path)

        # Exact versions are recoverable from the pnpm store paths, which is
        # what makes a reconstructed manifest installable rather than guessed.
        for p in dep_regions:
            m = re.match(r"\.\./\.\./node_modules/\.pnpm/([^/]+)/node_modules/", p)
            if m:
                name, ver = parse_pnpm_dir(m.group(1))
                if name and ver:
                    index["dependency_versions"].setdefault(name, ver)

        index["bundles"][bundle["name"]] = {
            "file": bundle["file"],
            "bytes": len(text),
            "regions": len(regions),
            "app_modules": len(app_regions),
            "dependency_modules": len(dep_regions),
            "dependencies": sorted(set(
                re.sub(r"^\.\./\.\./node_modules/\.pnpm/[^/]+/node_modules/", "", p)
                for p in dep_regions
                if p.startswith("../../node_modules")
            )),
        }

        carry = []
        for path, body in app_regions:
            if is_asset_path(path):
                rel = out_path_for(bundle["name"], path)
                dest = os.path.join(DEST, "_raw", rel)
                info, spill = handle_asset(body, dest)
                info["region_path"] = path
                index["assets"][rel] = info
                carry.extend(spill)
                continue
            if carry:
                body = carry + body
                carry = []
            imports, defaults, inlined, src = partition_body(body)
            rel = out_path_for(bundle["name"], path)
            candidates.setdefault(rel, []).append(
                (bundle["name"], path, src, imports, defaults, inlined))

    for rel, cands in sorted(candidates.items()):
        ordered = sorted(cands, key=lambda c: -len(c[2]))
        bundle_name, path, src, imports, defaults, inlined = ordered[0]
        if len(ordered) > 1:
            # Each bundle tree-shakes independently, so no single variant is
            # complete. Keep the richest here and save the rest for rebuild.mjs
            # to union at the AST level.
            for c in ordered:
                alt = os.path.join(DEST, "_alt", c[0], rel)
                os.makedirs(os.path.dirname(alt), exist_ok=True)
                with open(alt, "w", encoding="utf-8") as fh:
                    fh.write("\n".join(c[2]).rstrip() + "\n")
            for c in ordered[1:]:
                for a, r in c[3].items():
                    imports.setdefault(a, r)
                for d, r in c[4].items():
                    defaults.setdefault(d, r)
            index["merged"][rel] = {
                "variants": [
                    {"bundle": c[0], "lines": len(c[2]), "alt": c[0]}
                    for c in ordered
                ]
            }
        dest = os.path.join(DEST, "_raw", rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        # _raw holds the verbatim region body: the ground truth that
        # rebuild.mjs derives the reconstructed tree from.
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write("\n".join(src).rstrip() + "\n")

        decls = sorted({m.group(1) for line in src if (m := DECL_RE.match(line))})
        # Synthetic modules have no meaningful source path; key them by where
        # they land so import specifiers resolve to a real file.
        region_key = SYNTHETIC.get(path, path)
        # Merge, do not replace: the region-wide scan above sees declarations
        # anywhere in the module, while `partition_body` only peels the ones at
        # the region head. Assigning here would drop the mid-body ones.
        index["aliases"].setdefault(region_key, {}).update(imports)
        if defaults:
            index["defaults"][region_key] = defaults
        if inlined:
            index["dependencies"].setdefault(region_key, sorted(inlined))
        index["modules"].append({
            "bundle": bundle_name,
            "region_path": region_key,
            "output": rel,
            "lines": len(src),
            "declarations": decls,
            "imports": list(imports),
            "inlined_deps": sorted(inlined),
        })

    with open(os.path.join(DEST, "tools", "modules.json"), "w") as fh:
        json.dump(index, fh, indent=1, sort_keys=False)

    print(f"wrote {len(index['modules'])} modules to {DEST}/_raw")
    print(f"merged across bundles: {len(index['merged'])}")
    print(f"externals recovered:   {len(index['externals'])}")
    print(f"assets recovered:      {len(index['assets'])}")
    for rel, info in index["assets"].items():
        print(f"   {info['kind']:12s} {rel}")
    print("variants saved for AST union: "
          + str(sum(len(v["variants"]) for v in index["merged"].values())))


if __name__ == "__main__":
    main()
