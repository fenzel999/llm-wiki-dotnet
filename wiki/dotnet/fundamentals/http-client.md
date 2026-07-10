---
title: HttpClient 与 IHttpClientFactory
summary: 用 IHttpClientFactory 管理生命周期避免套接字耗尽，配合命名/类型化客户端按用途配置。
tags: [http, httpclient, httpclientfactory, sockets]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-guidelines
updated: 2026-07-10
---

> **要点速览**
> - `HttpClient` 别频繁 `new`——会耗尽套接字；用单例或 `IHttpClientFactory`。
> - 首选**类型化客户端**：按用途配基址/默认头，强类型可注入。
> - 横切逻辑（鉴权/重试）用消息处理器串接；配合[弹性](resilience.md)。
> - 别注册成 scoped/transient；别手拼 URL（用 `Uri`/`QueryHelpers`）。

## 概述

`HttpClient` 实现 `IDisposable`，但它**不是**"用完即丢"的对象——它底层复用一个 `HttpClientHandler` 和连接池，每 `new` 一个就建立一套新的连接管理，频繁创建会导致**套接字耗尽（TIME_WAIT 堆积）**。正确的姿势是：要么把单个 `HttpClient` 注册成 singleton 长期复用（net5+ 已解决 DNS 变更不刷新的老问题），要么用 **`IHttpClientFactory`** 让框架统一管理生命周期与连接池。

`IHttpClientFactory` 还顺手解决了三件麻烦事：自动复用 `HttpClientHandler`、内置 `HttpClient` 日志与诊断（接入 OpenTelemetry）、通过 `AddHttpMessageHandler` 串接统一的处理器（重试、鉴权、日志）。

## 正确做法

`IHttpClientFactory` 解决三件麻烦事：自动复用 `HttpClientHandler`、内置日志与诊断（接入 [可观测性](observability.md)）、通过 `AddHttpMessageHandler` 串接统一处理器（重试、鉴权）。下面按客户端形态与横切逻辑逐个展开。

### 类型化客户端（AddHttpClient<T>）

强类型、可注入、按用途配基址与默认头，是最常用形态：

```csharp
builder.Services.AddHttpClient<GitHubClient>(client =>
{
    client.BaseAddress = new Uri("https://api.github.com");
    client.DefaultRequestHeaders.UserAgent.Add(new("llm-wiki", "1.0"));
});

public class GitHubClient(HttpClient http)
{
    public async Task<User?> GetUserAsync(string name)
        => await http.GetFromJsonAsync<User>($"/users/{name}");
}
```

### 命名客户端（AddHttpClient("name")）

当同一进程需要多组不同配置（不同基址/超时/头）时，用**命名客户端**，运行时按名字取出：

```csharp
builder.Services.AddHttpClient("github", client =>
{
    client.BaseAddress = new Uri("https://api.github.com");
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient("search", client =>
{
    client.BaseAddress = new Uri("https://search.example.com");
});

public class MultiClient
{
    private readonly IHttpClientFactory _factory;
    public MultiClient(IHttpClientFactory factory) => _factory = factory;

    public async Task<string> CallGitHubAsync(string path)
    {
        var client = _factory.CreateClient("github");   // 按名字取，每类配置独立
        return await client.GetStringAsync(path);
    }
}
```

类型化与命名客户端**底层共享同一套 `HttpClientHandler` 池**，区别只是各自的配置与消息处理器链；按需选择，不必二选一。

### 消息处理器链（AddHttpMessageHandler<T>）与顺序

横切逻辑（鉴权、重试、日志、[弹性](resilience.md)）写成 `DelegatingHandler`，用 `AddHttpMessageHandler` 串接。**顺序很重要：越先注册，越靠近外层（先执行）**：

```csharp
builder.Services.AddHttpClient<GitHubClient>()
    .AddHttpMessageHandler<AuthHandler>()        // 先执行：注入令牌
    .AddHttpMessageHandler<LoggingHandler>()     // 后执行：记录请求/响应
    .AddStandardResilienceHandler();             // 最内层：重试/熔断

public class AuthHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        request.Headers.Authorization = new("Bearer", GetToken());
        return await base.SendAsync(request, ct);   // 交给链中的下一个
    }
}
```

`AuthHandler` 先给请求加令牌，再交给 `LoggingHandler` 记录，最后由弹性处理器执行真正发送。顺序错会导致"还没加令牌就重试/记录"。

### 单例 HttpClient 与 DNS 刷新

