---
title: 多租户（Multi-Tenancy）
summary: 用 EF Core 全局查询筛选器自动隔离租户数据，中间件解析当前租户，AsyncLocal 传递环境；手写零依赖。
tags: [architecture, multi-tenancy, saas, ef-core, query-filter]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/ef/core/miscellaneous/multitenancy
updated: 2026-07-10
---

# 多租户

> **要点速览**
> - 单库共享方案：每张表加 `TenantId`，用 EF Core **全局查询筛选器**自动隔离，绝不手动逐查询 `Where`。
> - 中间件从请求（子域名/头/令牌声明）解析当前租户，存入 `AsyncLocal` 环境供全局筛选读取。
> - 保存时自动给新实体赋当前 `TenantId`；漏一处过滤 = 数据泄漏。
> - 手写实现，不引第三方多租户库（如 Finbuckle）。

## 概述

SaaS 应用的核心难题是**租户数据隔离**：客户 A 永远不能看到客户 B 的数据。最省心、最不易出错的做法是**单库共享 + `TenantId` 列 + EF Core 全局查询筛选器**——一次性声明"所有查询自动追加 `WHERE TenantId = 当前租户`"，开发者写普通查询即可，框架自动隔离。手动在每个查询里 `Where(x => x.TenantId == ...)` 是灾难：漏掉一处就是一次跨租户数据泄漏。

三块拼图，全部手写、零第三方（[P10](../governance/policy.md)）：**当前租户环境**（`AsyncLocal` 承载，随异步流传递）、**租户解析中间件**（从子域名/请求头/JWT 声明识别租户）、**全局查询筛选器 + 保存钩子**（自动过滤 + 自动赋值）。

## 正确做法

用 `AsyncLocal` 存当前租户，`DbContext` 声明全局筛选器并在保存时赋值：

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

// 中间件：从子域名/头/声明解析租户，写入环境
app.Use(async (ctx, next) =>
{
    ctx.RequestServices.GetRequiredService<CurrentTenant>().Id = ResolveTenant(ctx);
    await next();
});
```

## 常见误区

❌ 每个查询手动 `Where(x => x.TenantId == current)`——只要有一处忘写，就把别的租户数据查了出来。用全局查询筛选器统一兜底。

❌ 用普通静态字段/`ThreadStatic` 存当前租户，异步 `await` 后线程切换就丢了。用 `AsyncLocal`。

❌ 只过滤读取却不在写入时赋 `TenantId`，新数据落到"无租户"或错租户。保存时统一赋值。

❌ 引入第三方多租户框架。按 P10 手写即可，核心不过百行。跨租户管理操作要显式 `IgnoreQueryFilters()` 并严格鉴权。

## 适用版本

EF Core 全局查询筛选器 net(core) 全版本；`AsyncLocal` 全版本。示例面向 net8+。

## 参考资料

- [审计与软删除（同类筛选机制）](auditing-soft-delete.md)
- [认证与授权](../dotnet/aspnet-core/auth.md)
- 官方文档：[EF Core 多租户](https://learn.microsoft.com/ef/core/miscellaneous/multitenancy) · [EF Core 全局查询筛选器](https://learn.microsoft.com/ef/core/querying/filters)
