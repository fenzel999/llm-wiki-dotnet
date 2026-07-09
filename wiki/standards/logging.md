---
title: 日志规范
summary: 使用 ILogger 结构化模板消息，合理选择级别，避免记录敏感数据。
tags: [standard, logging]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/logging
updated: 2026-07-10
---

## 概述

日志规范规定使用 `Microsoft.Extensions.Logging.ILogger` 以结构化模板消息的方式记录日志，并合理选择级别、规避敏感数据。结构化日志让后端（如 Seq、ELK、Application Insights）能够按属性过滤、聚合与告警，而不是只能做纯文本检索。当日志带上正确的级别、使用命名占位符并避免敏感信息外泄时，排错效率与系统安全性都会显著提升。

## 正确做法

消息模板应使用命名占位符（如 `{CorrelationId}`），而非字符串拼接，这样既能避免拼接分配、也能防止日志注入。级别选择要符合语义：`Trace`/`Debug` 用于开发细节，`Information` 表示正常业务事件，`Warning` 用于可恢复的异常，`Error` 表示失败，`Critical` 则用于致命问题。严禁记录密码、令牌、身份证号等敏感数据，对必要的标识符要脱敏。用 `BeginScope` 建立请求或事务作用域（如 `CorrelationId`），让同一请求的日志自动聚合；记录异常时应把异常对象传给 `logger.LogError(ex, ...)`，交给提供程序处理结构化信息，而非手动 `ex.ToString()`。

下面的 `CreateAsync` 用 `BeginScope` 把 `CorrelationId` 绑定到整个请求作用域，正常与失败路径都使用命名占位符记录结构化消息，失败时把异常对象一并传入：

```csharp
public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public async Task<Order> CreateAsync(CreateOrderCommand cmd, CancellationToken ct)
    {
        using (_logger.BeginScope(new Dictionary<string, object>
                   { ["CorrelationId"] = cmd.CorrelationId }))
        {
            _logger.LogInformation("创建订单开始: {OrderId}, {CustomerId}", cmd.OrderId, cmd.CustomerId);

            try
            {
                var order = await _repo.SaveAsync(cmd, ct);
                _logger.LogInformation("创建订单完成: {OrderId}", order.Id);
                return order;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "创建订单失败: {OrderId}", cmd.OrderId);
                throw;
            }
        }
    }
}
```

## 反例（常见错误）

❌ 以下三类错误分别展示了字符串拼接、记录敏感数据、以及把异常当字符串丢失结构化信息：

```csharp
// 错误1：字符串拼接，无法结构化检索
_logger.LogInformation("创建订单 " + cmd.OrderId + " 用户 " + cmd.CustomerId);

// 错误2：记录敏感数据
_logger.LogInformation("用户登录: {User} {Password}", user, password);

// 错误3：异常作为字符串，丢失结构化信息
_logger.LogError("失败: " + ex.ToString());
```

其他常见错误：

- 生产环境把级别开到 `Trace`/`Debug`，产生海量噪声并可能泄露内部细节。
- 在循环内部频繁打日志却不加采样，拖慢热路径并撑爆日志存储。
- 用 `Console.WriteLine` 绕过 `ILogger`，使日志脱离统一的级别与作用域体系。

## 适用版本

这些规范通用，本节省略（不写任何版本选项卡）。

## 参考资料

- 相关：[异常处理](../standards/exception-handling.md)
- 相关：[配置](../standards/configuration.md)
- 官方文档：[Logging in .NET](https://learn.microsoft.com/dotnet/core/extensions/logging)
