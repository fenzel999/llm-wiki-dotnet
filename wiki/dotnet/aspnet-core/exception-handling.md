---
title: 全局异常处理与统一错误响应
summary: 用 IExceptionHandler + ProblemDetails 把异常集中映射为标准化 JSON 错误响应，业务异常带错误码。
tags: [aspnet-core, exception-handling, problem-details, error-code, minimal-api]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/error-handling
updated: 2026-07-10
---

# 全局异常处理与统一错误响应

> **要点速览**
> - 用**真实 HTTP 状态码**表达结果（400/401/403/404/409/**422**/5xx），**不**包"永远 200 + Result 信封"（[P15](../../governance/policy.md)）。
> - 异常**集中处理**：用 `IExceptionHandler`（net8+）在一处把异常映射为响应，别在每个端点写 try/catch。
> - 错误响应用标准 **`ProblemDetails`**（RFC 9457）：`AddProblemDetails()` + `UseExceptionHandler()`。
> - 自定义**业务异常**（携带错误码 + 目标状态码），映射为带 `code` 的结构化错误，前端可据码处理。
> - 别把敏感异常细节（堆栈/内部消息）返回给客户端；开发环境才显示详情。

## 概述

一个 API 的错误应当**长得一样**：无论哪里抛异常，客户端收到的都是同一种结构化 JSON（含状态码、标题、可选错误码与追踪 id），而不是有的返回 HTML、有的返回裸字符串、有的泄漏堆栈。ASP.NET Core 把这件事收进了框架：**`IExceptionHandler`**（net8 引入）让你在**一个集中位置**处理异常，**`ProblemDetails`**（[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)，原 7807）是官方标准错误载体。二者配合，无需第三方库（[P10](../../governance/policy.md)），也无需控制器——[Minimal API](aspnet-core-10.md) 一样适用。

设计思路借鉴成熟企业框架的做法：定义**业务异常（domain/business exception）**携带**错误码**与期望的 HTTP 状态码，由全局处理器统一翻译成响应。这样领域层只管 `throw`，表现层只管映射，两不相扰。

**用真实 HTTP 状态码，而不是统一 Result 信封**（[P15](../../governance/policy.md)）：本库约定 API 直接用 HTTP 语义表达结果，不再包一层"永远返回 200 + `{ success, data, error }`"的返回类——那会让 HTTP 缓存、客户端错误处理、可观测性全部失效。常见映射：

| 场景 | 状态码 | 典型异常 / 结果 |
|------|--------|-----------------|
| 请求格式/参数不合法 | **400** | 模型绑定失败、`ArgumentException` |
| 未认证 | **401** | 缺少/无效凭据 |
| 已认证但无权限 | **403** | 授权策略不通过 |
| 资源不存在 | **404** | `NotFoundException` |
| 状态冲突（并发/重复） | **409** | `ConflictException`、`DbUpdateConcurrencyException` |
| 语义/业务规则校验失败 | **422** | `BusinessException`、`ValidationException` |
| 未预期错误 | **5xx** | 其余异常 |

## 正确做法

定义带错误码的业务异常，用 `IExceptionHandler` 集中映射为 `ProblemDetails`：

```csharp
// 领域层：业务异常携带错误码 + 目标 HTTP 状态码
public class BusinessException(string code, string message, int status = StatusCodes.Status422UnprocessableEntity)
    : Exception(message)
{
    public string Code { get; } = code;
    public int Status { get; } = status;
}

// 语义化子类：状态码固定，调用处只关心业务含义
public sealed class NotFoundException(string code, string message)
    : BusinessException(code, message, StatusCodes.Status404NotFound);

public sealed class ConflictException(string code, string message)
    : BusinessException(code, message, StatusCodes.Status409Conflict);

// 例：业务规则失败 → 422；查不到 → 404
throw new BusinessException("order.already_submitted", "订单已提交，不能修改");
throw new NotFoundException("order.not_found", "订单不存在");
```

