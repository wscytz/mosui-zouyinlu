# 墨祟：走阴录

水墨俯视角动作肉鸽。你扮演一名替亡者走阴的夜行客，手持法器深入地宫，斩妖除祟。

纯 Canvas 2D，零框架，单 IIFE。桌面键鼠 + 移动端双虚拟摇杆，同一份游戏逻辑，分开打包。

## 快速开始

浏览器直接打开 `game.html` 即可游玩。建议 Chrome / Edge。

```bash
# 运行测试
npm test
```

## 操作

| 操作 | 桌面 | 移动端 |
|------|------|--------|
| 移动 | WASD | 左摇杆 |
| 瞄准 / 攻击 | 鼠标移动 + 按住左键 | 右摇杆拖动 |
| 闪避 | 空格 | 双击右摇杆 / 闪避按钮 |
| 暂停 | Escape / P | 右上角暂停按钮 |

## 移动端打包

```bash
npm run cap:sync        # 同步 www/ → Android
npm run cap:open:android # Android Studio 打开编译
```

需要 Android Studio + Android SDK。

## 文件结构

```
game.html          # 游戏入口
game.js            # 核心逻辑（~2250 行）
game.css           # 游戏样式（含移动端全屏适配）
gamedata.js        # 武器 / 遗物 / 敌人 / 波次数据
sound.js           # Web Audio API 合成音效
mobile-controls.js # 移动端虚拟摇杆 + 触摸输入

index.html         # 原型宣传页
wiki.html          # 游戏百科
styles.css         # 宣传页 / 百科 / 游戏共用样式
app.js             # 武器遗物数据模块（独立引用）

smoke_test.js      # 冒烟测试（36 项）
wave_test.js       # 波次专项测试
DEVDOC.md          # 开发文档
```

## 移动端架构

```
game.js（不动，双端共用）
  ↑ WASD + 鼠标     ↑ _mobileInput 桥接 (mobile-controls.js)
  桌面浏览器           Capacitor WebView
```

game.js 只加了 5 处输入桥接（~18 行），核心逻辑完全不动。mobile-controls.js 通过 `window._mobileInput` 注入触摸输入，通过 `window._renderMobileControls` 在 Canvas 上绘制虚拟摇杆。

## 技术栈

- 渲染：Canvas 2D（960×640 内部分辨率）
- 音效：Web Audio API 合成（22 种音效 + 6 种环境氛围）
- 打包：Capacitor 8.x → Android APK
- 测试：Node.js 冒烟测试（无框架）
