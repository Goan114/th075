"""Original instruction evidence only; never compiled into the browser game."""
import sys, json, struct, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT.parent / 'th15_web/tools/capstone'))
from capstone import Cs, CS_ARCH_X86, CS_MODE_32
info = json.loads((ROOT / 'target.json').read_text(encoding='utf-8-sig'))
binary = (ROOT / info['executable']).resolve().read_bytes()
pe = struct.unpack_from('<I', binary, 0x3c)[0]
sections = struct.unpack_from('<H', binary, pe + 6)[0]
optional_size = struct.unpack_from('<H', binary, pe + 20)[0]
section_offset = pe + 24 + optional_size
base = struct.unpack_from('<I', binary, pe + 24 + 28)[0]
records = []
for i in range(sections):
    at = section_offset + i * 40
    virtual_size, rva, raw_size, raw = struct.unpack_from('<IIII', binary, at + 8)
    records.append((rva, max(virtual_size, raw_size), raw))
output = ROOT / 'artifacts/cpp/analysis/instructions'
output.mkdir(parents=True, exist_ok=True)
engine = Cs(CS_ARCH_X86, CS_MODE_32)
for request in sys.argv[1:]:
    address, size = (int(s, 0) for s in request.split(':'))
    rva = address - base
    section = next((s for s in records if s[0] <= rva < s[0] + s[1]), None)
    if section is None:
        raise ValueError(f'Unmapped original address {address:#x}')
    raw = section[2] + rva - section[0]
    text = '\n'.join(f'{ins.address:08x} {ins.mnemonic} {ins.op_str}' for ins in engine.disasm(binary[raw:raw + size], address)) + '\n'
    path = output / f'{address:08x}.asm'
    path.write_text(text, encoding='utf-8')
    print(path.relative_to(ROOT), 'instructions', len(text.splitlines()))
