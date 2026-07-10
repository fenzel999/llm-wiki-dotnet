---
title: 架构决策记录 (ADR)
summary: ADR 模板、编写规范、存储位置、审批流程、废弃/替代机制；每个重大架构决策必须留痕。
tags: [architecture, adr, decision-record, governance]
introduced-in: general
applies-to: [all]
status: stable
source: https://adr.github.io/
updated: 2026-07-11
---

# 架构决策记录 (ADR)

> **要点速览**
> - 每个**重大架构决策**必须写 ADR：技术选型、架构风格、跨团队接口、数据模型、基础设施选型。
> - 格式：Markdown + YAML Frontmatter；存放 `architecture/adr/` 目录；编号 `ADR-0001`、`ADR-0002`...
> - 状态：`Proposed` → `Accepted` / `Rejected` / `Superseded` → `Deprecated`
> - 审批：架构组 + 相关 Tech Lead 签字；`Superseded` 需链接新 ADR。

## 概述

**架构决策记录** 是捕获“为何做此决策、考虑了什么替代方案、后果是什么”的轻量级文档。它不是设计文档，而是**决策留痕**，便于：

- 新成员快速理解“为什么这么做”
- 避免重复讨论已决事项
- 回溯决策上下文，评估是否需要推翻

## ADR 结构模板

```markdown
---
title: ADR-0001: 采用 Minimal API 作为唯一 Web 框架
status: Accepted
date: 2026-07-11
deciders: [架构组, Web Tech Lead]
consulted: [Backend Lead, DevOps Lead]
tags: [web-framework, minimal-api, aot]
---

# 背景与问题

我们需要统一 Web 框架，支持 Native AOT、零反射、高性能、低样板代码。候选：Minimal API、MVC、gRPC、GraphQL。

# 决策

采用 **Minimal API** 作为唯一 Web 框架；禁用 MVC/Controller。

# 替代方案

| 方案 | 优点 | 缺点 | 决定 |
|------|------|------|------|
| Minimal API | AOT 原生、零反射、性能强、样板少 | 团队需学习 | ✅ 接受 |
| MVC/Controller | 成熟、生态丰富 | 不支持 AOT、反射重、样板多 | ❌ 拒绝 |
| gRPC | 内部高性能 | 外部 API 需 Gateway、学习曲线 | 仅内部服务间 |
| GraphQL | 灵活查询 | 复杂、N+1、AOT 难 | ❌ 拒绝 |

# 后果

**正面**：AOT 兼容、启动快、二进制小、性能基线高。**负面**：团队需适应 Minimal API 写法；OpenAPI 文档需源生成器。**风险**：旧 MVC 代码迁移成本；缓解：分模块渐进迁移，新模块强制 Minimal API。

# 执行计划

1. 新模块强制 Minimal API（代码审查强制）
2. 存量 MVC 模块按优先级渐进迁移（Q3 完成核心模块）
3. 培训：内部 Workshop 2 场，文档落库

# 相关 ADR

- ADR-0002: 采用 EF Core 编译模型 + 预编译查询 (AOT)
- ADR-0003: 统一 JWT Bearer 认证，禁用 Cookie/OIDC (AOT)
```

## ADR 生命周期

```
Proposed → (评审) → Accepted / Rejected
Accepted → (时间推移/技术变更) → Superseded (by ADR-xxxx)
Superseded → (彻底废弃) → Deprecated
```

| 状态 | 含义 | 后续动作 |
|------|------|----------|
| `Proposed` | 草案，待评审 | 发起评审会，收集反馈 |
| `Accepted` | 正式生效 | 执行计划落地，代码审查强制 |
| `Rejected` | 不采纳 | 记录原因，归档 |
| `Superseded` | 被新 ADR 替代 | 标注 `Superseded by ADR-xxxx`，保留历史 |
| `Deprecated` | 彻底废弃 | 不再参考，仅史料 |

## 存储与命名

```
wiki/architecture/adr/
├── ADR-0001-minimal-api-framework.md
├── ADR-0002-ef-core-aot-compiled-model.md
├── ADR-0003-jwt-bearer-auth.md
├── ADR-0004-modular-monolith-vs-microservices.md
└── README.md  # 索引表
```

命名：`ADR-<4位编号>-<kebab-case主题>.md`

## 评审流程

1. **起草**：发起人写草案，提交 PR 到 `architecture/adr/`
2. **评审**：架构组 + 相关 Tech Lead 审阅，提出问题/替代方案
3. **决策**：达成共识 → `Accepted`；分歧大 → 延期或 `Rejected`
4. **合并**：合并 PR，状态改 `Accepted`，编号固定
5. **同步**：更新 `architecture/adr/README.md` 索引表

## 索引表示例

| 编号 | 标题 | 状态 | 日期 | 决策者 | 关联 |
|------|------|------|------|--------|------|
| ADR-0001 | 采用 Minimal API 唯一 Web 框架 | Accepted | 2026-07-11 | 架构组 | — |
| ADR-0002 | EF Core 编译模型 + 预编译查询 (AOT) | Accepted | 2026-07-11 | 数据架构 | ADR-0001 |
| ADR-0003 | 统一 JWT Bearer，禁用 Cookie/OIDC | Accepted | 2026-07-11 | 安全组 | ADR-0001 |
| ADR-0004 | 模块化单体优先，微服务按需拆分 | Accepted | 2026-07-11 | 架构组 | ADR-0001 |

## 与治理规则的关系

| 政策 | ADR 要求 |
|------|----------|
| **P10/P12** 厂商中立 | 选型 ADR 必须列出“无厂商锁定”作为评估维度 |
| **P16** 后端严格 AOT | 涉及框架/库选型的 ADR 必须给出 AOT 兼容性结论 |
| **P17** 深度完整 | ADR 必须含“替代方案对比表”“后果分析”“执行计划” |
| **铁律 4/5/6** | 新 ADR 必进 `index.md`、`思维导图.md`、`log.md` |

## 常见误区

❌ **把设计文档当 ADR** —— ADR 只记“决策+理由”，不写详细设计（设计文档另存）  
❌ **事后补 ADR** —— 决策前必须有 ADR，事后补记失去“决策时上下文”  
❌ **无替代方案对比** —— 必须列出至少 2 个备选，否则不是决策是默认  
❌ **不写后果/风险** —— 必须写正面/负面/风险/缓解，否则无法事后复盘  

## 参考资料
- [ADR GitHub 组织](https://adr.github.io/) —— 标准化倡议
- [Michael Nygard: Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [架构治理 P10-P17](../governance/policy.md) · [架构分类](enterprise-patterns.md) · [日志](../log.md)
