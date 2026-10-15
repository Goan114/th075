# 构建与测试

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
