---
title: 多租户（Multi-Tenancy）
summary: 横切能力——用 EF Core 全局查询筛选器自动隔离租户数据，中间件解析租户、AsyncLocal 传递环境；手写零依赖；AOT 友好。
tags: [architecture, multi-tenancy, saas, ef-core, query-filter]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/ef/core/miscellaneous/multitenancy
updated: 2026-07-11
---

# 多租户（Multi-Tenancy）

> **要点速览**
> - **定位**：多租户是**横切能力（Cross-Cutting）**——跨整个应用的数据隔离机制（见[三种架构不在同一层级](solution-structure.md#arch-levels)）。
> - **单库共享方案（推荐起步）**：每张表加 `TenantId`，用 EF Core **全局查询筛选器**自动隔离，绝不手动逐查询 `Where`。
> - 三块拼图全部手写、零第三方（[P10](../governance/policy.md)）：**当前租户环境**（`AsyncLocal`）→ **解析中间件**（子域名/头/JWT 声明）→ **全局筛选器 + 保存钩子**。
> - 漏一处过滤 = 数据泄漏；保存时自动赋 `TenantId`。
> - 不引 Finbuckle 等多租户库。

## 概述

SaaS 的核心难题是**租户数据隔离**：客户 A 永远看不到客户 B 的数据。最省心、最不易错的做法是**单库共享 + `TenantId` 列 + EF Core 全局查询筛选器**——一次性声明"所有查询自动追加 `WHERE TenantId = 当前租户`"，开发者写普通查询即可，框架兜底隔离。手动每查询 `Where(...TenantId...)` 是灾难：漏一处就是跨租户泄漏。

### 隔离模型选型

| 模型 | 隔离强度 | 成本 | 何时 |
|------|----------|------|------|
| 单库共享（`TenantId` 列） | 逻辑隔离 | 最低 | 多数 SaaS 起步首选 |
| 单库分 schema | 中 | 中 | 需更强隔离又不愿多库 |
| 每租户独立库 | 物理隔离 | 高（连接管理复杂） | 大客户/合规强隔离 |

本文聚焦最常用、零依赖的**单库共享**方案。

## 正确做法

### 1. 三块拼图

```csharp
public sealed class CurrentTenant                       // 环境：随异步流传递
{
    private static readonly AsyncLocal<Guid?> _id = new();
    public Guid? Id { get => _id.Value; set => _id.Value = value; }
}

public class AppDbContext(DbContextOptions o, CurrentTenant tenant) : DbContext(o)
{
    protected override void OnModelCreating(ModelBuilder b)
        => b.Entity<Order>().HasQueryFilter(e => e.TenantId == tenant.Id);   // 自动隔离

    public override int SaveChanges()
    {
        foreach (var e in ChangeTracker.Entries<Order>().Where(e => e.State == EntityState.Added))
            e.Entity.TenantId = tenant.Id!.Value;        // 新实体自动打租户
        return base.SaveChanges();
    }
}

// 中间件：从子域名/头/声明解析租户，写入环境（在认证之后）
app.Use(async (ctx, next) =>
{
    ctx.RequestServices.GetRequiredService<CurrentTenant>().Id = ResolveTenant(ctx);
    await next();
});
```

### 2. 租户从哪来？决策表

| 来源 | 做法 | 注意 |
|------|------|------|
| 子域名 `acme.app.com` | 解析 Host 取前缀 | 需预先登记合法租户 |
| 请求头 `X-Tenant-Id` | 读 Header | 易伪造，须配合认证校验 |
| JWT 声明 `tid` | 从 `HttpContext.User` 读 | 最可靠（令牌由认证中间件校验过） |

> 解析出的租户应与**授权**配合：解析只确定"当前是哪个租户"，不替代[认证/授权](../dotnet/aspnet-core/auth.md)。跨租户管理操作要显式 `IgnoreQueryFilters()` 并严格鉴权。

## 常见误区

❌ **每个查询手动 `Where(x => x.TenantId == current)`**——只要一处忘写，就把别租户数据查出来。用全局查询筛选器统一兜底。

❌ **用普通静态字段/`ThreadStatic` 存当前租户**，异步 `await` 后线程切换就丢。用 `AsyncLocal`（随异步流传递）。

❌ **只过滤读取却不在写入时赋 `TenantId`**，新数据落到"无租户"或错租户。保存时统一赋值。

❌ **引入第三方多租户框架**。按 [P10](../governance/policy.md) 手写即可，核心不过百行（见上文）。

❌ **把租户解析当授权**。解析确定身份，但"这个用户能否访问该租户"仍需授权校验；否则拿到别人租户 id 就能越权。

## 适用版本

EF Core 全局查询筛选器 net(core) 全版本；`AsyncLocal` 全版本；示例面向 net8+。

### Native AOT 兼容性

多租户机制**兼容 AOT**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：`AsyncLocal`、中间件、`HasQueryFilter` 均 AOT 安全；`ResolveTenant` 用 `HttpContext`/JWT 声明读取无反射。注意租户 id 若经 JSON 序列化，响应走 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）。

## 参考资料

- [审计与软删除（同类筛选机制）](auditing-soft-delete.md) · [认证与授权](../dotnet/aspnet-core/auth.md)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[EF Core 多租户](https://learn.microsoft.com/ef/core/miscellaneous/multitenancy) · [EF Core 全局查询筛选器](https://learn.microsoft.com/ef/core/querying/filters)
