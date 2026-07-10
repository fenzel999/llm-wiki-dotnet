---
title: 日志与可观测性（Logging & OpenTelemetry）
summary: 用 ILogger 写结构化日志，用 OpenTelemetry 采集 Traces / Metrics / Logs 三大信号。
tags: [logging, observability, opentelemetry, metrics, tracing]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/diagnostics/observability-with-otel
updated: 2026-07-10
---

> **要点速览**
> - 三大信号：日志（事件）、指标（可聚合数值）、追踪（跨服务请求链路）。
> - 日志用 `ILogger` + **命名占位符**（结构化），高频路径用 `LoggerMessage` 源生成零分配。
> - 用 OpenTelemetry + OTLP 导出到开源后端（Prometheus/Grafana/Jaeger），不绑定付费云。
> - 别用字符串插值写日志；别把敏感信息写进日志。

## 概述

线上系统出问题时，你能不能快速回答"哪儿慢了、为什么错了"，取决于可观测性做得好不好。可观测性由三大信号组成：**日志（Logs）**记录离散事件，**指标（Metrics）**是可聚合的数值（QPS、延迟、内存），**追踪（Traces）**串起一次请求跨越多个服务的完整路径。.NET 对三者都有一等支持，且统一对接业界标准 **OpenTelemetry（OTel）**，通过 OTLP 协议导出到开源后端（Prometheus、Grafana、Jaeger 等），不绑定任何付费云服务（[POLICY P12](../../governance/policy.md)）。

日志入口是 `ILogger<T>`，务必写**结构化日志**——用命名占位符而不是字符串拼接，这样后端能按字段检索。指标用 `System.Diagnostics.Metrics.Meter`，追踪用 `ActivitySource`，它们都是 OTel 原生模型。

## 正确做法

日志用命名占位符，让参数成为可查询的结构化字段；高频路径可用 `LoggerMessage` 源生成器零分配：

```csharp
public partial class OrderService(ILogger<OrderService> logger)
{
    [LoggerMessage(Level = LogLevel.Information, Message = "Order {OrderId} shipped to {City}")]
    partial void LogShipped(int orderId, string city);

    public void Ship(Order o)
    {
        LogShipped(o.Id, o.City);   // 结构化：OrderId / City 成为独立字段
    }
}
```

接入 OpenTelemetry 三信号，一处配置全应用生效：

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation())
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddRuntimeInstrumentation())
    .UseOtlpExporter();   // 通过 OTLP 导出到任意兼容后端
```

自定义指标与追踪用 `Meter` / `ActivitySource`，它们会自动被 OTel 采集。

## 常见误区

❌ 用字符串插值写日志：`logger.LogInformation($"Order {id} shipped")`。这样日志后端只能拿到一整行文本，无法按 `OrderId` 检索，也丢了结构化的意义。用占位符 `"Order {OrderId} shipped"`。

❌ 在生产环境开 `Debug`/`Trace` 级别刷屏，既拖慢应用又淹没关键信息。用配置分类别控制级别。

❌ 把敏感信息（密码、令牌、身份证号）写进日志。日志会被广泛存储和检索，等于泄密。

## 适用版本

`ILogger` 全版本通用；`LoggerMessage` 源生成器 net6+；OpenTelemetry .NET SDK 各受支持版本可用，net8+ 内置指标/追踪桩点更完善。

## 参考资料

- [配置与 Options](configuration-options.md)
- [诊断与性能剖析](../../performance/diagnostics.md)
- 官方文档：[.NET 中的 OpenTelemetry 可观测性](https://learn.microsoft.com/dotnet/core/diagnostics/observability-with-otel)
- 官方文档：[.NET 日志记录](https://learn.microsoft.com/dotnet/core/extensions/logging)
