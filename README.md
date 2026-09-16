# Joboard

找工作进度看板。数据存 Supabase，Dashboard 用 Next.js 写，部署到 Vercel。给未来的 agentic
loop 留了一个 MCP server 作为写入接口——loop 本身不在这个仓库里，需要你自己接下来搭。

## 目录结构

```
joboard/
  apps/
    web/           Next.js dashboard（部署到 Vercel）
    mcp-server/    MCP server，暴露读写工具给 agent 用（本地运行，不部署）
  packages/
    db/            共享的 Supabase 类型 + client 工厂，web 和 mcp-server 都依赖它
  supabase/
    migrations/    数据库 schema
```

这是一个 npm workspaces monorepo（本机没有 pnpm，用 npm 自带的 workspaces 代替了原计划里的 pnpm）。

## 1. 建 Supabase 项目

1. 去 [supabase.com](https://supabase.com) 建一个新项目。
2. Project Settings → API，拿到 `Project URL` 和 `service_role` key（不是 `anon` key——所有读写都走
   service role，浏览器端完全不接触 Supabase）。
3. 打开 SQL editor，把 [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) 的内容跑一遍，
   建好 6 张表 + 1 个视图，并为每张表开启了 RLS（没有任何 permissive policy，所以只有
   service_role 能读写，anon/authenticated 完全没权限）。

## 2. 配置环境变量

根目录的 [`.env.example`](.env.example) 列出了需要的变量。Next.js 只认自己目录下的 `.env.local`，
MCP server 同理，所以两边都要各放一份：

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/mcp-server/.env
```

分别填好 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`（第 1 步拿到的值）。

> dashboard 目前没有登录墙——任何能访问这个 URL 的人都能看到数据。service-role key 只用在服务端
> （Server Component / Server Action），浏览器端不会接触到它，Supabase 那边也锁了 RLS，所以暴露面
> 仅限于 dashboard 页面本身展示的内容。部署到 Vercel 前想清楚这份数据能不能公开；需要的话可以用
> Vercel 自带的 [Password Protection](https://vercel.com/docs/deployment-protection) 或者重新加一层登录。

## 3. 安装依赖

```bash
npm install
```

## 4. 灌一点示例数据（可选，但建议先跑一遍看看 UI）

```bash
npm run seed -w apps/mcp-server
```

会插入几条示例投递记录、几个发现的职位、一批技术趋势信号和当前技能。重复运行会重复插入，不是幂等的。

## 5. 本地启动 dashboard

```bash
npm run dev
```

打开 http://localhost:3000。五个页面：

- **总览**：KPI、状态漏斗、每周投递趋势
- **投递列表** / 详情页：改状态、加时间线记录、编辑字段
- **新增投递**：粘贴职位链接（LinkedIn / SEEK / 公司官网都行），服务端会抓取页面里的
  `JobPosting` structured data（大部分招聘网站为了 SEO 都会嵌入）或 Open Graph 标签，自动填公司/
  职位/地点，一步保存；抓不到就先把链接存进去，进详情页手动补。页面上还有个书签小工具，拖到收藏栏后，
  在任何职位页面点一下就能带着当前链接打开这个表单。抓取彻底失败也不会丢记录——没有链接的申请（内推、
  邮件投递）走页面下方"手动填写"
- **发现职位**：agent 搜索阶段发现的职位（现在是空的，等 loop 接入 MCP 后自动出现），可以手动转成投递
- **技术趋势**：职位描述里出现的技术关键词热度榜 + 和你当前技能的差距
- **Agent 日志**：agentic loop 每次迭代的记录（现在是空的，等 loop 接入后可见）

## 6. MCP server —— 留给 agentic loop 的写入接口

`apps/mcp-server` 是一个标准的 MCP server（stdio transport），直接用 service-role key 读写同一个
Supabase 数据库，dashboard 读的是同一份数据，天然同步，不需要额外的同步逻辑。

暴露的工具：

| 工具 | 作用 |
|---|---|
| `list_applications` / `get_application` | 查询投递记录 |
| `create_application` | 记录一个新投递/心愿职位 |
| `update_application_status` | 更新状态，自动写一条时间线事件 |
| `log_job_posting` | 记录搜索阶段发现的职位 |
| `convert_posting_to_application` | 把发现的职位转成正式投递 |
| `record_tech_signals` | 批量记录解析 JD 时看到的技术关键词 |
| `log_agent_run` | 记录一次 loop 迭代（think/search/match/apply/update_status/sync） |
| `update_profile_skills` | 更新你当前的技能集 |

本地跑起来（会自动读取 `apps/mcp-server/.env`）：

```bash
npm run build -w apps/mcp-server
npm run start -w apps/mcp-server
```

在 Claude Code / Claude Desktop 里注册（改成你自己的路径和 key）：

```json
{
  "mcpServers": {
    "joboard": {
      "command": "node",
      "args": ["/absolute/path/to/joboard/apps/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

调试时也可以用 [MCP Inspector](https://github.com/modelcontextprotocol/inspector) 挂上去手动调工具，
或者直接 `npm run mcp:dev` 用 `tsx` 跑源码（改完不用重新 build）。

## 7. 部署到 Vercel

1. 把这个仓库连到 Vercel。
2. Project Settings → General → Root Directory 设成 `apps/web`（Vercel 会自动识别出这是
   npm workspaces monorepo，从仓库根目录跑 `npm install`，再在 `apps/web` 里跑 `next build`）。
3. Environment Variables 里加上 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`（和 `apps/web/.env.local` 一样）。
4. Deploy。MCP server 不部署到 Vercel——它只在你本地（或者以后 loop 跑的地方）运行。

## 这次做了什么、没做什么

**做了**：monorepo 骨架、Supabase schema、一个能查询/展示/手动增删改的完整 dashboard、MCP
server 的 9 个工具（对数据库做真实读写）、种子数据脚本、以上所有的部署说明。

**没做**：任何真正的职位搜索/爬取、简历匹配算法、自动投递、定时任务——这些是 agentic loop
自己的部分，按你的计划要一步步搭建调试。MCP 工具已经把"写入口"留好了：loop 每完成一步
思考/搜索/匹配/投递/更新状态，调用对应的工具写进 Supabase，dashboard 那边刷新就能看到。
