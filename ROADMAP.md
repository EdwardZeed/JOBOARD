# Roadmap

Backlog items that are intentionally deferred — not being built yet, just
recorded so they don't get lost. Pull one into active work when it's time to
schedule it.

## 浏览器插件：任意网页记录投递

用真正的浏览器扩展（不是书签工具）替代/升级现在 `/applications/new` 页面上的一键书签。

- 目标：在任何职位页面（不只是抓得到 structured data 的网站）都能一键记录投递，包括 LinkedIn
  这种服务端抓取会被墙、但插件跑在已登录页面上下文里就能直接读到内容的场景。
- 现在的书签工具（[`components/bookmarklet-link.tsx`](apps/web/components/bookmarklet-link.tsx)）
  只是把当前页面 URL 传给服务端重新抓取；插件可以直接在页面 DOM 里读 `document.title`、
  meta 标签甚至可见文本，把解析逻辑从"服务端二次抓取"搬到"页面里直接读"，天然绕开反爬/登录墙问题。
- 复用 [`lib/job-scraper.ts`](apps/web/lib/job-scraper.ts) 里已经写好的 JSON-LD /
  Open Graph 解析逻辑，改成在插件里跑（content script 里跑同一套 parse 函数，或者插件直接把整
  个 HTML 传给一个新的解析 API route）。
- 写入路径不用动：插件调 `createApplicationFromUrl`（或者一个新的、专门给插件用的 API route）
  一样落进 Supabase。

## 定时任务 + 执行记录

给 agentic loop 配一套"定时跑 + 看执行历史"的基础设施。

- `agent_runs` 表（[`0001_init.sql`](supabase/migrations/0001_init.sql)）已经是为这个准备的：
  每次 loop 迭代（think/search/match/apply/update_status/sync）写一条记录，`/agent` 页面已经能
  展示，现在唯一缺的是真正定时触发 loop 本身的机制（loop 逻辑不在这个仓库里，按你原计划是你自己搭）。
- 需要决定：定时器跑在哪——本地 cron / launchd，还是也做成一个云端 scheduled job（Vercel Cron
  Job 之类）？如果 loop 需要长时间跑或者调外部 LLM，本地 cron 更简单；如果想要"不用开机器也在跑"，
  需要一个能跑 Node 环境的云端定时任务。
- `/agent` 页面现在只是简单地展示 `agent_runs` 列表，等真的有定时任务后，可能需要加：按 stage/
  status 筛选、失败重试、下一次预计运行时间这些。

## 域名（2026-09-16 调研）

现有 `Joboard` 这个名字最大的风险：**jobboard.io（双 b）已经被 ZipRecruiter 收购在用**，是一个
面向企业发招聘信息的成熟产品；`Joboard`（单 b）读音/含义上很容易被误认成同类"招聘信息板"产品，而
我们做的其实是反过来的东西——给求职者自己用的申请追踪 + agent 自动化。真要对外开放、认真做 SEO/
品牌的话这个混淆是要考虑的。

按 DNS 解析做的可用性初筛（不是正式 WHOIS 查询，只能当强信号，购买前务必在注册商那边确认一次）：

| 域名 | 状态 |
|---|---|
| `joboard.com` | 已注册（解析到某个占位/转发配置，不是干净可注册状态） |
| `joboard.io` / `joboard.app` / `joboard.dev` | 没有解析到任何东西，很可能可注册 |
| `usejoboard.com` | 没有解析到任何东西，很可能可注册 |
| `jobboard.io`（双 b，对照组） | 被 ZipRecruiter 占用，印证了上面说的混淆风险 |
| `offertrail.com` | 已注册，GoDaddy 挂牌出售（能买但大概是溢价） |
| `applyloop.com` | 已注册，转发到别的公司站点 |
| `hireloop.io` | 已注册，是一个同类型的求职跟进工具（TheHireLoop），活跃在用 |

**当前推荐：`joboard.app`**——沿用代码库/README 里已经在用的名字，不用改品牌，`.app` 后缀对一个
个人生产力工具来说也合适，DNS 检查显示大概率可注册。如果介意跟 jobboard.io 的混淆风险，值得换一个
更独特的名字，但快速试的几个候选（offertrail/applyloop/hireloop）都已经被占了——真要走这条路需要
再花时间想新名字，不是现在就能定的。

