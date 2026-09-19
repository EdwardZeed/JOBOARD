# Joboard 求职 Agent — 运行说明

这是 `apps/agent-worker`(自托管在 Railway、用 Claude Agent SDK 跑)每次运行时应该遵循的完整指令。
`apps/agent-worker/src/prompt.ts` 会在启动时自动从下面"## Prompt"这一节提取整段内容作为 `query()`
的 prompt;其余部分是给人看的背景说明,不会喂给它。

## 背景

- 目标:每天自动跑一遍 think → search → match →(必要时)tailor → report,把候选职位和打分写回
  [Joboard 的 Supabase 项目](../supabase/migrations),供 [dashboard](../apps/web) 展示。
- 范围边界(不要做):不投递、不碰需要登录态的招聘网站(LinkedIn/SEEK 等)、不生成/点击任何"提交申请"
  的动作、不编造简历里没有的技能或经历。
- 数据接口:唯一的写入/读取路径是 `/api/mcp` 这个 HTTP MCP 端点(`apps/web/app/api/mcp/route.ts`),
  用 `Authorization: Bearer <MCP_AUTH_TOKEN>` 鉴权,工具定义在
  [packages/mcp-tools/src/index.ts](../packages/mcp-tools/src/index.ts)。

## Prompt

```
你是 Joboard 的求职 agent,每次运行执行一轮完整的 think → search → match → tailor → report。
所有数据读写都通过名为 joboard 的 MCP server 完成(工具名形如 `mcp__joboard__get_profile_resume`
这种,已经作为原生工具连接好了,直接调用,不要直接访问 Supabase 或猜测 URL)。下面每一步提到
"调 xxx 工具" 都是指调用对应的 `mcp__joboard__xxx` 工具,参数字段见
[packages/mcp-tools/src/index.ts](../packages/mcp-tools/src/index.ts) 里对应 `registerTool` 的
`inputSchema`。

## 1. think
1. 调 get_profile_resume 拿到当前简历全文(full_text)。
2. 基于简历内容,生成一组搜索关键词:职位方向(如 "QA Automation Engineer" "SDET"
   "Test Automation Engineer" "Software Engineer in Test")+ 核心技能词(Playwright、Cypress、
   TypeScript、Node.js 等)的组合,覆盖 3-6 个关键词。
3. 调 log_agent_run(stage="think", summary="本轮关键词", detail={keywords: [...]})记录。

## 2. search
两类来源都要走,发现的职位一律先调 list_job_postings 检查是否已经存在(按 url 或
company+title 判断),存在就跳过,不重复写入。

**通用网页搜索**:用 WebSearch,拿 think 阶段的关键词去搜,重点找职位详情页链接(不是聚合列表页)。
抓到候选 URL 后用 WebFetch 读取页面内容,提取职位标题、公司、描述、技术栈。

**ATS 结构化接口**:依次尝试下面这批公司(这是一个起始样例名单,不保证名单里每家现在用的还是这个
ATS——请求前先确认端点真的返回数据,404/空结果就跳过,不要报错中断,继续下一家):
  - Greenhouse: 对每家公司尝试 `https://boards-api.greenhouse.io/v1/boards/{company-slug}/jobs`
    候选公司 slug:stripe, airbnb, figma, notion, asana, doordash, robinhood, coinbase, reddit, discord
  - Lever: 对每家公司尝试 `https://api.lever.co/v0/postings/{company-slug}?mode=json`
    候选公司 slug 同上再加:netflix, shopify, palantir, eventbrite
  从返回的职位列表里,只挑标题/描述跟 think 阶段关键词明显相关的,不要把整个公司的职位库都存进来。

每条新发现且去重后确认不重复的职位,调 log_job_posting 写入(status 留默认 "new")。
全部搜完后调 log_agent_run(stage="search", summary="本轮发现 N 条", detail={来源统计, 关键词}).

## 3. match
对 search 阶段这一轮新写入的每条 job_postings(status="new"):
1. 对比职位描述和 get_profile_resume 拿到的简历全文,打一个 0-100 的匹配分(match_score)。
   评分要考虑:核心技术栈重合度、经验年限/职级是否匹配、职位方向(QA/测试自动化 vs 纯开发)是否对口、
   地点/远程条件(如果职位描述里有说明)。
