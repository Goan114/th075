"""Create the relocatable TH075 full development ZIP used by the test group."""
from pathlib import Path
import hashlib, json, os, shutil, sys, zipfile
from datetime import datetime

workspace = Path(__file__).resolve().parents[2]
root = Path('\\\\?\\' + str(workspace)) if os.name == 'nt' else workspace
game = root/'th075_web'
meta = json.loads((game/'reference/web-release.json').read_text(encoding='utf-8'))
name = 'TH075-'+meta['version']+'-development-'+datetime.now().strftime('%Y%m%d')
stage = root/'artifacts'/(name+'-stage')
archive = root/(name+'.zip')
skip = {'.git','.codex','.agents','__pycache__','.cache','npm-cache','objects','objects-debug','project','downloads'}
private = {'debug.log','processes.json','server-process.json','public-server.json','cloudflared-token.txt','.emscripten'}

def digest(p):
    with p.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()

def copy(p,n):
    if not p.is_file(): raise RuntimeError('Missing file: '+str(p))
    if p.is_symlink(): raise RuntimeError('Unexpected symlink: '+str(p))
    dest=stage/n; dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.is_file() and dest.stat().st_size==p.stat().st_size and dest.stat().st_mtime_ns==p.stat().st_mtime_ns: return
    try: shutil.copy2(p,dest)
    except PermissionError:
        # Windows may briefly lock an EXE while its metadata is copied.
        # Accept only a fully readable, byte-identical copy; never change ACLs.
        if not dest.is_file() or digest(p)!=digest(dest): raise
        print("Verified copied bytes without metadata: "+str(n),flush=True)

def tree(p,n,exclude=(),predicate=None):
    if not p.is_dir(): raise RuntimeError('Missing directory: '+str(p))
    print('Copying '+str(n),flush=True)
    for current,dirs,files in os.walk(p):
        dirs[:]=sorted(d for d in dirs if d not in skip and d not in exclude)
        for d in dirs:
            if (Path(current)/d).is_symlink(): raise RuntimeError('Unexpected directory symlink')
        (stage/n/Path(current).relative_to(p)).mkdir(parents=True,exist_ok=True)
        for f in sorted(files):
            q=Path(current)/f
            if f.startswith('.env') or f.lower() in private or q.suffix.lower() in {'.pyc','.tmp','.log','.pem','.key','.pfx'}: continue
            if predicate and not predicate(q): continue
            copy(q,Path(n)/q.relative_to(p))

def write(n,t):
    p=stage/n; p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(t,encoding='utf-8',newline='\r\n' if str(n).endswith('.cmd') else '\n')

