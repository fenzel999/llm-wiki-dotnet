---
title: 日志规范
summary: 使用 ILogger 结构化模板消息，合理选择级别，避免记录敏感数据。
tags: [standard, logging]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 规则

- 使用 `Microsoft.Extensions.Logging.ILogger` 进行日志，消息模板使用**命名占位符** `{CorrelationId}`，而非字符串拼接。
- 合理选择级别：`Trace`/`Debug`（开发细节）、`Information`（正常业务事件）、`Warning`（可恢复的异常）、`Error`（失败）、`Critical`（致命）。
- 不要记录密码、令牌、身份证号等敏感数据；对必要标识符做脱敏。
- 用 `BeginScope` 建立请求/事务作用域（如 `CorrelationId`），让同一请求的日志聚合。
- 避免记录完整的异常对象字符串到日志（使用 `logger.LogError(ex, ...)` 由提供程序处理）。

## 正确做法

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

## 反例

```csharp
// 错误1：字符串拼接，无法结构化检索
_logger.LogInformation("创建订单 " + cmd.OrderId + " 用户 " + cmd.CustomerId);

// 错误2：记录敏感数据
_logger.LogInformation("用户登录: {User} {Password}", user, password);

// 错误3：异常作为字符串，丢失结构化信息
_logger.LogError("失败: " + ex.ToString());
```

## 理由

结构化日志让日志后端（Seq、ELK、Application Insights）可按属性过滤、聚合与告警。命名占位符避免拼接分配并防止日志注入。作用域（scope）使分布式追踪的关联 ID 自动附加到每条日志，极大提升排错效率。相关：[异常处理](../standards/exception-handling.md)、[配置](../standards/configuration.md)。
