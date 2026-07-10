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

可观测性三大信号（日志/指标/追踪）在 .NET 里都有一等支持，且统一对接 OpenTelemetry。下面按"从最常见的日志，到自定义指标与追踪"逐层展开。

### 结构化日志（命名占位符）

`ILogger` 用**命名占位符**而不是字符串插值，参数会作为独立字段被后端索引：

```csharp
public class OrderService(ILogger<OrderService> logger)
{
    public void Ship(Order o, string city)
    {
        // ✅ 命名占位符：OrderId / City 成为可检索字段
        logger.LogInformation("Order {OrderId} shipped to {City}", o.Id, city);
        // ❌ 字符串插值：后端只能拿到一整行文本
        // logger.LogInformation($"Order {o.Id} shipped to {city}");
    }
}
```

占位符名用大括号包裹的属性名，顺序不必与参数一致，但推荐保持一致以便阅读。`LogWarning` / `LogError` 同理，错误日志建议带上 `OrderId` 等业务键方便排查。

### LoggerMessage 源生成（高频路径零分配）

在**高频调用路径**（如每秒上万次）上，用 `LoggerMessage` 源生成器避免装箱与字符串解析开销，并**天然 AOT 安全（无运行期反射）**：

```csharp
public partial class OrderService(ILogger<OrderService> logger)
{
    [LoggerMessage(Level = LogLevel.Information, Message = "Order {OrderId} shipped to {City}")]
    partial void LogShipped(int orderId, string city);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Order {OrderId} took {ElapsedMs} ms")]
    partial void LogSlow(int orderId, double elapsedMs);

    public void Ship(Order o)
    {
        LogShipped(o.Id, o.City);   // 结构化：OrderId / City 成为独立字段
    }
}
```

`LogShipped` / `LogSlow` 在编译期生成强类型实现，参数直接格式化、不反射、不装箱。它比 `LogInformation("...", ...)` 更快，是热路径的首选写法。

### 自定义指标（Meter / Instrument）

指标是可聚合的数值（计数、直方图）。用 `System.Diagnostics.Metrics.Meter` 创建**仪表（Instrument）**，OTel 会自动采集并导出：

```csharp
using System.Diagnostics.Metrics;

public class OrderMetrics
{
    private static readonly Meter Meter = new("MyShop.Orders", "1.0.0");
    private static readonly Counter<int> OrderCount =
        Meter.CreateCounter<int>("orders.created", "orders", "已创建订单数");
    private static readonly Histogram<double> OrderLatency =
        Meter.CreateHistogram<double>("orders.latency", "ms", "下单延迟");

    public void RecordCreated(int count = 1) => OrderCount.Add(count);
    public void RecordLatency(double ms) => OrderLatency.Record(ms);
}
```

常用 Instrument 类型：

| Instrument | 语义 | 典型用途 |
|------------|------|----------|
| `Counter<T>` | 只增的数值 | 请求数、错误数、订单数 |
| `ObservableCounter<T>` | 拉取式计数 | 当前队列长度 |
| `Histogram<T>` | 分布（分位数） | 延迟、响应大小 |
| `Gauge<T>`（net8+ 的 `ObservableGauge`） | 瞬时值 | CPU%、内存、连接数 |

`Counter` 适合计数；**延迟/耗时一律用 `Histogram`**，后端能算 p50/p95/p99 分位数，比平均值有用得多。

### 自定义追踪（ActivitySource / Activity）

追踪串起一次请求跨越多个服务的完整路径。用 `ActivitySource` 创建 `Activity`，手动 `StartActivity` + `SetTag` 标注关键节点：

```csharp
using System.Diagnostics;

public static class Sources
{
    public static readonly ActivitySource Shop = new("MyShop.Orders");
}

public async Task ProcessAsync(int orderId)
{
    using var activity = Sources.Shop.StartActivity("Order.Process");
    activity?.SetTag("order.id", orderId);
    try
    {
        await DoWorkAsync();
        activity?.SetTag("order.result", "ok");
    }
    catch (Exception ex)
    {
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        activity?.AddException(ex);   // 错误与异常一并进入追踪
        throw;
    }
}
```

只要引用了 `ActivitySource`，**OpenTelemetry 的 `AddSource("MyShop.Orders")` 会自动采集你创建的所有 Activity**，无需手动导出。`AddException` 让异常出现在链路里，便于定位失败环节。

