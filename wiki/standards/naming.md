---
title: 命名规范
summary: 类型/方法用 PascalCase，私有字段用 _camel，接口 I 前缀，常量全大写下划线。
tags: [standard, naming]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/fundamentals/coding-style
updated: 2026-07-10
---

## 概述

命名规范统一了代码中的大小写与标识符风格，目标是降低认知负担，让代码在 IDE 中可预测、可搜索。一致的命名让阅读者能凭名称立刻判断一个标识符是类型、接口、字段还是局部变量，从而减少理解成本。当团队都遵循同一套约定（如接口 `I` 前缀、私有字段下划线前缀）时，重构与代码评审都会更顺畅，可维护性随之提高。

## 正确做法

类型（class/struct/interface/enum）、方法、属性、事件以及公共字段使用 PascalCase（首字母大写）；局部变量与方法参数使用 camelCase（首字母小写）。私有实例字段使用 `_camelCase`（下划线前缀加 camelCase），这样在阅读与重构时能立刻区分字段与局部变量。接口以 `I` 前缀开头后接 PascalCase 名词（如 `IOrderService`），常量（`const`）与编译期 `static readonly` 使用全大写下划线（如 `MAX_RETRY_COUNT`）。避免在命名空间里用匈牙利前缀（如 `strName`、`iCount`）和无意义的缩写，优先写全 `Manager`、`Calculate`；命名空间本身使用 `PascalCase`，通常采用 `Company.Product.Feature` 形式。

下面的示例展示了接口、类、私有字段与常量各自的命名约定，以及 `ProcessAsync` 中局部变量采用的 camelCase：

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

编译期常量推荐用全大写下划线写法，与运行期只读字段在视觉上区分开：

```csharp
// 常量的全大写下划线写法
public static class Limits
{
    public const int MAX_BATCH_SIZE = 1000;
    public const string DEFAULT_CULTURE = "zh-CN";
}
```

## 反例（常见错误）

❌ 下面这个类混用了匈牙利前缀、缩写与混乱的字段命名，可读性很差且难以在 IDE 中定位：

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

其他常见错误：

- 用单字母或含糊缩写（如 `Mgr`、`Calc`、`o`）作为公共成员名，丢失语义。
- 私有字段不加下划线前缀，与局部变量混淆，评审时难以分辨生命周期。
- 同一概念在不同类型里用不同命名（如 `orderId` 与 `orderID` 混用），破坏一致性。

## 适用版本

这些规范通用，本节省略（不写任何版本选项卡）。

## 参考资料

- 相关：[异常处理](../standards/exception-handling.md)
- 官方文档：[C# coding style conventions](https://learn.microsoft.com/dotnet/csharp/fundamentals/coding-style)
