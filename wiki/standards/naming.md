---
title: 命名规范
summary: 类型/方法用 PascalCase，私有字段用 _camel，接口 I 前缀，常量全大写下划线。
tags: [standard, naming]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 规则

- 类型（class/struct/interface/enum）、方法、属性、事件、公共字段使用 **PascalCase**（首字母大写）。
- 局部变量、方法参数使用 **camelCase**（首字母小写）。
- 私有实例字段使用 `_camelCase`（下划线前缀 + camelCase）。
- 接口以 **I** 前缀开头，后接 PascalCase 名词（如 `IOrderService`）。
- 常量（`const`）、`static readonly` 的编译期常量使用 **全大写下划线**（如 `MAX_RETRY_COUNT`）。
- 避免使用匈牙利命名法（如 `strName`、`iCount`）和无意义的缩写（如 `Mgr`、`Calc` 视情况而定，优先写全 `Manager`、`Calculate`）。
- 命名空间使用 `PascalCase`，通常为 `Company.Product.Feature` 形式。

## 正确做法

```csharp
namespace Contoso.Ordering;

public interface IOrderService
{
    Task<Order?> GetByIdAsync(OrderId id, CancellationToken cancellationToken);
}

public class OrderProcessor
{
    private readonly IOrderService _orderService;
    private const int MaxRetryCount = 3;

    public OrderProcessor(IOrderService orderService)
    {
        _orderService = orderService;
    }

    public async Task ProcessAsync(Order order, CancellationToken cancellationToken)
    {
        var retryCount = 0;
        // ...
    }
}
```

```csharp
// 常量的全大写下划线写法
public static class Limits
{
    public const int MAX_BATCH_SIZE = 1000;
    public const string DEFAULT_CULTURE = "zh-CN";
}
```

## 反例

```csharp
// 错误：匈牙利前缀、缩写、字段命名混乱
public class clsOrder
{
    private IOrderService objService; // 应使用 _orderService
    private int iCount;               // 应使用 _count 或局部 camelCase

    public void Calc(Order o)         // Calc/O 难读
    {
        string strName = o.Name;
    }
}
```

## 理由

一致的命名降低认知负担，让代码在 IDE 中可预测、可搜索。下划线前缀的私有字段能在重构/阅读时立刻区分字段与局部变量；接口 `I` 前缀是 .NET 生态约定，便于依赖注入与测试替身识别。避免缩写与匈牙利命名可提升可读性与可维护性。
