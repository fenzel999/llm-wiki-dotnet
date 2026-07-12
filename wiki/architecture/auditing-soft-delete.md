---
title: 审计与软删除（Auditing & Soft Delete）
summary: 横切能力——用 EF Core SaveChanges 拦截器统一填充审计字段与软删除标记，全局查询筛选器自动隐藏已删数据；AOT 友好。
tags: [architecture, auditing, soft-delete, ef-core, interceptor]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/ef/core/logging-events-diagnostics/interceptors
updated: 2026-07-11
---

# 审计与软删除（Auditing & Soft Delete）

> **要点速览**
> - **定位**：审计与软删除是**横切能力（Cross-Cutting）**——跨所有实体统一处理（见[三种架构不在同一层级](solution-structure.md#arch-levels)）。
> - **审计**：创建/修改时间与人，用 EF Core **`SaveChanges` 拦截器**统一填充，别每个实体手写。
> - **软删除**：不物理删，标 `IsDeleted=true`，用**全局查询筛选器**自动隐藏，保留可追溯与恢复。
> - 用标记接口（`IAuditedEntity`/`ISoftDelete`）+ 拦截器集中处理，零重复代码、零第三方（[P10](../governance/policy.md)）。
> - 软删除忘了配全局筛选 = 仍查得出"已删除"；真要物删用 `IgnoreQueryFilters` + 显式删除。

> **在体系中的位置**：第 5 步 · 按需叠加的能力。先读 [架构总览与决策指南](overview.md)；用 [EF Core](../dotnet/ef-core/ef-data-access.md) `SaveChanges` 拦截器统一填充；与 [多租户](multi-tenancy.md) 同机制（全局筛选器/拦截器）；审计接口由 [实体与聚合根](entities.md) 实现。

## 概述

两个几乎每个企业应用都要的横切能力：**审计**（谁在何时创建/修改了记录）和**软删除**（删除仅标记，数据仍在，可追溯、可恢复）。我们用 EF Core 原生机制手写实现，零第三方。

思路是"集中处理，而非散落赋值"：定义标记接口 `IAuditedEntity`、`ISoftDelete`，在 **`SaveChanges` 拦截器**（`ISaveChangesInterceptor`，或重写 `SaveChanges`）里统一读取 `ChangeTracker`——新增/修改时自动填时间戳与操作者，删除时**拦截为标记而非真删**。查询侧用**全局查询筛选器**自动追加 `WHERE IsDeleted = 0`，让已删数据默认对应用不可见。

## 正确做法

### 1. 标记接口 + 拦截器统一处理

```csharp
public interface IAuditedEntity { DateTime CreatedAt { get; set; } DateTime? ModifiedAt { get; set; } }
public interface ISoftDelete { bool IsDeleted { get; set; } }

public sealed class AuditInterceptor(IClock clock, ICurrentUser user) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData e, InterceptionResult<int> result, CancellationToken ct = default)
    {
        foreach (var entry in e.Context!.ChangeTracker.Entries())
        {
            if (entry is { Entity: IAuditedEntity a, State: EntityState.Added })   a.CreatedAt = clock.UtcNow;
            if (entry is { Entity: IAuditedEntity m, State: EntityState.Modified }) m.ModifiedAt = clock.UtcNow;
            if (entry is { Entity: ISoftDelete s, State: EntityState.Deleted })
            {
                entry.State = EntityState.Modified;   // 拦截物理删除
                s.IsDeleted = true;                    // 改为软删除
            }
        }
        return base.SavingChangesAsync(e, result, ct);
    }
}

// 注册拦截器 + 全局筛选隐藏已删
optionsBuilder.AddInterceptors(new AuditInterceptor(clock, currentUser));
modelBuilder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted);
```

### 2. 时间与人：可测、可注入

| 错误 | 正确 |
|------|------|
| `DateTime.Now`（本地时区、写死难测） | `IClock`/`TimeProvider`（net8+）注入，便于测试用假时钟 |
| 操作者用 `Environment.UserName` | 从已认证身份取（见 [auth](../dotnet/aspnet-core/auth.md)）注入 `ICurrentUser` |

```csharp
public interface IClock { DateTime UtcNow { get; } }
public sealed class SystemClock : IClock { public DateTime UtcNow => DateTime.UtcNow; }   // 生产
// 测试时用假实现替换，断言时间戳可预期（见 [测试替身](../dotnet/fundamentals/test-doubles.md)）
```

## 常见误区

❌ **每个实体、每个方法手动 `entity.CreatedAt = DateTime.Now`**——重复且必有遗漏。用拦截器集中填充。

❌ **用 `DateTime.Now`（本地时区、不可测）**。用 UTC + 可注入的 `IClock`/`TimeProvider`（net8+）便于测试。

❌ **软删除了却没配全局查询筛选器**，应用照样查得出"已删除"记录。删除标记与查询筛选必须成对出现。

❌ **需要物理删除时忘了 `IgnoreQueryFilters()`**，或误以为软删除能防真泄漏——敏感数据合规删除仍需真正清除。

❌ **审计字段用字符串硬编码用户名**，用户改名/注销后记录失真。存稳定标识（用户 id/租户 id，`AsyncLocal` 传递，见 [多租户](multi-tenancy.md)）。

## 适用版本

`ISaveChangesInterceptor` net6+；全局查询筛选器 net(core) 全版本；`TimeProvider` net8+。

### Native AOT 兼容性

拦截器与全局筛选器**兼容 AOT**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：拦截器靠 `ChangeTracker` + 标记接口，无运行期反射；`HasQueryFilter` 是编译期 Lambda。当前用户/租户经 `AsyncLocal` 或 DI 注入，AOT 安全。

## 何时使用

- 需要**统一审计字段（创建/修改人、时间）与软删除**，并让已删数据全局自动隐藏时叠加。
- 实体实现审计接口即可，拦截器统一填充，业务代码无感。

## 与其他模式的关系

- 用 [EF Core](../dotnet/ef-core/ef-data-access.md) `SaveChanges` 拦截器；与 [多租户](multi-tenancy.md) 同机制（全局筛选器/拦截器）。
- 审计接口由 [实体与聚合根](entities.md) 实现；可叠加在任意形态上。
- 见 [架构总览与决策指南](overview.md) 学习路径第 12 步。

## 参考资料

- [多租户（同类筛选机制 + AsyncLocal）](multi-tenancy.md) · [认证与授权](../dotnet/aspnet-core/auth.md)
- [测试替身（假时钟）](../dotnet/fundamentals/test-doubles.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[EF Core 拦截器](https://learn.microsoft.com/ef/core/logging-events-diagnostics/interceptors) · [EF Core 全局查询筛选器](https://learn.microsoft.com/ef/core/querying/filters)
