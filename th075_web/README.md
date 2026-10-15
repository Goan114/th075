# 东方萃梦想 WEB 1.0.4

以本地日文原版 1.11 为目标的具名 C++ / Wasm 游戏实现。十一名对战角色、原版十名可选剧情角色、Story / Arcade / 对人 / 对电脑 / Training / Demo、标题／选人／战绩／Music Room／结局／存档／.rep 录像已接入 SDL3 浏览器平台。

游戏源码在 cpp/game，平台在 cpp/sdl，最终版公共启动器在 launcher，网页运行协议在 sdl-runtime。渲染器使用 ../portable/sdl，与本地永夜抄、风神录、花映塚、地灵殿最终版共享；GfxInterface / ZunGraphics 提交 CPU 精灵顶点，合批后使用 WebGL2，glBufferData 上传、固定布局 VAO 与状态缓存。GraphicsDevice 的数字 8 是原版精度配置。

当前公网：[萃梦想 WEB](https://api.steinsgateon.com/)（1.0.4，2026-10-12，端口 3007）。首次启动安装约 426 MiB 原版与汉化资源，使用最多四个并发下载；后续启动读取浏览器已安装资源。

运行：双击“启动萃梦想网页版.cmd”，保持窗口开启，访问 http://127.0.0.1:3007/ 。手机通过公网域名访问。默认 1280×960，可在启动器切换 640×480。画面默认清晰整数缩放，按设备像素对齐；可选择铺满游戏区域。原版素材仍是 640×480 时代的位图，放大不产生额外细节。

一号玩家默认方向键、Z / X / C / V（A / B / C / D）、Enter；二号玩家 WASD、J / K / L / I、E。Esc 暂停，Ctrl 快进对话／录像。手机左侧方向轮盘，右侧 A / B / C / D 可同时按住，首次操作帮助可点击关闭。游戏内 Option 可改键。格斗方向按原版八方向输入，可输入组合招式。

存档 score.dat、设置 config.dat、录像 replay/*.rep 保存在各浏览器 IndexedDB 的 /savesth075 中，可用启动器导入／导出；公共服务器只读取已发布资源清单。安装后的资源由浏览器 Package Store 提供。

从工作区根目录构建：

    th10_web/tools/node.exe th075_web/scripts/build-sdl.mjs --release
    th10_web/tools/node.exe th075_web/scripts/package-release.mjs

需要工作区已有 tools/emsdk、TypeScript，以及本项目 assets。常规构建使用已压缩资源、已烘焙中日文字形和保留原版循环点的 34 首 OGG。资源重做使用 inspect-resources.mjs --extract、prepare-assets.mjs、prepare-music.py；字形重做使用 bake-glyphs.mjs（Windows 原日文字体）。汉化资源重做依次执行 scripts/prepare-chinese.mjs 和 scripts/bake-glyphs.mjs --chinese，需要本地 th075c.dat、测试核心以及宋体；浏览器游玩不需要系统字体。

原版对照核心：scripts/cpp/build.mjs 与 tests/cpp；实际浏览器验收：tests/sdl。参考 EXE 与 Unicorn 仅用于开发对照，发布网站的运行链路为 C++ / Wasm → SDL3 → WebGL2。

验收身份、范围与限制见 reference/release-acceptance.json；209 份组件证据各自保留实际执行的核心哈希。整体验收覆盖十名剧情角色共 70 场关卡到结局、Arcade 六场全通关、录制回放 1800 帧、续关／名字保存、音频和公共启动器。手机布局和多指输入已在 Chromium 模拟验证；手机真机驱动、音频延迟和帧率由测试组实测。游戏逻辑为日文 1.11，前端中文；启动器可选日本語（原版）或中文（繁體，本地漢化）。汉化仅替换画面与文本，保留日文 1.11 的脚本指令、角色行为、时间与分支。存档和录像共用，语言偏好会记住。
