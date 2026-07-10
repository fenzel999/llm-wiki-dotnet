---
title: EF Core 关系建模
summary: 用导航属性与外键表达一对多/多对多/一对一；必需 vs 可选决定可空性与级联；明确 OnDelete；AOT 需编译模型。
tags: [ef-core, relationships, navigation]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/modeling/relationships
updated: 2026-07-11
---

# EF Core 关系建模

> **要点速览**
> - 用导航属性 + 外键映射一对多/多对多/一对一，多数按约定自动识别。
> - 外键**不可空=必需**、**可空=可选**，直接决定列可空性与级联行为。
> - 多对多 net5+ 无需显式连接实体（除非连接表带额外列）。
> - 明确设 `OnDelete(...)` 表达级联意图，别依赖默认悄悄连删。

## 概述

关系型数据库靠外键连表，EF Core 用**导航属性 + 外键属性**映射成对象图。三种基本关系：**一对多**（`Blog`→`Post`）、**多对多**（`Post`↔`Tag`）、**一对一**（`User`↔`UserProfile`）。多数关系按约定自动识别；需精确控制时用 Fluent API 在 `OnModelCreating` 显式配置。

还要分清**必需（required）**与**可选（optional）**：外键用不可空类型（`int`）表示必需、可空（`int?`）表示可选——直接决定列是否 `NOT NULL` 与默认级联删除行为。

## 关系类型与建模

| 关系 | 导航写法 | 连接表 |
|------|----------|--------|
| 一对多 | 一侧集合 + 一侧引用 + 外键 | 无（外键在"多"侧） |
| 一对一 | 两侧各一个引用 + 唯一外键 | 无 |
| 多对多（net5+） | 两侧各一个集合 | EF 自动建联结表 |
| 多对多（带额外列） | 显式联结实体 | 手动 |

## 正确做法

```csharp
public class Blog
{
    public int Id { get; set; }
    public List<Post> Posts { get; set; } = [];   // 一对多：集合导航
}
public class Post
{
    public int Id { get; set; }
    public int BlogId { get; set; }               // 外键（不可空 = 必需）
    public Blog Blog { get; set; } = null!;       // 反向引用导航
}

// 多对多 net5+：无需显式连接实体
public class Post { public List<Tag> Tags { get; set; } = []; }
public class Tag  { public List<Post> Posts { get; set; } = []; }
```

级联行为用 Fluent API 显式声明，不靠默认：

```csharp
modelBuilder.Entity<Post>()
    .HasOne(p => p.Blog)
    .WithMany(b => b.Posts)
    .HasForeignKey(p => p.BlogId)
    .OnDelete(DeleteBehavior.Restrict);   // 明确：禁止级联，避免误删
```

## 常见误区

❌ **本该必需的外键设成可空（或反之）**，导致列可空性与业务规则不符、出现悬空数据。按业务用 `int`/`int?` 精确表达。

❌ **依赖默认级联删除却没想清后果**：删 `Blog` 悄悄连带删所有 `Post`。用 `OnDelete(DeleteBehavior.Restrict/Cascade)` 明确意图。

❌ **多对多还手写联结实体**（net5+ 已可自动）。除非连接表要带额外列，否则直接用集合导航。

❌ **用 `DeleteBehavior.SetNull` 但外键不可空**，迁移/运行期冲突。不可空外键配 `Restrict`/`Cascade`，可选关系才用 `SetNull`。

## 适用版本

关系建模各版本通用；无显式连接实体的多对多 net5+。

### Native AOT 兼容性

关系映射本身是模型定义，运行期不反射；但 **AOT 下 EF 需在编译期生成模型**。启用**编译模型（`EF Core Compile Models`/`dotnet ef dbcontext optimize`）**后，关系配置在 AOT 发布中可用（见 [EF AOT](ef-data-access.md) + [AOT 矩阵](../aot/aot-compatibility.md)）。Fluent API 无运行期反射。

## 参考资料

- [迁移](migrations.md) · [查询性能（关联加载）](query-performance.md) · [EF AOT](ef-data-access.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[EF Core 关系](https://learn.microsoft.com/dotnet/core/modeling/relationships) · [级联删除](https://learn.microsoft.com/dotnet/core/saving/cascade-delete)
