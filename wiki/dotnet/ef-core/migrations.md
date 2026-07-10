---
title: EF Core 迁移（Migrations）
summary: 用迁移把模型变更以可版本化、可回滚的方式演进数据库架构；生产用幂等脚本或 bundle 部署；与 AOT 无关（设计期工具）。
tags: [ef-core, migrations, schema]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/managing-schemas/migrations/
updated: 2026-07-11
---

# EF Core 迁移（Migrations）

> **要点速览**
> - 迁移把模型变更记录成有序、可版本化、可回滚的文件（`Up`/`Down`）。
> - 工具用官方 `dotnet ef`：`migrations add` → 本地 `database update`。
> - **生产别用 `database update`/启动自动 `Migrate()`**；用幂等脚本或迁移 bundle，在部署阶段单独执行。
> - 迁移文件与 `ModelSnapshot` 必须进 git；别改已应用过的迁移。

## 概述

实体模型变了（加字段、改类型、建关系），数据库表结构也要跟着变。EF Core 的**迁移（Migrations）**把这种变更记录成一个个有序、可版本化、可回滚的 C# 文件，让数据库架构和代码一起进版本库。每个迁移都有 `Up`（应用）与 `Down`（回滚）。

工具用微软官方的 `dotnet ef`（`dotnet tool install --global dotnet-ef`）。核心命令：`migrations add` 生成、`database update` 应用、`migrations remove` 撤销尚未应用的最后一个。

## 本地 vs 生产 部署对比

| 方式 | 适用 | 说明 |
|------|------|------|
| `database update` | 本地开发 | 直接连库应用，方便 |
| `migrations script --idempotent` | 生产 / DBA / CI | 输出幂等 SQL，可重复执行、可评审 |
| `migrations bundle` | 生产（无 SDK 环境） | 自包含可执行，持连接串即可跑（net6+） |
| 启动 `Database.Migrate()` | � 不推荐 | 多实例并发冲突、赋予应用改表高权限 |

## 正确做法

```bash
# 本地
dotnet ef migrations add AddOrderShippedDate
dotnet ef database update

# 生产：幂等脚本，交 CI/DBA 评审后执行
dotnet ef migrations script --idempotent -o migrate.sql

# 或自包含 bundle（不需 SDK）
dotnet ef migrations bundle
```

## 常见误区

❌ **生产让应用启动自动 `Database.Migrate()`**。多实例并发迁移会冲突，且赋予应用改结构的高权限有风险。生产用脚本/bundle 在部署阶段单独执行。

❌ **手改已提交、已被应用过的迁移文件**。会让各环境状态错乱；要修正就新增一个迁移。

❌ **迁移文件/ModelSnapshot 不进 git**。迁移必须随代码一起版本化，否则团队/CI 无法复现架构。

❌ **靠 `EnsureCreated()` 管生产架构**。`EnsureCreated` 删除重建、不跟踪迁移，只适合测试/原型。生产用迁移。

## 适用版本

迁移机制各版本通用；migrations bundle net6+；`dotnet-ef` 版本需与目标 EF Core 匹配。

### Native AOT 兼容性

迁移是**设计期/部署期工具**，运行期应用代码不依赖它，与 AOT **无关**（[AOT 矩阵](../aot/aot-compatibility.md)）。注意：AOT 发布的程序仍用同一 `DbContext` 模型；若运行期需 `EnsureCreated`/`Migrate`（仅测试/开发），需启用 EF 编译模型（见 [EF AOT](ef-data-access.md)），但生产建议用脚本/bundle 离线迁移。

## 参考资料

- [关系建模](modeling-relationships.md) · [查询性能](query-performance.md) · [EF AOT](ef-data-access.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[EF Core 迁移](https://learn.microsoft.com/dotnet/core/managing-schemas/migrations/) · [在生产中应用迁移](https://learn.microsoft.com/dotnet/core/managing-schemas/migrations/applying)
