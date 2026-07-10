---
title: 垂直切片架构（Vertical Slice）
summary: 系统形态之一——按功能而非技术分层组织代码；一个功能自含请求/处理/响应，改动局限切片内；AOT 友好。
tags: [architecture, vertical-slice, feature-folder]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
updated: 2026-07-11
---

# 垂直切片架构（Vertical Slice）

> **要点速览**
> - **定位**：垂直切片是**系统形态（System-Level）**层面的**代码组织方式**——决定"项目里的文件怎么分组"（见[三种架构不在同一层级](solution-structure.md#arch-levels)）。它与分层（整洁架构）正交：可以"按功能切片"同时"切片内用整洁架构分层"。
> - 按**功能**而非技术分层：一个功能所需的请求/验证/处理/响应聚在一个切片里，改功能只动一个文件夹。
> - 繁简自如：简单查询直接查库，复杂用例才在切片里加领域/应用结构。
> - 不引 MediatR（[P10](../governance/policy.md)）；直接方法调用或手写极简分发。
> - 切片间只经**明确契约**（接口/事件）通信，不互调内部逻辑。

## 概述

传统分层（Controller / Service / Repository 各一个目录）是**按技术**切分，改一个功能要跳三四个文件夹。**垂直切片（Vertical Slice）**换个轴：**按功能**切分**——"创建订单"的请求模型、验证、处理逻辑、数据访问、响应，全在一个 feature 文件夹里。每个切片自成一体，改动局限切片内，彼此低耦合。

它特别适合功能间差异大、复用少的应用：与其让所有功能共享一套僵化层抽象，不如让每个切片按需繁简。可与[整洁架构](clean-architecture.md)结合（切片内部仍可分层），也可独立。

## 正确做法

### 1. 按功能建切片

```
Features/
  Orders/
    CreateOrder.cs     // 请求、验证、处理、响应都在这里
    GetOrder.cs
  Products/
    ListProducts.cs
```

```csharp
// Features/Orders/CreateOrder.cs —— 一个切片自包含（含 CQRS 的命令处理器 + DTO）
public static class CreateOrder
{
    public record Request(string Sku, int Qty);      // 输入 DTO
    public record Response(int Id);

    public static async Task<IResult> Handle(Request req, AppDbContext db, CancellationToken ct)
    {
        if (req.Qty <= 0) return Results.BadRequest("数量必须为正");   // 边界校验
        var order = Order.Create(req.Sku, req.Qty);   // 业务规则在领域
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/orders/{order.Id}", new Response(order.Id));
    }
}

app.MapPost("/orders", CreateOrder.Handle);          // 端点就注册在切片旁
```

### 2. 共享什么？决策表

| 放哪 | 内容 | 理由 |
|------|------|------|
| 切片内 | 请求/响应模型、该功能的处理与映射 | 自包含，改动不波及别处 |
| [SharedKernel](../architecture/solution-structure.md) | 真正跨切片的工具：分页扩展、规约表达式、基础实体 | 多处复用才抽出 |
| 别共享 | 每个切片各写一个薄薄的 `Map`/验证 | 复制比抽象耦合更便宜 |

### 3. 切片间通信

切片之间**不互调内部逻辑**。需要协作时，经明确契约：调用对方面向公众的**应用服务/DTO**，或发[领域/集成事件](event-driven.md)。模块边界（见 [模块化单体](modular-monolith.md)）同理。

## 常见误区

❌ **名为切片，却强行让所有切片共享一个庞大"通用 Service 基类/仓储抽象"**，把耦合又加回来。切片尽量自包含，共享只留真正通用的（放 [SharedKernel](../architecture/solution-structure.md)）。

❌ **引入第三方中介者库（如 MediatR）做请求分发**——非微软/基金会且已商业化，按 [P10](../governance/policy.md) 不用。直接方法调用或手写极简分发器（见 [组合性](../patterns/composition.md)）。

❌ **切片间互相直接调用对方内部逻辑**，形成隐式耦合。切片间经明确契约（接口/DTO/事件）通信。

❌ **把垂直切片当"不做领域建模"的借口**。切片只是组织方式，复杂核心域的切片内部仍应用 [DDD](ddd.md)/[整洁架构](clean-architecture.md)；简单 CRUD 切片可以很薄。

## 适用版本

组织方式与版本无关；Minimal API（net6+）让切片式端点注册尤其自然；示例面向 net8+。

### Native AOT 兼容性

切片里是普通类/静态方法 + 构造注入，**AOT 安全**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。端点注册用 `MapPost("/orders", CreateOrder.Handle)`（编译期已知方法，非反射），响应 DTO 走 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）。

## 参考资料

- [整洁架构（切片内可分层）](clean-architecture.md) · [CQRS（切片内命令/查询）](cqrs.md)
- [模块化单体（模块边界 = 切片的更大粒度）](modular-monolith.md) · [解决方案分层（SharedKernel）](solution-structure.md)
- 官方文档：[常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)