```csharp
// 集中异常处理器（net8+）：一处映射所有异常
public sealed class GlobalExceptionHandler(IProblemDetailsService problemDetails, ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, code) = ex switch
        {
            BusinessException b => (b.Status, b.Code),
            _                   => (StatusCodes.Status500InternalServerError, "server_error"),
        };

        if (status >= 500) logger.LogError(ex, "未处理异常 {Code}", code);   // 5xx 才记为错误

        ctx.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            ProblemDetails =
            {
                Status = status,
                Title = status >= 500 ? "服务器内部错误" : ex.Message,   // 5xx 不泄漏细节
                Extensions = { ["code"] = code },                        // 业务错误码
            },
        });
    }
}
```

```csharp
// 注册与装配
builder.Services.AddProblemDetails();                       // 标准错误载体
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

var app = builder.Build();
app.UseExceptionHandler();                                  // 最外层，兜住后续所有异常
```

返回给客户端的统一响应：

```json
{ "type": "...", "title": "订单已提交，不能修改", "status": 422, "code": "order.already_submitted", "traceId": "00-..." }
```

## 常见误区

❌ 包一层**统一 Result 信封**（永远 `200 OK` + `{ success:false, error }`）。这让客户端无法用 HTTP 语义判断成败、破坏缓存与可观测性。用真实状态码 + `ProblemDetails`（[P15](../../governance/policy.md)）。

❌ 在**每个端点**里写 `try/catch` 各自拼错误响应，格式五花八门、重复且易漏。用 `IExceptionHandler` 集中处理一次。

❌ 把**堆栈/内部异常消息**直接返回给客户端（安全风险）。5xx 只回通用标题，详情写日志；详细页仅限开发环境。

❌ 用**异常做常规控制流**（如"没查到"就抛异常）。可预期的结果用返回值（`Results.NotFound()`）；异常留给真正异常的状态。

❌ 把 `UseExceptionHandler()` 放在管道中间。它必须在**最外层**才能兜住后续所有中间件与端点的异常（见[中间件顺序](middleware.md)）。

❌ 手动 `catch` 后 `LogError` 又原样 `throw` 却指望全局处理器再记一次——会重复记录。要么在端点吞掉并处理，要么交给全局处理器统一记，不要两头都记。

## 适用版本

`IExceptionHandler` 与 `AddExceptionHandler<T>` **net8+**；`AddProblemDetails()` net7+。net10 起，被处理（`TryHandleAsync` 返回 `true`）的异常**默认不再发诊断日志/指标**，可用 `ExceptionHandlerOptions.SuppressDiagnosticsCallback` 调整。

### Native AOT 兼容性

`IExceptionHandler` 机制本身**不使用反射，完全兼容 Native AOT**（配合 [Minimal API](aspnet-core-10.md)，MVC/控制器路径不支持 AOT）。唯一要注意的是**响应的 JSON 序列化**——AOT 禁用基于反射的 `System.Text.Json`，须为 `ProblemDetails` 及自定义扩展启用**源生成**（[`JsonSerializerContext`](../csharp/source-generators.md)）：

```csharp
[JsonSerializable(typeof(ProblemDetails))]
internal partial class ErrorJsonContext : JsonSerializerContext { }

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.TypeInfoResolverChain.Insert(0, ErrorJsonContext.Default));
```

> `Extensions` 里放 `object` 值（如错误码字符串）在 AOT 下也依赖源生成解析类型；保持扩展值为简单类型并纳入 JSON 上下文即可。

## 参考资料

- [中间件管道（异常处理在最外层）](middleware.md) · [输入验证](validation.md) · [认证与授权](auth.md)
- [异常处理规范](../../standards/quality-engineering.md#exception-handling)
- 官方文档：[处理 ASP.NET Core 中的错误](https://learn.microsoft.com/aspnet/core/fundamentals/error-handling) · [处理 Web API 中的错误](https://learn.microsoft.com/aspnet/core/web-api/handle-errors)
