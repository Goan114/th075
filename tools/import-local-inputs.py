"""Verify and restore ignored TH075 inputs from the matching development package."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('delivery', type=Path)
    parser.add_argument('--include-toolchain', action='store_true',
                        help='Also restore the offline Emscripten SDK and browsers')
    parser.add_argument('--dry-run', action='store_true',
                        help='Verify selected inputs without copying them')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    source = args.delivery.resolve()
    if not (source / 'FILE-SHA256.json').is_file():
        nested = source / 'TH075-1.0.4-development-20261012'
        if (nested / 'FILE-SHA256.json').is_file():
            source = nested
    if source == root:
        raise ValueError('Select the original full development package')
    manifest = json.loads((source / 'FILE-SHA256.json').read_text(encoding='utf-8-sig'))
    target = json.loads((root / 'th075_web/target.json').read_text(encoding='utf-8'))
    executable = 'th075_web/' + target['executable']
    executable = (root / executable).resolve().relative_to(root).as_posix()
    if manifest.get(executable) != target['sha256']:
        raise ValueError('Development package does not match the Japanese 1.11 target')
    prefixes = (
        'th075_web/assets/', 'th075_web/reference/assets/',
        'th075_web/reference/replays/', 'th075_web/reference/native/',
        'th075_web/artifacts/cpp/',
        'th08_web/node_modules/', 'th09_web/node_modules/',
        'th10_web/node_modules/', 'th10_web/tools/',
        'th15_web/tools/',
        'tools/architecture/', 'tools/python/',
    )
    if args.include_toolchain:
        prefixes += ('tools/emsdk/', 'tools/playwright-browsers/')
    # Configuration utilities are not build inputs (some extracted packages omit them).
    def is_game_input(name):
        parts = Path(name).parts
        return (len(parts) > 1 and parts[0].startswith('[th075] ')
                and (parts[1] == 'replay' or parts[-1] in
                     {'th075.exe', 'th075c.exe', 'th075.dat', 'th075b.dat',
                      'th075bgm.dat', 'th075c.dat'}))
    candidates = [name for name in manifest
                  if name.startswith(prefixes) or is_game_input(name)]
    # Only ignored files may be restored, even when a prefix also has public metadata.
    result = subprocess.run(
        ['git', '-C', str(root), 'check-ignore', '--stdin', '-z'],
        input=b''.join(name.encode('utf-8') + b'\0' for name in candidates),
        stdout=subprocess.PIPE, check=False)
    if result.returncode not in (0, 1):
        raise RuntimeError('Cannot inspect Git ignore rules')
    ignored = set(result.stdout.decode('utf-8').split('\0'))
    paths = [name for name in candidates if name in ignored]
    if not paths:
        raise ValueError('No matching TH075 inputs in the package')
    total = 0
    for name in paths:
        src, out = (source / name).resolve(), (root / name).resolve()
        if not src.is_relative_to(source) or not out.is_relative_to(root):
            raise ValueError('Unsafe input path: ' + name)
        with src.open('rb') as stream:
            digest = hashlib.sha256()
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(block)
        if digest.hexdigest() != manifest[name]:
            raise ValueError('Input hash mismatch: ' + name)
        total += src.stat().st_size
    if not args.dry_run:
        for name in paths:
            out = root / name
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source / name, out)
    print(json.dumps({'verified': len(paths), 'bytes': total,
                      'restored': 0 if args.dry_run else len(paths)}))


if __name__ == '__main__':
    main()
