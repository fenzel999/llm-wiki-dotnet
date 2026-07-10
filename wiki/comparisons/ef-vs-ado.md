---
title: EF Core vs 原生 ADO.NET
summary: 数据访问选型——ORM 的开发效率 vs 手写 SQL 的极致控制；默认 EF Core，热路径/复杂查询/批处理再下沉；不引第三方微型 ORM。
tags: [ef-core, ado-net, orm, sql]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/framework/data/adonet/
updated: 2026-07-11
---

# EF Core vs 原生 ADO.NET

> **要点速览**
> - 两条路都只用微软官方组件（[POLICY P10](../governance/policy.md)）：**EF Core**（ORM）与**原生 ADO.NET**（`Microsoft.Data.SqlClient`，手写 SQL）。
> - **默认 EF Core**；仅热路径/复杂查询/批处理才下沉 ADO.NET。
> - 需原生 SQL 时优先用 EF 的 `FromSql`（参数化），往往不必真退回裸 ADO.NET。
> - 不引第三方微型 ORM（如 Dapper，不属 MS/基金会）。
> - 二者可在同一项目共存，按"路径"而非"全有全无"选择。

## 概述

数据访问有两条路，且都只依赖微软官方组件：**EF Core** 把表映射成对象、自动生成 SQL、管理变更跟踪与迁移；**原生 ADO.NET**（`Microsoft.Data.SqlClient` 等）让你直接写 SQL、用 `DbConnection`/`DbCommand`/`DbDataReader` 手动读结果，控制到极致但样板多。

结论先行：**绝大多数业务代码用 EF Core**，开发效率与可维护性远胜手写；只有在**极致性能的热路径**、**复杂到 ORM 难以表达的查询**、或**批量/报表**场景，才下沉到原生 ADO.NET。而且二者可共存——EF Core 本身支持 `FromSql`/`ExecuteSql` 写原生 SQL，往往不必真的退回裸 ADO.NET。

## 对比表

| 维度 | EF Core（ORM） | 原生 ADO.NET |
|------|----------------|--------------|
| 开发效率 | 高：LINQ 查询、自动映射、迁移 | 低：手写 SQL 与手动物化 |
| 控制力 | 生成 SQL，偶需调优 | 完全掌控每一条 SQL |
| 变更跟踪 | 内置，自动 `SaveChanges` | 无，全手动 |
| 迁移/建模 | 内置迁移 | 无，自行管理架构 |
| 极限性能 | 很好（可调优） | 略高（无抽象开销） |
| 适用 | 绝大多数业务 CRUD | 热路径、复杂查询、批处理 |

## 正确做法

### 1. 默认 EF Core

普通 CRUD 用 LINQ + 投影，零样板（见 [EF 数据访问](../dotnet/ef-core/ef-data-access.md)）。

### 2. 需要原生 SQL：先用 EF 通道

```csharp
var top = await db.Orders
    .FromSql($"SELECT * FROM Orders WHERE Total > {min}")   // 插值 = 参数化，防注入
    .AsNoTracking()
    .ToListAsync();
```

### 3. 何时才真下沉 ADO.NET？决策表

| 场景 | 选 | 理由 |
|------|----|------|
| 一般 CRUD / 领域建模 | EF Core | 开发效率、迁移、跟踪 |
| 复杂报表/分析 SQL | EF `FromSql` | 仍用同一 `DbContext`、免样板 |
| 大批量写入（百万行） | 原生 ADO.NET `SqlBulkCopy` | EF 逐行跟踪开销大 |
| 极热读数路径、毫秒必争 | 原生 ADO.NET + 池化 | 去掉 ORM 抽象开销 |
| 调优特定执行计划 | 原生 ADO.NET | 完全掌控 SQL 文本 |

### 4. 真用 ADO.NET 的写法（参数化）

```csharp
await using var conn = new SqlConnection(connStr);
await conn.OpenAsync();
await using var cmd = new SqlCommand("SELECT Id, Total FROM Orders WHERE Total > @min", conn);
cmd.Parameters.Add(new SqlParameter("@min", min));      // 参数化，防注入
await using var r = await cmd.ExecuteReaderAsync();
while (await r.ReadAsync())
    yield return new OrderDto(r.GetInt32(0), r.GetDecimal(1));
```

## 常见误区

❌ **因"听说 ORM 慢"就全项目手写 ADO.NET**，换来海量样板与易错的手动映射。先用 EF Core，实测出瓶颈再局部下沉。

❌ **用字符串拼接 SQL 拼进用户输入**，导致 SQL 注入。无论 EF `FromSql` 还是 ADO.NET，都用参数化（`{min}` 插值 / `SqlParameter`）。

❌ **引入第三方微型 ORM（如 Dapper）**——它不属于微软/基金会，按 [P10](../governance/policy.md) 不采用；需要手写 SQL 就用 EF `FromSql` 或原生 ADO.NET。

❌ **为"统一"把整库强制成一种**。EF Core 与 ADO.NET 可共存，按路径选型最划算。

## 适用版本

EF Core 与 ADO.NET 各受支持版本通用；`FromSql`（插值重载）net7+，旧版用 `FromSqlInterpolated`。

### Native AOT 兼容性

- **EF Core**：需启用编译模型/预编译查询（见 [EF AOT](../dotnet/ef-core/ef-data-access.md) + [AOT 矩阵](../dotnet/aot/aot-compatibility.md)），否则运行期建模型有反射。
- **原生 ADO.NET**：纯 ADO.NET 代码（连接/命令/读取器）无运行期反射，**AOT 安全**；注意结果物化需手写（无源生成 DTO 映射），DTO 序列化走 `System.Text.Json` 源生成（见 [序列化](../dotnet/csharp/serialization.md)）。

## 参考资料

- [EF Core 查询性能](../dotnet/ef-core/query-performance.md) · [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md) · [序列化（源生成）](../dotnet/csharp/serialization.md)
- 官方文档：[ADO.NET 概述](https://learn.microsoft.com/dotnet/framework/data/adonet/) · [EF Core 原生 SQL 查询](https://learn.microsoft.com/ef/core/querying/sql-queries)