### 接入 OpenTelemetry 三信号

一处配置全应用生效；内置桩点（ASP.NET Core、HttpClient、运行时）自动产出信号：

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t
        .AddSource("MyShop.Orders")                  // 采集自定义 ActivitySource
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation())
    .WithMetrics(m => m
        .AddMeter("MyShop.Orders")                   // 采集自定义 Meter
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation())
    .UseOtlpExporter();   // 通过 OTLP 导出到任意兼容后端（Prometheus/Grafana/Jaeger）
```

`WithTracing` 的 `AddSource` 名字要与代码里 `new ActivitySource("MyShop.Orders")` 完全一致；`WithMetrics` 的 `AddMeter` 同理要匹配 `new Meter("MyShop.Orders", ...)`。OTLP 导出走环境变量（`OTEL_EXPORTER_OTLP_ENDPOINT`）指定后端地址，不绑定任何付费云。

### 分布式追踪传播（W3C traceparent）

当被调用的下游也是用 **HttpClient + `AddHttpClientInstrumentation`** 时，当前 `Activity` 的 W3C `traceparent` 头会被**自动注入请求、并在下游自动恢复为同一链路**——你无需手写任何传播代码。配合 [HttpClient 与工厂](http-client.md) 与 [弹性](resilience.md)，一次外部调用就能无缝延展成跨服务追踪。

## 常见误区

❌ 用字符串插值写日志：`logger.LogInformation($"Order {id} shipped")`。这样日志后端只能拿到一整行文本，无法按 `OrderId` 检索，也丢了结构化的意义。用占位符 `"Order {OrderId} shipped"`。

❌ 在高频路径用 `LogInformation("...", arg)` 却不做 `LoggerMessage` 源生成。每次调用都涉及参数装箱与消息模板解析，QPS 高时是不小的分配与 CPU 开销；源生成是编译期零分配方案。

❌ 忘记在 OTel 配置里 `AddSource` / `AddMeter` 匹配自己的名字。自定义 `ActivitySource` / `Meter` 只有被显式登记，OTel 才会采集，否则你写了 tracing/metrics 却"看不到"。

❌ 用 `Counter` 记延迟、用 `LogInformation` 记调用量。延迟应当用 `Histogram` 才能算分位数；计数应当用 `Counter` 才能聚合。选错 Instrument 类型会让后端指标无法正确解读。

❌ 在生产环境开 `Debug`/`Trace` 级别刷屏，既拖慢应用又淹没关键信息。用配置分类别控制级别（按 `ILogger` 的 `CategoryName` 设阈值）。

❌ 把敏感信息（密码、令牌、身份证号）写进日志。日志会被广泛存储和检索，等于泄密。指标 Tag 同样不要放 PII。

## 适用版本

`ILogger` 全版本通用；`LoggerMessage` 源生成器 net6+；`System.Diagnostics.Metrics` 与 `ActivitySource` net5+；OpenTelemetry .NET SDK 各受支持版本可用，net8+ 内置指标/追踪桩点更完善。`ObservableGauge` 等更细的 Instrument 为 net8+ 引入。

### Native AOT 兼容性

- ✅ **AOT 安全**：`LoggerMessage` 源生成在编译期产出强类型日志代码，**无运行期反射**，是 AOT 后端写日志的首选；不要用需反射的第三方日志库。
- ✅ 自定义 `Meter` / `ActivitySource` 是纯代码定义，**类型静态可见**，AOT 下照常工作。
- ⚠️ OpenTelemetry SDK 支持 AOT，但需确保被采集的类型（自定义 Instrument 的 T、Activity 设置的 Tag 值类型）能被静态分析保留、不被裁剪。若按需反射创建对象，需加 `[DynamicDependency]` 或 `DynamicDependency` 特性 / `TrimmerRootDescriptors` 保护。
- 详见后端 AOT 落地清单：[Native AOT 兼容性矩阵与规则](../aot/aot-compatibility.md)。

## 参考资料

- [配置与 Options](configuration-options.md)
- [诊断与性能剖析](../../performance/diagnostics.md)
- 官方文档：[.NET 中的 OpenTelemetry 可观测性](https://learn.microsoft.com/dotnet/core/diagnostics/observability-with-otel)
- 官方文档：[.NET 日志记录](https://learn.microsoft.com/dotnet/core/extensions/logging)