def prepare(resume=False):
    if archive.exists() or (stage.exists() and not resume): raise RuntimeError('Refusing overwrite')
    stage.mkdir(parents=True,exist_ok=resume)
    for d in ['cpp','sdl-runtime','scripts','tests','launcher','docs','assets','reference']: tree(game/d,'th075_web/'+d)
    for n in ['README.md','target.json','CHANGELOG.txt','启动萃梦想网页版.cmd']: copy(game/n,'th075_web/'+n)
    release=game/'artifacts/sdl3'
    for d in ['site','scripts','node_modules']: tree(release/d,'th075_web/artifacts/sdl3/'+d)
    for n in ['th075.wasm','th075.mjs','build.json','package.json','th075-harness.mjs','th075-harness.wasm','th075-render-probe.mjs','th075-render-probe.wasm']: copy(release/n,'th075_web/artifacts/sdl3/'+n)
    for n in ['THIRD-PARTY-NOTICES.txt','LICENSE-launcher.txt']: copy(release/'site'/n,n)
    for d in ['sdl','input']: tree(root/'portable'/d,'portable/'+d)
    tree(game/'artifacts/cpp/analysis','th075_web/artifacts/cpp/analysis',exclude=('cache','temp','settings'))
    tree(game/'artifacts/cpp/verification','th075_web/artifacts/cpp/verification')
    for n in ['game-core-test.wasm','game-core-test-build.json']: copy(game/'artifacts/cpp'/n,'th075_web/artifacts/cpp/'+n)
    tree(game/'artifacts/browser','th075_web/artifacts/browser',predicate=lambda p:p.suffix in {'.json','.png','.rep'})
    baseline=json.loads((game/'reference/architecture-baseline.json').read_text(encoding='utf-8'))
    changes={e['path']:e for e in json.loads((game/'reference/shared-architecture-extensions.json').read_text(encoding='utf-8'))['changes']}
    for e in baseline['sharedFiles']:
        if digest(root/e['path'])!=changes.get(e['path'],{}).get('currentSha256',e['sha256']): raise RuntimeError('Shared source drift: '+e['path'])
        copy(root/e['path'],e['path'])
    # Historical manifests support the initial inspection script, not other games' runtimes.
    for g in ['th08','th09','th10','th11']:
        p=g+'_web/artifacts/sdl-release/site/manifest.json'; copy(root/p,p)
    for n in ['release-server.mjs','netplay-relay.mjs']: copy(root/'th09_web/scripts'/n,'th09_web/scripts/'+n)
    tree(root/'th09_web/node_modules/ws','th09_web/node_modules/ws')
    for d in ['emsdk','architecture/typescript','architecture/python']: tree(root/'tools'/d,'tools/'+d)
    for d in ['wasi-sdk-34.0-x86_64-windows','decomp']: tree(root/'th10_web/tools'/d,'th10_web/tools/'+d)
    for n in ['node.exe','Node.LICENSE']: copy(root/'th10_web/tools'/n,'th10_web/tools/'+n)
    copy(root/'th10_web/scripts/native/browser-launch.mjs','th10_web/scripts/native/browser-launch.mjs')
    for d in ['playwright','playwright-core']: tree(root/'th10_web/node_modules'/d,'th10_web/node_modules/'+d)
    for d in ['@alexaltea/unicorn-js','koffi','@koromix']: tree(root/'th08_web/node_modules'/d,'th08_web/node_modules/'+d)
    copy(root/'th08_web/package.json','th08_web/package.json')
    tree(root/'th15_web/tools/capstone','th15_web/tools/capstone')
    original=root/'[th075] 东方萃梦想 (汉化版+日文版)'
    for n in ['th075.exe','th075c.exe','th075.dat','th075b.dat','th075bgm.dat','th075c.dat','config.exe','configCN.exe']: copy(original/n,original.name+'/'+n)
    tree(original/'附带文档',original.name+'/附带文档')
    tree(original/'replay',original.name+'/replay',predicate=lambda p:p.suffix.lower() in {'.rep','.txt'})
    py=Path(sys.base_prefix)
    for p in py.iterdir():
        if p.is_file() and (p.suffix in {'.exe','.dll'} or p.name.startswith('LICENSE')): copy(p,'tools/python/'+p.name)
    for d in ['DLLs','Lib','libs','include']: tree(py/d,'tools/python/'+d,exclude=('site-packages',))
    for p in (py/'Lib/site-packages').iterdir():
        if p.name.startswith(('numpy','cffi','pycparser','_cffi_backend')):
            dest='tools/python/Lib/site-packages/'+p.name
            tree(p,dest) if p.is_dir() else copy(p,dest)
    browsers=root/'tools/playwright-browsers'
    if not browsers.is_dir(): browsers=Path(os.environ['LOCALAPPDATA'])/'ms-playwright'
    for p in browsers.iterdir():
        if p.is_dir() and p.name.startswith(('chromium_headless_shell-','ffmpeg-')): tree(p,'tools/playwright-browsers/'+p.name)
    copy(root/'th09_web/scripts/handoff/prepare-toolchain.py','tools/prepare-toolchain.py')
    copy(root/'th09_web/scripts/handoff/prepare-toolchain.py','th09_web/scripts/handoff/prepare-toolchain.py')
    write('tools/emsdk/.emscripten',"import os\n_sdk = os.environ['EMSDK']\nLLVM_ROOT = os.path.join(_sdk, 'install', 'bin')\nBINARYEN_ROOT = os.path.join(_sdk, 'install')\nNODE_JS = [os.path.abspath(os.path.join(_sdk, '..', '..', 'th10_web', 'tools', 'node.exe'))]\nCACHE = os.path.join(_sdk, 'install', 'emscripten', 'cache')\nEMSCRIPTEN_ROOT = os.path.join(_sdk, 'install', 'emscripten')\n")
    write('开发环境.cmd','@echo off\nset "PATH=%~dp0tools\\python;%~dp0th10_web\\tools;%PATH%"\nset "PLAYWRIGHT_BROWSERS_PATH=%~dp0tools\\playwright-browsers"\nset "EMSDK=%~dp0tools\\emsdk"\nset "EM_CONFIG=%~dp0tools\\emsdk\\.emscripten"\nset "PYTHONNOUSERSITE=1"\n"%~dp0tools\\python\\python.exe" "%~dp0tools\\prepare-toolchain.py"\n')
    write('启动萃梦想网页版.cmd','@echo off\nchcp 65001 >nul\nsetlocal\ncd /d "%~dp0"\necho 请打开 http://127.0.0.1:8075/ ，保持本窗口开启。\n"%~dp0th10_web\\tools\\node.exe" "%~dp0th075_web\\artifacts\\sdl3\\scripts\\serve.mjs" --port 8075\necho 服务已停止；如失败请保留上方错误。\npause\n')
    prefix='@echo off\nchcp 65001 >nul\nsetlocal\ncall "%~dp0开发环境.cmd"\nif errorlevel 1 goto failed\ncd /d "%~dp0"\n'
    suffix='echo Completed.\npause\nexit /b 0\n:failed\necho Failed; retain the error above.\npause\nexit /b 1\n'
    write('重新编译萃梦想.cmd',prefix+'node th075_web\\scripts\\build-sdl.mjs --release\nif errorlevel 1 goto failed\nnode th075_web\\scripts\\package-release.mjs\nif errorlevel 1 goto failed\nnode th075_web\\scripts\\verify-delivery.mjs\nif errorlevel 1 goto failed\n'+suffix)
    write('验证开发包.cmd',prefix+'node th075_web\\scripts\\verify-delivery.mjs\nif errorlevel 1 goto failed\n'+suffix)
    write('deploy/server.mjs',"import {releaseServer} from '../th075_web/artifacts/sdl3/scripts/serve.mjs';\nimport {fileURLToPath} from 'node:url';\nconst port=Number(process.env.PORT||3007),host=process.env.HOST||'127.0.0.1';\nif(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');\nconst result=await releaseServer({root:fileURLToPath(new URL('../th075_web/artifacts/sdl3/site',import.meta.url)),port,host});\nconsole.log('TH075 '+result.manifest.webVersion+' '+result.manifest.version+' '+result.url);\n")
    manifest=json.loads((release/'site/manifest.json').read_text(encoding='utf-8'))
    write('README-交付说明.md',f'''# 萃梦想 WEB {meta['version']} 完整开发交付 · {meta['date']}

沿用永夜抄、风神录及绀珠传的单个完整开发 ZIP：可运行网站、完整 C++ 与前端源码、共享 SDL3/WebGL2 渲染／输入源码、原版素材、测试与原版对照工具，以及 Windows x64 离线编译工具链。

完整解压到较短可写目录（例如 E:/TH075），双击根目录“启动萃梦想网页版.cmd”，打开 http://127.0.0.1:8075/ ，保持窗口开启。不要在 ZIP 内运行或只解压 th075_web。本地测试端口与现有公网 3007 分开；部署入口仍默认 3007。

本包为当前公网同版 {meta['version']}：包含主菜单／角色选择／暂停等画面修复、倒地与符卡转换的原版行为核对、本地繁体汉化选项、默认 1280×960、清晰整数缩放和铺满切换。完整更新记录见 CHANGELOG.txt。逻辑基于日文原版 1.11；中文选择采用本地汉化的画面和文字，保留日文原版脚本控制逻辑。

双击“重新编译萃梦想.cmd”使用包内 Python、Node、Emscripten、SDL3 缓存及 TypeScript 重建网站。另附 WASI SDK、Unicorn、Playwright Chromium、Ghidra/JDK、Capstone 和音频转换依赖。原版字形重新采样需要 Windows 日文字体和宋体；常规构建直接使用已附字形。命令见 handoff/BUILD-AND-TEST.md。

保留完整目录结构；th08_web、th09_web、th10_web、th11_web、th15_web 是工具／共享依赖及历史参考清单，不是其他游戏的完整开发包。包内二进制工具链用于 Windows x64。Linux 部署已构建网站只需 Node，重新编译需同版本 Linux 工具链。

验证开发包.cmd 检查源码、发布文件和部署入口；FILE-SHA256.json 校验所有交付文件。verification 中记录本次独立目录构建、运行检查；原版录像及历史验证报告保留各自构建身份，不代表每个补丁重跑所有角色／路线。手机布局模拟不等于真机帧率保证。

包内没有维护者存档、浏览器数据库、Cloudflare 凭据或服务器进程文件；保留用户提供的 13 份比赛录像作为原版对照样本。网页玩家的存档、设置和录像仍保存在各自浏览器。

游戏、字体和第三方代码／工具保留各自归属及许可。外部参考源码在 th075_web/reference/external/th075，来源说明见 reference/provenance.json。此参考不等于本项目完整游戏的运行代码；运行 C++ 在 cpp/game、cpp/sdl 和 portable/sdl。
''')
    copy(game/'CHANGELOG.txt','CHANGELOG.txt')
    write('deploy/部署说明.md',f'''# 萃梦想 WEB {meta['version']} 测试环境部署

Windows 根目录运行 th10_web/tools/node.exe deploy/server.mjs。
Linux 安装 Node.js 22 或兼容更新版本，根目录运行 node deploy/server.mjs。
最小运行目录为 deploy/server.mjs 和完整 th075_web/artifacts/sdl3 下的 site、scripts、node_modules，保留相对位置。

默认监听 127.0.0.1:3007。环境变量 PORT 可改端口；容器／跨主机代理可设 HOST=0.0.0.0。测试组使用自己的 HTTPS 域名和反向代理。资源缓存与离线功能需要 HTTPS（本机 localhost 除外）。

只公开 site 或附带的清单白名单服务器，不要公开整个开发目录。保留源站 MIME、COOP、COEP、CORP、CSP、Range、Cache-Control 响应头。manifest.json、version.json、app-shell-sw.js 按源站策略更新，勿额外强制全站缓存。先完整上传新版本，再切换目录并重启服务，避免清单与资源混用。

更新核对 /manifest.json：game=th075，webVersion={meta['version']}，version={manifest['version']}。
Wasm SHA-256：{manifest['execution']['sha256']}。

玩家退出后刷新并按更新提示操作，无需清空存档。测试新浏览器与旧缓存、日文／中文切换、标题／选人／暂停与返回、Story／Arcade／对战／练习、比赛录像、多指按键、导入导出、分辨率与清晰缩放。原素材分辨率限制仍存在，整数缩放不会生成高清新细节。
''')
    write('handoff/BUILD-AND-TEST.md','''# 构建与测试

在完整解压后的根目录，用 cmd 执行 call 开发环境.cmd，再运行：

    node th075_web/scripts/build-sdl.mjs --release
    node th075_web/scripts/package-release.mjs
    node th075_web/scripts/verify-delivery.mjs

以上是本移植版的正式构建入口，launcher/package.json 保留上游元数据；不要使用其中未移植的上游任务。生产编译验证 reference/release-acceptance.json 中源码哈希。修改游戏逻辑后先完成对应原版对照和浏览器验收、更新接受记录，再生产构建，不要跳过守卫。

核心原版对照：

    node th075_web/scripts/cpp/build.mjs
    node --test th075_web/tests/cpp/graphics.test.mjs

全部组件测试位于 tests/cpp；长录像入口见 tests/cpp/recorded-match.mjs 及相关测试。包含原版 EXE、原始归档、已展开参考资源和 13 份比赛录像。

实际生产启动器（桌面和模拟手机）：

    set TH075_BROWSER_SITE=artifacts/sdl3/site
    node --test th075_web/tests/sdl/display-launcher.test.mjs
    node --test th075_web/tests/sdl/launcher-language.test.mjs

开发夹具（不能部署为正式站点）：

    node th075_web/scripts/build-sdl.mjs
    node th075_web/scripts/package-release.mjs --development

开发构建会将 artifacts/sdl3/build.json 标记为开发版；完成后需重做 --release 及正式 package-release.mjs。附带的 th075-harness 和 th075-render-probe 仅供测试，公网清单不会提供它们。upgrade-launcher.test.mjs 需要开发者历史候选站点，交付包不复制所有历史站点，不能直接作为通用升级测试运行。

资源重做：node th075_web/scripts/inspect-resources.mjs --extract，然后 prepare-assets.mjs、python th075_web/scripts/prepare-music.py；中文执行 prepare-chinese.mjs 和 bake-glyphs.mjs --chinese。inspect-original.mjs 是最初建档脚本，会重写历史基线，不是例行构建步骤。tools/emsdk/.emscripten 使用相对 SDK 定位；开发环境.cmd 会清理旧路径标记而保留离线端口缓存。

历史证据保留原构建哈希；当前交付身份见 handoff/config.json。异地构建可能因路径或工具链信息产生字节差异，须核对源码与实际重建运行结果。完整原版一致性和手机真机性能请按测试组范围复测。
''')
    write('.gitignore','tools/\nth10_web/tools/\n**/node_modules/\n**/objects/\n**/__pycache__/\n**/.cache/\n*.zip\n*.log\n')
    build=json.loads((release/'build.json').read_text(encoding='utf-8'))
    for n,h in {**build['sources'],**build['headers']}.items():
        if digest(stage/n)!=h: raise RuntimeError('Release source mismatch: '+n)
    missing=[]; count=0
    for d in ['cpp','sdl-runtime','scripts','tests','launcher']:
        for base,dirs,files in os.walk(game/d):
            dirs[:]=[d for d in dirs if d not in skip]
            for f in files:
                p=Path(base)/f
                if p.suffix in {'.cpp','.hpp','.h','.inc','.ts','.mts','.mjs','.js','.py','.ps1','.cmd','.java'}:
                    count+=1
                    if not (stage/p.relative_to(root)).is_file(): missing.append(p.relative_to(root).as_posix())
    if missing: raise RuntimeError('Missing source: '+repr(missing))
    write('handoff/source-coverage.json',json.dumps({'passed':True,'files':count,'missing':missing,'scope':'All TH075 C++ / runtime / launcher / scripts / tests; shared SDL3/input; source hashes match published build'},indent=2)+'\n')
    write('handoff/config.json',json.dumps({'game':'th075','webVersion':meta['version'],'releaseDate':meta['date'],'manifestVersion':manifest['version'],'productionWasmSha256':manifest['execution']['sha256'],'archiveRoot':name},indent=2)+'\n')
    print(json.dumps({'stage':str(stage),'status':'prepared','version':meta['version']}),flush=True)

