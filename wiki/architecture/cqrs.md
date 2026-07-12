---
title: CQRS（命令查询职责分离）
summary: 横切能力——写（命令，走领域模型）与读（查询，直投 DTO）拆分；轻量版同库分处理器，重量版仅负载极端不对称才用；AOT 友好。
tags: [architecture, cqrs, command, query]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/apply-simplified-microservice-cqrs-ddd-patterns
updated: 2026-07-11
---

# CQRS（命令查询职责分离）

> **要点速览**
> - **定位**：CQRS 是**横切能力（Cross-Cutting）**——一种把"改状态/读数据"分开组织代码的套路（见[三种架构不在同一层级](solution-structure.md#arch-levels)），它本身不是系统形态、也不是分层。
> - 核心：把**命令（写）**和**查询（读）**拆成两条独立路径，各自优化。
> - **轻量版**（最常用）：同库，命令走领域、查询直投 DTO。多数应用用这版就够。
> - **重量版**：读写分库/分存储 + 事件同步，复杂度高，仅读写负载严重不对称才值。
> - **不引 MediatR**：处理器是普通类，DI 注入直接调用（[P10](../governance/policy.md)）。

> **在体系中的位置**：第 5 步 · 按需叠加的能力。先读 [架构总览与决策指南](overview.md)；与 [垂直切片](vertical-slice.md) 契合（一个命令/查询即一个切片）；常配 [事件溯源](event-sourcing.md)；查询侧用 [规约模式](specification-pattern.md)/[DTO](dto.md)，写侧发 [领域事件](domain-events.md)。

## 概述

CQRS（Command Query Responsibility Segregation）的核心只有一句：**把"改状态的操作"（命令 Command）和"读数据的操作"（查询 Query）分成两条独立的路径**。这二者的关注点本就不同：

- **命令**关心业务规则、一致性、不变量 → 走领域模型。
- **查询**关心展示效率 → 常可绕开领域模型，直接投影成 DTO。

硬用同一套模型会互相拖累：写模型为了"一致"加的约束，会让读变慢；读为了"好看"加的字段，会污染写。分开后各自清爽。

## 正确做法

### 1. 轻量版：同库，分处理器

```csharp
// 命令：走领域模型，保证业务规则
public sealed class CreateOrderHandler(AppDbContext db)
{
    public async Task<int> Handle(CreateOrder cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.Sku, cmd.Qty);   // 领域逻辑
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return order.Id;
    }
}

// 查询：绕开领域模型，直接投影为 DTO，读得快
public sealed class GetOrderHandler(AppDbContext db)
{
    public Task<OrderDto?> Handle(int id, CancellationToken ct) => db.Orders
        .AsNoTracking()
        .Where(o => o.Id == id)
        .Select(o => new OrderDto(o.Id, o.Total))
        .FirstOrDefaultAsync(ct);
}
```

不引第三方中介库——处理器就是普通类，端点/应用服务直接注入调用（[P10](../governance/policy.md)）：`app.MapPost("/orders", (CreateOrder c, CreateOrderHandler h) => ...)`。

### 2. 重量版：读写分库（何时才上）

| 信号 | 是否值得重量版 |
|------|----------------|
| 读远多于写、且读模型需要大量 JOIN/聚合 | 可能是，读侧可用只读副本/专用读模型 |
| 写模型复杂（DDD 聚合），读模型简单（扁平 DTO） | 轻量版即可，不必分库 |
| 需要把写事件实时同步给读库/读缓存 | 引入[集成事件 + 发件箱](event-driven.md) |
| 团队小、领域不复杂 | **别上**，重量版的最终一致 + 同步是把双刃剑 |

> 注意：CQRS ≠ 事件溯源（Event Sourcing）。CQRS 只分读写路径；事件溯源是用"事件流"当写侧唯一真相来源，二者可独立选用。

### 3. 与垂直切片的关系

CQRS 常与[垂直切片](vertical-slice.md)搭配：每个"功能"自含自己的命令处理器 + 查询处理器 + DTO，而不是横向分一堆 `Command/` `Query/` 文件夹。是否分文件夹是口味问题，关键是**读写路径独立**。

## 常见误区

❌ **一上来就"读写分库 + 事件同步"的重量级 CQRS**，给简单应用背上最终一致性与同步运维。默认轻量版（同库、分处理器）。

❌ **为 CQRS 引入 MediatR 之类第三方中介库**。按 [P10](../governance/policy.md) 不用；命令/查询处理器就是普通类，直接 DI 注入调用，或手写几十行的分发器（见 [组合性](../patterns/composition.md)）。

❌ **查询路径硬套完整领域实体 + 变更跟踪**，读被写模型拖慢。查询直接投影 DTO + `AsNoTracking`（见 [EF 查询性能](../dotnet/ef-core/query-performance.md)）。

❌ **对每个 CRUD 都套 CQRS**。简单实体的读写本就同源，强分反而增加样板。CQRS 在"读写关注点明显不同"或"复杂写 + 简单读"时才划算。

❌ **以为 CQRS 必须配合事件溯源**。二者正交；很多 CQRS 实现仍用普通表存写侧状态。

## 适用版本

模式与版本无关，全版本适用；示例面向 net8+。

### Native AOT 兼容性

CQRS 处理器是普通类 + 构造注入，**AOT 安全**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。查询用 `AsNoTracking` + 投影（`Select` 到 DTO）在 AOT 下无反射问题；若读模型序列化跨进程传，响应 JSON 走 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）。

## 何时使用

- 读多写少、或读写负载不对称、读路径需独立优化/独立伸缩时 → 叠加 CQRS。
- **先轻量同库分处理器**；只有极端负载不对称才上读写分库（重量版）。
- 多数项目其实不需要 CQRS——别为"听起来高级"而引入。

## 与其他模式的关系

- 与 [垂直切片](vertical-slice.md) 天然契合（一个命令/查询即一个切片）。
- 常配合 [事件溯源](event-sourcing.md)（事件流即写模型）；查询侧用 [规约模式](specification-pattern.md)/[DTO](dto.md)。
- 写侧发 [领域事件](domain-events.md)，可升级为 [事件驱动](event-driven.md) 集成事件。
- 见 [架构总览与决策指南](overview.md) 学习路径第 7 步。

## 参考资料

- [垂直切片](vertical-slice.md) · [领域驱动设计](ddd.md) · [领域事件](domain-events.md)
- [EF Core 查询性能](../dotnet/ef-core/query-performance.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[简化的 CQRS 与 DDD 模式](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/apply-simplified-microservice-cqrs-ddd-patterns)
