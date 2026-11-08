# 山河寄思

纪念毛泽东同志的历史阅读与数字纪念网站。首页直接仿照原「行走河南」文旅首页的结构与组件样式，延续 HTML + CSS + 原生 JavaScript 与零依赖 Node.js 服务结构，独立保存于本目录。

## 首页与文旅网站的对应关系

| 文旅首页 | 山河寄思首页 |
| --- | --- |
| 公共导航与深色模式 | 生平足迹、诗词品读、史料索引、问答、我的阅读与寄语 |
| 汉字寻踪专题横幅 | 数字纪念长卷专题入口 |
| 搜索景点 / 城市筛选 | 搜索历史事件 / 年份 / 足迹地点筛选 |
| 城市地图 + 目的地清单 | 时间顺序足迹示意图 + 历史节点清单 |
| 数据概览 | 历史节点、地点、诗词选读和资料来源 |
| 目的地主题侧栏 | 阅读主题筛选 |
| 我的行程 / 收藏 / 打卡 | 我的阅读 / 收藏 / 已读进度 |
| 今日推荐 / 精选线路 | 历史卡片 / 主题研读路径 |

`dist/index.html` 是新首页，`dist/long-scroll.html` 保留原数字长卷。两个页面共享历史收藏；寄语仍在长卷中填写和下载。足迹图是时间顺序示意，不是真实地理地图。

## 打开与运行

- 直接双击 `dist/index.html`：可使用首页搜索、地点筛选、足迹详情、主题卡片、阅读收藏与进度；从导航进入长卷，可使用诗词切换、本地资料检索、PNG 纪念卡，无需安装依赖。
- 完整本地服务：Node.js 20+，在本目录运行 `npm start`，访问 `http://127.0.0.1:8790`。
- 检查：`npm run check`；测试：`npm test`。
- 浏览器交互检查：先 `npm start`，另开终端设置 `PUPPETEER_MODULE`（puppeteer-core 的 ESM 入口文件绝对路径）和 `BROWSER_PATH`（Chrome / Edge 可执行文件路径），再运行 `node tools/home-check.mjs`、`node tools/library-check.mjs`、`node tools/browser-check.mjs`。截图与结果写入 `preview/`，该目录不纳入版本管理。

## 功能

1. 仿照文旅站的门户首页、深色模式与移动端导航；另保留原创水墨 SVG 长卷。
2. 首页以十个阶段梳理1893—1976年的生平，每阶段附原文出处。六个交互足迹节点提供分段详读，首页与数字长卷共用详情；阅读手记保存在浏览器。
3. 30篇诗词的短句节选与背景，支持设备朗读（需浏览器提供中文语音）。
4. 附来源链接的史料问答。资料库外内容明确说明不足。
5. 自定义寄语和落款、900 × 1200 PNG 纪念卡下载、刷新后恢复。
6. 史料索引与创作说明，所有视觉插画均为本项目 SVG 原创，不是史料照片。

## AI 模式

默认是**资料检索模式**：按关键词检索本站66条历史、诗词与语录资料，不是大模型推理，也不声称有语义检索能力。

若已有兼容 Chat Completions 的模型服务，将 `.env.example` 复制为 `.env`，填写 `AI_BASE_URL`（包含 `/v1` 等提供方规定的基础路径）、`AI_MODEL` 和 `AI_API_KEY`，重启本地服务。密钥仅在 Node 服务端读取。不要把密钥写进 `dist/`。

`GET /api/status` 返回当前模式；`POST /api/ask` 接收 `{"question":"遵义会议"}`。程序先检索本站资料，再把摘要交给模型，附上的来源由服务器从本地资料表选取。没有相关资料时不调用模型。上游失败时明确回退为检索模式。

云端 Sites 发布的是 `dist/` 静态版，保留完整交互与本地检索；不包含 Node 服务。独立部署包同时包含 Node 后端、Windows 启动脚本、Docker 和 Nginx 模板，详见[部署说明](部署说明.md)。独立版不需要 ChatGPT 登录；启用真实模型时需在后端配置可访问的兼容服务商。AI 输出仍需核对原文。

