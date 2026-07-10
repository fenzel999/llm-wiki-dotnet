---
title: 审计与软删除（Auditing & Soft Delete）
summary: 用 EF Core SaveChanges 拦截器统一填充审计字段与软删除标记，全局查询筛选器自动隐藏已删数据。
tags: [architecture, auditing, soft-delete, ef-core, interceptor]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://abp.io/docs/latest/framework/infrastructure/audit-logging
updated: 2026-07-10
---

# 审计与软删除

> **要点速览**
> - 审计字段（创建/修改时间与人）用 EF Core **`SaveChanges` 拦截器**统一填充，别每个实体手写。
> - 软删除：不物理删，标 `IsDeleted=true`，用**全局查询筛选器**自动隐藏，保留可追溯与恢复。
> - 用标记接口（`IAuditedEntity`/`ISoftDelete`）识别，拦截器集中处理，零重复代码。
> - 软删除忘了配全局筛选 = 查得出"已删除"数据；真要物删用 `IgnoreQueryFilters` + 显式删除。

## 概述

两个几乎每个企业应用都要的横切能力：**审计**（谁在何时创建/修改了记录）和**软删除**（删除只是标记，数据仍在，可追溯、可恢复）。ABP 把它们做成了内置能力；我们用 EF Core 原生机制手写实现，零第三方（[P10](../governance/policy.md)）。

思路是"集中处理，而非散落赋值"：定义标记接口 `IAuditedEntity`、`ISoftDelete`，在 **`SaveChanges` 拦截器**（`ISaveChangesInterceptor`，或重写 `SaveChanges`）里统一读取 `ChangeTracker`——新增/修改时自动填时间戳与操作者，删除时**拦截为标记而非真删**。查询侧用**全局查询筛选器**自动追加 `WHERE IsDeleted = 0`，让已删数据默认对应用不可见。

## 正确做法

标记接口 + 拦截器统一处理增改删，全局筛选隐藏已删：

```csharp
public interface IAuditedEntity { DateTime CreatedAt { get; set; } DateTime? ModifiedAt { get; set; } }
public interface ISoftDelete { bool IsDeleted { get; set; } }

public class AuditInterceptor(IClock clock) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData e, InterceptionResult<int> result, CancellationToken ct = default)
    {
        foreach (var entry in e.Context!.ChangeTracker.Entries())
        {
            if (entry is { Entity: IAuditedEntity a, State: EntityState.Added })  a.CreatedAt = clock.UtcNow;
            if (entry is { Entity: IAuditedEntity m, State: EntityState.Modified }) m.ModifiedAt = clock.UtcNow;
            if (entry is { Entity: ISoftDelete s, State: EntityState.Deleted })
            {
                entry.State = EntityState.Modified;      // 拦截物理删除
                s.IsDeleted = true;                      // 改为软删除
            }
        }
        return base.SavingChangesAsync(e, result, ct);
    }
}

// DbContext 注册拦截器 + 全局筛选隐藏已删
optionsBuilder.AddInterceptors(new AuditInterceptor(clock));
modelBuilder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted);
```

## 常见误区

❌ 每个实体、每个方法里手动 `entity.CreatedAt = DateTime.Now`，重复且必有遗漏。用拦截器集中填充。

❌ 用 `DateTime.Now`（本地时区、不可测）。用 UTC + 可注入的 `IClock`/`TimeProvider`（net8+）便于测试。

❌ 软删除了却没配全局查询筛选器，应用照样查得出"已删除"记录。删除标记与查询筛选必须成对出现。

❌ 需要物理删除时忘了 `IgnoreQueryFilters()`，或误以为软删除能防真泄漏——敏感数据的合规删除仍需真正清除。

## 适用版本

`ISaveChangesInterceptor` net6+；全局查询筛选器 net(core) 全版本；`TimeProvider` net8+。

## 参考资料

- [多租户（同类筛选机制）](multi-tenancy.md)
- [EF Core 关系建模](../dotnet/ef-core/modeling-relationships.md)
- ABP 官方（思想来源）：[Audit Logging](https://abp.io/docs/latest/framework/infrastructure/audit-logging) · [Data Filtering](https://abp.io/docs/latest/framework/infrastructure/data-filtering)
- 官方文档：[EF Core 拦截器](https://learn.microsoft.com/ef/core/logging-events-diagnostics/interceptors)