net5 之前，`static`/`singleton` 的 `HttpClient` 会缓存 DNS 解析结果、下游换 IP 时不刷新（[Socket 复用坑](https://github.com/dotnet/runtime/issues/35435)）。net5+ 已修复：底层 `SocketsHttpHandler` 会按 TTL 周期性刷新 DNS，因此**长生命周期单例 `HttpClient` 现在完全可用**。

```csharp
// net5+ 安全：单例复用 + DNS 自动刷新
builder.Services.AddSingleton(sp =>
    new HttpClient { BaseAddress = new Uri("https://api.github.com") });
```

需要按用途配置时才用 `IHttpClientFactory`；两者不冲突，按场景取舍即可。

### 构造 URL（Uri / QueryHelpers / EscapeDataString）

**手拼 URL 字符串容易出错且易注入**。用内置 `Uri` / `UriBuilder` / `QueryHelpers`（`Microsoft.AspNetCore.WebUtilities`）构造，并对外部输入做好编码：

```csharp
using Microsoft.AspNetCore.WebUtilities;

var query = new Dictionary<string, string?>
{
    ["q"] = userInput,
    ["page"] = "1"
};
// 自动对每个值做 application/x-www-form-urlencoded 编码
var url = QueryHelpers.AddQueryString("https://api.github.com/search", query);

// 单值手工编码时用 Uri.EscapeDataString（不是 EscapeUriString）
var safe = "https://api.github.com/users/" + Uri.EscapeDataString(userName);
```

不引第三方 URL 库（[POLICY P10](../../governance/policy.md)）；`QueryHelpers` 已覆盖绝大多数拼接与编码需求。

### 取消令牌（CancellationToken）

所有 `HttpClient` 调用都接受 `CancellationToken`，用于超时/用户取消时及时释放连接：

```csharp
public async Task<User?> GetUserAsync(string name, CancellationToken ct)
    => await http.GetFromJsonAsync<User>($"/users/{name}", ct);

// 调用方自定超时
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
await GetUserAsync("dotnet", cts.Token);
```

注意：`HttpClient.Timeout` 与传入的 `CancellationToken` 是**两道独立防线**——令牌触发取消时，未完成的请求会被中止；超时则是客户端自身上限。两者都该用。

### 处理器生命周期与 PrimaryHttpHandler

工厂默认给每个命名的客户端创建独立的 `HttpClientHandler` 并纳入池化；默认 handler 的**连接池生命周期约 2 分钟**，到期自动回收以支持 DNS 刷新与连接轮换。你可用 `SetHandlerLifetime` 调整：

```csharp
builder.Services.AddHttpClient("github")
    .SetHandlerLifetime(TimeSpan.FromMinutes(5));   // 调长/调短连接池轮换周期
```

若要完全掌控底层 handler（例如共享同一 `SocketsHttpHandler` 实例），可在 `AddHttpClient` 后通过 `ConfigurePrimaryHttpHandler` 指定：

```csharp
var shared = new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(2) };
builder.Services.AddHttpClient("github")
    .ConfigurePrimaryHttpHandler(() => shared);
```

绝大多数场景用默认即可，不必手动管理 handler。

## 常见误区

❌ 在 `using` 里不断 `new HttpClient()`——在高频调用场景会耗尽可用套接字（TIME_WAIT 堆积）。用单例或 `IHttpClientFactory`。

❌ 把 `HttpClient` 注册成 scoped 或 transient。它本应长生命周期；短生命周期既浪费连接池又重蹈套接字耗尽。

❌ 手动拼接 URL 字符串容易出错且易注入。用内置 `Uri` / `UriBuilder` / `QueryHelpers`（`Microsoft.AspNetCore.WebUtilities`）构造，并对外部输入做好编码；不引第三方 URL 库（[POLICY P10](../../governance/policy.md)）。

❌ 忘记给 `GetFromJsonAsync` / `SendAsync` 传 `CancellationToken`。下游卡死时请求会一直挂着占连接；令牌能及时释放资源。

❌ 认为 net5 之前"单例 HttpClient 永不刷新 DNS"的旧结论现在仍成立。net5+ 已修复 DNS 刷新，长生命周期单例可用；仍纠结旧坑属于过期知识。

❌ 消息处理器链顺序写反：把重试/弹性放在鉴权**之前**，导致"还没加令牌就开始重试"，既浪费重试又可能泄露无令牌请求。鉴权类 handler 应排在最外（最先执行）。

## 适用版本

`IHttpClientFactory` 自 netcoreapp2.1 起，全受支持版本可用；单例 `HttpClient` 的 DNS 刷新问题 net5+ 已修复；`QueryHelpers` 随 ASP.NET Core 提供。`SocketsHttpHandler.PooledConnectionLifetime` / `ConfigurePrimaryHttpHandler` 等细化控制在 netcoreapp2.1+ 即存在。

### Native AOT 兼容性

- ✅ **AOT 安全**：类型化客户端（`AddHttpClient<T>`）、命名客户端（`AddHttpClient("name")`）、`DelegatingHandler` 消息处理器链都是编译期注册、静态可见，AOT 下正常使用。
- ✅ 请求/响应体用 `System.Text.Json` **源生成**（`JsonSerializerContext`）序列化，不要走反射式 `Serialize`；否则 AOT 裁剪会丢类型元数据。
- ⚠️ 不要在 handler 里做运行期反射或动态构造 HTTP 调用；保持逻辑编译期可确定。
- 详见后端 AOT 落地清单：[Native AOT 兼容性矩阵与规则](../aot/aot-compatibility.md)。

## 参考资料

- [弹性与重试（Polly）](resilience.md)
- [日志与可观测性](observability.md)
- 官方文档：[HttpClient 使用准则](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-guidelines)
- 官方文档：[IHttpClientFactory](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-factory)