## 结构

```
dist/                 可直接打开、静态部署的完整网页
  index.html          仿照文旅网站结构的新首页
  long-scroll.html    数字长卷专题页
  css/portal-base.css 原文旅网站基础样式副本
  css/portal-map.css  原文旅地图区布局样式副本
  css/portal.css      纪念首页样式扩展
  js/home.js          首页筛选、详情、收藏、已读、主题与菜单
  css/style.css
  js/knowledge.js     历史与诗词摘要、来源
  js/guide-core.js    前后端共用检索逻辑
  js/app.js           页面交互与纪念卡
  assets/             原创水墨 SVG 与印章图标
src/assistant.mjs     服务端模型接入及回退
server.mjs            零依赖 HTTP 服务
tests/core.test.mjs   检索、来源、模型分支与回退测试
tools/check.mjs       HTML 资源、CSS 字体、脚本语法与资料数据一致性检查
tools/update-collections.mjs  由 poetry-additions.json / quotes-additions.json 重建 30 首诗词、30 则语录与 knowledge.js
tools/home-check.mjs  首页浏览器交互检查
tools/library-check.mjs  诗词馆与语录馆浏览器交互检查
tools/browser-check.mjs  数字长卷浏览器交互检查
```

## 内容与数据边界

- 历史节点为精选阅读，不是完整传记；原文入口包含完整历史背景与评价。
- 诗词只展示短句节选；资料摘要为本项目整理，全文可通过来源链接阅读。
- 纪念卡和手记只在本地浏览器保存，没有公开留言墙、注册账号或共享数据库。
- 页面没有模拟毛泽东声线、虚构历史影像或虚构用户数量。
- Font Awesome Free 6.4.0 字体和图标复用自文旅站，保留 CSS 文件头的许可声明。新增山水与书卷插画为项目原创。
- 首页历史照片栏目收录六张影像，每张图注提供档案出处及使用说明。新增的[1931年肖像](https://commons.wikimedia.org/wiki/File:Mao1931.jpg)和[卡尔逊合影](https://commons.wikimedia.org/wiki/File:Photograph_of_Mao_Zedong_with_Evans_Carlson_circa_1937_Trim.jpg)在维基共享资源标注为公有领域。[尼克松会见照片](https://catalog.archives.gov/id/194759)使用美国国家档案馆原始上传版本。荷兰国家档案馆 ANEFO 馆藏照片的年份有不同标注，图注保留待核实说明。
- 页面文案未声称已获比赛奖项或已满足传智杯全部规则；参赛材料需按学校正式通知准备。

## 诗词馆与语录馆

- `dist/poetry.html`：30首诗词的节选、创作背景与阅读提示，支持主题筛选、关键词搜索和收藏。
- `dist/quotes.html`：30则语录节选，标明篇名、时间、语境和来源，支持相同的检索与收藏。
- 两馆均支持带出处复制，剪贴板不可用时提供手动复制框；收藏独立于历史足迹收藏，保存在本机。
- 首页与数字长卷都有入口；长卷和山河问答同步使用扩充后的资料。

## 本轮后端修复与独立部署

- 中文请求按字节合并后统一解码，修复 UTF-8 分包导致的问题损坏。
- `APP_ORIGIN` 明确配置网站来源，支持 HTTPS 反向代理；仅信任 `TRUSTED_PROXY_IPS` 中的代理 IP。
- 请求限流、并发上限、断线取消、上游响应大小上限，以及不含密钥的错误分类日志。
- 模型收到原文节选、时间、背景、解读及来源；支持生平总览、诗词与语录目录。
- 新增真实 HTTP 测试：`npm test` 运行 20 项测试；`npm run check` 检查 5 个页面。
- `dist/photo-archive.html` 在本站查看六张大图及来源说明；国外语录资料已替换为核对过的国内官方页面。页面所需脚本、样式、字体及图片均为本地文件。
- 生成独立部署包：`node tools/package-release.mjs`。包中不会包含 `.env`、Git 记录、平台身份配置或本地缓存。
