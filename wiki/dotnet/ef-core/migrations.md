---
title: EF Core 迁移（Migrations）
summary: 用迁移把模型变更以可版本化、可回滚的方式演进数据库架构，生产用脚本或 bundle 部署。
tags: [ef-core, migrations, 数据库, schema]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/ef/core/managing-schemas/migrations/
updated: 2026-07-10
---

> **要点速览**
> - 迁移把模型变更记录成有序、可版本化、可回滚的文件（`Up`/`Down`）。
> - 工具用官方 `dotnet ef`：`migrations add` → `database update`（本地）。
> - **生产别用 `database update`/启动自动 `Migrate()`**；用幂等脚本或迁移 bundle。
> - 迁移文件与 `ModelSnapshot` 必须进 git；别改已应用过的迁移。

## 概述

当你的 C# 实体模型变了（加字段、改类型、建关系），数据库表结构也得跟着变。EF Core 的**迁移（Migrations）**就是把这种变更记录成一个个有序、可版本化、可回滚的 C# 迁移文件，让数据库架构和代码一起进版本库、一起演进。每个迁移都有 `Up`（应用变更）和 `Down`（回滚变更）两个方向。

工具用微软官方的 `dotnet ef`（`dotnet tool install --global dotnet-ef`）或 Package Manager Console。核心命令三件套：`migrations add` 生成迁移、`database update` 应用到库、`migrations remove` 撤销尚未应用的最后一个迁移。

## 正确做法

每次模型变更后新增一个命名清晰的迁移，本地开发用 `database update` 应用：

```bash
dotnet ef migrations add AddOrderShippedDate
dotnet ef database update
```

**生产环境不要直接 `database update`**（它需要运行期数据库权限且不可控）。改为生成幂等 SQL 脚本交由 DBA/CI 执行，或生成自包含的迁移 bundle：

```bash
dotnet ef migrations script --idempotent -o migrate.sql   # 幂等脚本，可安全重复执行
dotnet ef migrations bundle                                 # 生成可执行的迁移 bundle
```

## 常见误区

❌ 生产环境让应用启动时自动 `Database.Migrate()`。多实例并发迁移会冲突，且赋予应用改结构的高权限有风险。生产用脚本/bundle 在部署阶段单独执行。

❌ 手改已经提交、已被别人应用过的迁移文件。这会让各环境状态错乱。要修正就新增一个迁移。

❌ 把迁移文件排除在版本库外或不提交 `ModelSnapshot`。迁移必须随代码一起进 git，否则团队/CI 无法复现架构。

## 适用版本

迁移机制各受支持版本通用；迁移 bundle net6+；EF Core 版本需与目标 .NET 匹配。

## 参考资料

- [关系建模](modeling-relationships.md)
- [查询性能](query-performance.md)
- 官方文档：[EF Core 迁移](https://learn.microsoft.com/ef/core/managing-schemas/migrations/)
- 官方文档：[在生产中应用迁移](https://learn.microsoft.com/ef/core/managing-schemas/migrations/applying)
