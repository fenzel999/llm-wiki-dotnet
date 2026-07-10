---
title: EF Core vs 原生 ADO.NET
summary: ORM 的开发效率 vs 手写 SQL 的极致控制；按场景选，二者可在同一项目共存。
tags: [ef-core, ado-net, orm, sql]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/framework/data/adonet/
updated: 2026-07-10
---

> **要点速览**
> - 两条路都只用微软官方组件：EF Core（ORM）与原生 ADO.NET（手写 SQL）。
> - **默认 EF Core**；仅热路径/复杂查询/批处理才下沉 ADO.NET。
> - 需原生 SQL 时优先用 EF 的 `FromSql`（参数化），不必真退回裸 ADO.NET。
> - 不引第三方微型 ORM（如 Dapper，不属 MS/基金会）。

## 概述

数据访问有两条路，且都只依赖微软官方组件（[POLICY P10](../governance/policy.md)）：**EF Core** 是官方 ORM，把表映射成对象、自动生成 SQL、管理变更跟踪与迁移；**原生 ADO.NET**（`Microsoft.Data.SqlClient` 等）让你直接写 SQL、用 `DbConnection`/`DbCommand`/`DbDataReader` 手动读结果，控制到极致但样板代码多。

结论先行：**绝大多数业务代码用 EF Core**，开发效率与可维护性远胜手写；只有在**极致性能的热路径**、**复杂到 ORM 难以表达的查询**、或**批量/报表**场景，才下沉到原生 ADO.NET。而且二者可共存——EF Core 本身也支持 `FromSql`/`ExecuteSql` 写原生 SQL，往往不必真的退回裸 ADO.NET。

## 对比

| 维度 | EF Core（ORM） | 原生 ADO.NET |
|------|----------------|--------------|
| 开发效率 | 高：LINQ 查询、自动映射、迁移 | 低：手写 SQL 与手动物化 |
| 控制力 | 生成 SQL，偶需调优 | 完全掌控每一条 SQL |
| 变更跟踪 | 内置，自动 `SaveChanges` | 无，全手动 |
| 迁移/建模 | 内置迁移 | 无，自行管理架构 |
| 学习/维护 | 概念多但生态成熟 | 概念少但样板多 |
| 极限性能 | 很好（可调优） | 略高（无抽象开销） |
| 适用 | 绝大多数业务 CRUD | 热路径、复杂查询、批处理 |

## 正确做法

默认 EF Core；确需原生 SQL 时，优先用 EF Core 的原生 SQL 通道，而不是另起一套 ADO.NET：

```csharp
var top = await db.Orders
    .FromSql($"SELECT * FROM Orders WHERE Total > {min}")   // 参数化，防注入
    .AsNoTracking()
    .ToListAsync();
```

## 常见误区

❌ 因"听说 ORM 慢"就全项目手写 ADO.NET，换来海量样板与易错的手动映射。先用 EF Core，实测出瓶颈再局部下沉。

❌ 用字符串拼接 SQL 拼进用户输入，导致 SQL 注入。无论 EF `FromSql` 还是 ADO.NET，都用参数化。

❌ 引入第三方微型 ORM（如 Dapper）——它不属于微软/基金会，按 P10 不采用；需要手写 SQL 就用 EF `FromSql` 或原生 ADO.NET。

## 适用版本

EF Core 与 ADO.NET 各受支持版本通用；`FromSql`（插值重载）net7+，旧版用 `FromSqlInterpolated`。

## 参考资料

- [EF Core 查询性能](../dotnet/ef-core/query-performance.md)
- [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- 官方文档：[ADO.NET 概述](https://learn.microsoft.com/dotnet/framework/data/adonet/)
- 官方文档：[EF Core 原生 SQL 查询](https://learn.microsoft.com/ef/core/querying/sql-queries)
