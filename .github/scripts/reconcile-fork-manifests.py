#!/usr/bin/env python3
"""Re-apply the fork's own additions to files upstream also owns.

The merge takes upstream's side for every path the fork does not own. That is
right for code, but it silently drops the fork's extra dependency, export and
branding entries: the fork's package.json files then stop being a superset of
upstream's, and `apps/mobile/app.config.ts` loses the Flock branding hook.

This runs after conflict resolution and before the merge commit. It reads the
pre-merge fork side from HEAD and the resolved tree from disk, then merges the
fork's extra keys back in.
"""

import json
import subprocess
import sys

SECTIONS = (
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
    "exports",
)
DEPENDENCY_SECTIONS = SECTIONS[:-1]

BRANDING_PATH = "apps/mobile/app.config.ts"
BRANDING_IMPORT = 'import { withFlockMobileBrand } from "./fork.config.ts";'
BRANDING_IMPORT_ANCHOR = 'import { loadRepoEnv } from "../../scripts/lib/public-config.ts";'
BRANDING_EXPORT = "export default withFlockMobileBrand(config, APP_VARIANT);"
BRANDING_EXPORT_ANCHOR = "export default config;"


def head_version(path: str) -> bytes | None:
    result = subprocess.run(["git", "show", f"HEAD:{path}"], capture_output=True)
    return result.stdout if result.returncode == 0 else None


def merge_manifest(path: str) -> list[str]:
    ours_raw = head_version(path)
    if ours_raw is None:
        return []
    ours = json.loads(ours_raw)
    try:
        with open(path, encoding="utf-8") as handle:
            merged = json.load(handle)
    except FileNotFoundError:
        print(f"skipped (upstream deleted it): {path}")
        return []
    original = json.dumps(merged, indent=2)

    added: list[str] = []
    for section in SECTIONS:
        merged_section = merged.get(section) or {}
        extra = {
            key: value
            for key, value in (ours.get(section) or {}).items()
            if key not in merged_section
        }
        if not extra:
            continue
        merged[section] = {**merged_section, **extra}
        if section in DEPENDENCY_SECTIONS:
            added.extend(f"{path} {section}: {key}" for key in extra)

    if json.dumps(merged, indent=2) != original:
        with open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(merged, indent=2, ensure_ascii=False) + "\n")
        subprocess.run(["git", "add", "--", path], check=True)
        print(f"re-applied fork entries: {path}")
    return added


def apply_branding() -> None:
    try:
        with open(BRANDING_PATH, encoding="utf-8") as handle:
            text = handle.read()
    except FileNotFoundError:
        sys.exit(f"{BRANDING_PATH} is missing from the merged tree")

    if BRANDING_EXPORT in text:
        return
    if BRANDING_EXPORT_ANCHOR not in text:
        sys.exit(
            f"{BRANDING_PATH} no longer ends with {BRANDING_EXPORT_ANCHOR!r}; "
            "update .github/scripts/reconcile-fork-manifests.py so Flock branding survives the merge"
        )
    if BRANDING_IMPORT not in text:
        if BRANDING_IMPORT_ANCHOR not in text:
            sys.exit(
                f"{BRANDING_PATH} no longer imports {BRANDING_IMPORT_ANCHOR!r}; "
                "update .github/scripts/reconcile-fork-manifests.py so Flock branding survives the merge"
            )
        text = text.replace(
            BRANDING_IMPORT_ANCHOR, f"{BRANDING_IMPORT_ANCHOR}\n{BRANDING_IMPORT}", 1
        )
    text = text.replace(BRANDING_EXPORT_ANCHOR, BRANDING_EXPORT, 1)
    with open(BRANDING_PATH, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    subprocess.run(["git", "add", "--", BRANDING_PATH], check=True)
    print(f"re-applied the Flock branding hook: {BRANDING_PATH}")


def main() -> None:
    stale: list[str] = []
    for path in sys.argv[1:]:
        if path == BRANDING_PATH:
            apply_branding()
        elif path == "package.json" or path.endswith("/package.json"):
            stale.extend(merge_manifest(path))

    if stale:
        sys.exit(
            "The fork adds dependencies upstream does not have, so the upstream "
            "lockfile no longer describes this tree:\n  "
            + "\n  ".join(stale)
            + "\nRun `vp i`, commit the refreshed pnpm-lock.yaml, and re-run the sync."
        )


if __name__ == "__main__":
    main()
