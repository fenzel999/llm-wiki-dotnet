---
title: EF Core 关系建模
summary: 用导航属性与外键表达一对多/多对多/一对一，理解必需与可选关系及级联删除。
tags: [ef-core, relationships, 建模, 外键, navigation]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/ef/core/modeling/relationships
updated: 2026-07-10
---

## 概述

关系型数据库靠外键把表连起来，EF Core 用**导航属性 + 外键属性**把这种关系映射成对象图。三种基本关系：**一对多**（一个 `Blog` 有多篇 `Post`）、**多对多**（`Post` 与 `Tag`）、**一对一**（`User` 与 `UserProfile`）。EF Core 大多能按约定自动识别关系（属性名合规时），复杂或需精确控制时用 Fluent API 在 `OnModelCreating` 里显式配置。

还要分清关系是**必需（required）**还是**可选（optional）**：外键属性用不可空类型（`int`）表示必需、可空类型（`int?`）表示可选。这直接决定生成的列是否 `NOT NULL`，以及默认的级联删除行为。

## 正确做法

用导航属性 + 外键表达一对多，必需关系用不可空外键：

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
```

多对多 net5+ 无需显式连接实体，EF Core 自动建联结表；需要连接表带额外字段时才显式建实体：

```csharp
public class Post { public List<Tag> Tags { get; set; } = []; }
public class Tag  { public List<Post> Posts { get; set; } = []; }
```

## 常见误区

❌ 把本该必需的外键设成可空（或反之），导致数据库列可空性与业务规则不符，出现悬空数据。按业务用 `int` / `int?` 精确表达。

❌ 依赖默认级联删除却没想清后果：删一个 `Blog` 悄悄连带删掉所有 `Post`。明确用 `OnDelete(DeleteBehavior.Restrict/Cascade)` 表达意图。

❌ 多对多还在手写联结实体（net5+ 已可自动）。除非连接表要带额外列，否则直接用集合导航。

## 适用版本

关系建模各版本通用；无显式连接实体的多对多 net5+。

## 参考资料

- [迁移](migrations.md)
- [查询性能（含关联加载）](query-performance.md)
- 官方文档：[EF Core 关系](https://learn.microsoft.com/ef/core/modeling/relationships)
- 官方文档：[级联删除](https://learn.microsoft.com/ef/core/saving/cascade-delete)
