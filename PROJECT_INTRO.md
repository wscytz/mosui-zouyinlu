# 墨祟：走阴录 — 项目简介（给 Codex）

## 一句话
水墨风俯视角动作肉鸽，5 武器 × 9 波 × 4 Boss，HTML5 Canvas 2D 单 IIFE，零框架，浏览器即玩，可打包 APK。

## 仓库
- GitHub: https://github.com/wscytz/mosui-zouyinlu
- 本地: `C:\Users\金许诺\Documents\Codex\2026-04-24\new-chat-2`
- 当前版本: **v13.0**

## 技术栈
| 项 | 选型 |
|----|------|
| 渲染 | Canvas 2D (960×640)，纯手写 |
| 框架 | 零（单 IIFE，~5500 行 game.js） |
| 数据 | gamedata.js（共享数据，被 game.html + wiki.html 共同引用） |
| 音效 | Web Audio API 合成 + 8 首 MP3 关卡音乐 |
| 移动端 | mobile-controls.js 虚拟摇杆 + Capacitor 打包 APK |
| 持久化 | localStorage（meta + 历史 + 排行榜） |

## 核心循环
选武器 → 9 波战斗（每波 1 关卡调制器） → 波间选遗物/进化 → 通关打 Boss → 结算

## 文件结构
```
game.html        游戏入口（武器选择/Canvas/HUD/弹窗）
game.js          主逻辑 IIFE（~5500行，8000上限）
gamedata.js      共享数据（武器/遗物/进化/波次/敌人/成就/誓印）
game.css         游戏样式
styles.css       全站样式
sound.js         Web Audio 合成
mobile-controls.js  移动端摇杆
wiki.html        百科（自动读取 gamedata.js 渲染）
index.html       概念首页
```

## 内容体量（v13.0）
- 5 武器 / 213 遗物 / 43 进化 / 50 敌人 / 9 关卡 / 31 誓印 / 53 成就 / 10 关卡调制器
- 4 Boss：画皮娘子 / 墨将军 / 墨鬼王 / **墨仙**（新）
- 4 难度：平常 / 险途 / 噩梦 / 炼狱
- 3 模式：普通 / **无尽** / **每日种子**（mulberry32 PRNG）

## 开发约束（红线）
1. 不改 hitE / hurtP / spawnWave 核心结构
2. game.js ≤ 8000 行
3. 改动攒波提交，不逐个推送
4. 敏感文件不上传
5. 每版本必走：改代码 → 跑测试 → npm run www → git commit/push
6. 新机制必须补测试
7. git 用 wscytz 身份，**不附 AI 署名**

## 测试
- `node smoke_test.js` — 44 项冒烟（必须全绿）
- `node content_test.js` — 236 项内容（必须全绿）
- 测试基线：smoke 44/44 + content 236/236

## 流程命令
```bash
node --check game.js        # 语法
node smoke_test.js          # 冒烟
node content_test.js        # 内容
npm run www                 # 同步构建产物
git add -A && git commit -m "..."
git push origin main        # 需设代理 http.proxy 127.0.0.1:7897
```

## 文档
- `ROADMAP.md` — 路线书
- `DEVDOC.md` — 技术文档 + 版本历史
- `DEVELOPMENT.md` — 开发规范
- `TASKS_V12.md` — v12.0 任务包（已大部分完成）
- `COLLAB.md` — 协同工作约定

## 设计风格
- 水墨：墨黑 `#171310` / 朱红 `#a33a2d` / 纸色 `#f1e6d4` / 苔绿 `#4d6156`
- 字体：STKaiti / KaiTi 楷体
- 全部汉字 UI，繁体表述风格（斩祟/走阴/地宫）

## 与 Codex 协同模式
- Claude（我）做架构、审核、测试验证、文档
- OpenCode（Codex）做实现、提交（按 pr 形式提交变更清单）
- Codex 是多模态，可以读 mmx 生成的图标 / 理解截图

## 下一步候选
- T4 移动端真机验证（需用户测试）
- T5 APK 打包（需 Android Studio）
- 剩余 181 张遗物图标生成（用 mmx）
- 成就图标 52 + 誓印图标 28 + 关卡调制器图标 10
- 进阶内容：第 6 武器、第 5 Boss（需 game.js 拆分）
