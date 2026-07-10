---
title: 垂直切片架构（Vertical Slice）
summary: 按功能而非技术分层组织代码，一个功能的请求/处理/响应聚在一个切片里，降低跨层跳转。
tags: [architecture, vertical-slice, feature-folder]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
updated: 2026-07-10
---

> **要点速览**
> - 按**功能**而非技术分层组织：一个功能的请求/验证/处理/响应聚在一个切片里。
> - 改动局限在切片内，切片间低耦合；简繁自如（简单查询直查、复杂用例才加结构）。
> - 不引第三方中介库（如 MediatR）；直接方法调用或手写极简分发。
> - 切片间通信走明确契约（接口/事件），别互调内部逻辑。

## 概述

传统分层（Controller / Service / Repository 各一个文件夹）是**按技术**切分，改一个功能往往要在三四个文件夹间来回跳。**垂直切片（Vertical Slice）**换个思路：**按功能**切分——"创建订单"这个功能所需的请求模型、处理逻辑、验证、数据访问、响应，全都放在同一个 feature 文件夹里。每个切片自成一体，改动局限在切片内，彼此低耦合。

它特别适合功能之间差异大、复用少的应用：与其强行让所有功能共享一套僵化的层抽象，不如让每个切片按自己的需要繁简自如——简单查询就直接查库，复杂用例才引入更多结构。可与[整洁架构](clean-architecture.md)结合（切片内部仍可分领域/基础设施），也可独立使用。

## 正确做法

按功能建文件夹，每个功能一个自包含的端点 + 处理逻辑（不依赖第三方中介库，直接调用即可）：

```
Features/
  Orders/
    CreateOrder.cs      // 请求、验证、处理、响应都在这里
    GetOrder.cs
  Products/
    ListProducts.cs
```

```csharp
// Features/Orders/CreateOrder.cs —— 一个切片自包含
public static class CreateOrder
{
    public record Request(string Sku, int Qty);

    public static async Task<IResult> Handle(Request req, AppDbContext db)
    {
        if (req.Qty <= 0) return Results.BadRequest();     // 验证
        var order = new Order(req.Sku, req.Qty);
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return Results.Created($"/orders/{order.Id}", order.Id);
    }
}

app.MapPost("/orders", CreateOrder.Handle);   // 端点就在切片旁注册
```

## 常见误区

❌ 名为垂直切片，却又强行让所有切片共享一个庞大的"通用 Service 基类/仓储抽象"，把耦合又加回来。切片应尽量自包含，共享只留真正通用的东西。

❌ 引入第三方中介者库（如 MediatR）来做请求分发——它不属于微软/基金会（且已商业化），按 [P10](../governance/policy.md) 不用。直接方法调用或手写极简分发器即可。

❌ 切片之间互相直接调用对方内部逻辑，形成隐式耦合。切片间通信应经明确契约（接口/事件）。

## 适用版本

组织方式与版本无关；最小 API（net6+）让切片式端点注册尤其自然。

## 参考资料

- [整洁架构](clean-architecture.md)
- [CQRS](cqrs.md)
- 官方文档：[常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)