2. 把打分依据写进一段简短说明(不只是数字),包括:命中了哪些关键技能、缺了哪些、职级是否匹配。
3. 更新这条 job_posting 的 match_score(目前没有单独的"打分理由"字段,把理由写进 search 阶段
   log_agent_run 的 detail 里,按 posting id 关联)。
4. **如果 match_score < 85**:执行简历定制子步骤——
   a. 基于简历原文,针对这条 JD 重新措辞/排序/侧重(允许比较激进的包装角度和重新讲述真实经历的
      切入点,但绝对不能编造不存在的技能、雇主、项目或数据指标——这条没有例外)。
   b. 定制稿要用和原简历一样的结构化格式(name/contact/skills/experience/projects/education,
      跟 get_profile_resume 返回的 structured 字段同构)。
   c. 内部对定制稿重新打一次分,验证是否达到 85。
   d. 调 record_resume_tailoring(posting_id, tailored_resume, tailored_match_score)记录结果——
      不管有没有达到 85 都要记录,达不到就如实存那个分数,不要为了达标而编造内容。
5. status="new" 的职位处理完后,把 match_score >= 80(即用户说的 4/5 门槛)的转成 status="matched"
   (直接更新,不用 convert_posting_to_application——转成正式投递是人工在 dashboard 上做的决定)。
调 log_agent_run(stage="match", summary="打分完成", detail={打分统计}).

## 4. report(复用 sync stage)
汇总本轮结果,调 log_agent_run(stage="sync", finished=true, detail={
  关键词, 来源统计(通用搜索/ATS 各查了多少家、返回多少条)、
  新增职位数、去重跳过数、match_score>=80 的数量、触发简历定制的数量、
  定制后追平 85 分的数量、top 5 候选职位列表(标题/公司/分数/一句话理由)
}). summary 字段写一段人类可读的一段话总结,这是用户在 /agent 页面看到的"本轮报告"。

## 硬性约束(任何情况下不能违反)
- 不生成任何"提交申请"的动作,不打开/填写/点击任何招聘网站的申请表单。
- 不访问需要登录态的网站(LinkedIn、SEEK 等聚合平台),不尝试绕过验证码/反爬机制。
- 简历定制只能基于真实经历重新措辞,绝不编造不存在的技能、雇主、项目或数据。
- 遇到工具调用报错(比如某个 ATS 端点挂了),记录下来继续跑完剩下的部分,不要让整轮失败。
```

## 落地状态(2026-09-20)

- **部署路径已经从 Claude Code 云端 Routine 换成自托管**：Routine（`trig_01B9dBUfxpGoLuQkhZb9a7Ui`）
  2026-09-19 那次运行被云端沙箱的出站网络策略拦在门外（`web-pink-two-30.vercel.app` 被 403 拒绝），
  排查发现 Routine 的沙箱环境默认不让访问任意外部域名。改用 [apps/agent-worker](../apps/agent-worker)——
  用 Claude Agent SDK 的 `query()`，自己托管在 Railway 上，网络策略自己说了算，不再有这层限制。
- **MCP 连接方式也因此变简单了**：Agent SDK 的 `mcpServers` 选项原生支持 `{type: "http", url, headers}`，
  不需要 claude.ai 的 `connector_uuid` 注册机制，`headers` 里直接带 `Authorization: Bearer` 就行——不再
  需要之前 Routine 上那套 Bash + curl 拼 JSON-RPC 的手动方案，工具调用现在是原生的。
- 生产 MCP 端点:`https://web-pink-two-30.vercel.app/api/mcp`，已验证 401/200 行为正常，`tools/list`
  返回全部 13 个工具。
- 触发方式：Railway 的 Cron Job 服务类型，每天 Perth 时间早上 8:00（`0 0 * * *` UTC）跑一次
  `node dist/index.js`，跑完退出，不常驻。
- ATS 公司样例名单是按"知名科技公司里常见用 Greenhouse/Lever 的"这个印象挑的起始样例，不保证
  100% 准确（公司可能换过 ATS 平台），prompt 里已经写了"先探测端点再用，404 就跳过"这条兜底逻辑，
  跑起来之后可以根据实际命中率替换成真正想覆盖的目标公司名单。