def seal():
    if archive.exists(): raise RuntimeError('Refusing overwrite')
    for f in ['distribution.json','relocated-development.json']:
        if not json.loads((stage/'verification'/f).read_text(encoding='utf-8'))['passed']: raise RuntimeError('Delivery checks required')
    files=sorted(p for p in stage.rglob('*') if p.is_file() and not any(x in skip for x in p.relative_to(stage).parts) and p.suffix not in {'.pyc','.tmp','.log'} and p.name!='FILE-SHA256.json')
    sums={p.relative_to(stage).as_posix():digest(p) for p in files}
    write('FILE-SHA256.json',json.dumps(sums,ensure_ascii=False,indent=2)+'\n');files.append(stage/'FILE-SHA256.json')
    empty=sorted(p for p in stage.rglob('*') if p.is_dir() and not any(p.iterdir()) and not any(x in skip for x in p.relative_to(stage).parts))
    print('Compressing',len(files),'files',flush=True)
    with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
        for p in empty:z.write(p,name+'/'+p.relative_to(stage).as_posix()+'/')
        for i,p in enumerate(files):
            z.write(p,name+'/'+p.relative_to(stage).as_posix())
            if i and i%5000==0: print('Compressed',i,'/',len(files),flush=True)
    print('Reading back all ZIP entries and SHA-256',flush=True)
    with zipfile.ZipFile(archive) as z:
        for n,h in sums.items():
            with z.open(name+'/'+n) as f:
                if hashlib.file_digest(f,'sha256').hexdigest()!=h: raise RuntimeError('ZIP mismatch: '+n)
        if json.loads(z.read(name+'/FILE-SHA256.json'))!=sums: raise RuntimeError('ZIP checksum manifest mismatch')
    result={'archive':str(archive),'webVersion':meta['version'],'bytes':archive.stat().st_size,'files':len(files),'emptyDirectories':len(empty),'sha256':digest(archive),'readbackVerified':True,'stage':str(stage)}
    (root/'artifacts'/(name+'-delivery.json')).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result),flush=True)

if __name__=='__main__':
    if sys.argv[1:]==['stage']: prepare()
    elif sys.argv[1:]==['resume-stage']: prepare(True)
    elif sys.argv[1:]==['archive']: seal()
    else: raise SystemExit('Use stage, resume-stage, archive')
