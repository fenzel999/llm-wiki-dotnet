---
title: HttpClient 与 IHttpClientFactory
summary: 用 IHttpClientFactory 管理生命周期避免套接字耗尽，配合命名/类型化客户端按用途配置。
tags: [http, httpclient, httpclientfactory, 网络, sockets]
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

注册工厂与**类型化客户端**（强类型、可注入、按用途配基址与默认头）：

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

需要统一横切逻辑（如带令牌鉴权、重试）时，用消息处理器串接：

```csharp
builder.Services.AddTransientHttpMessageHandler<AuthHandler>();
```

## 常见误区

❌ 在 `using` 里不断 `new HttpClient()`——在高频调用场景会耗尽可用套接字。用单例或 `IHttpClientFactory`。

❌ 把 `HttpClient` 注册成 scoped 或 transient。它本应长生命周期；短生命周期既浪费连接池又重蹈套接字耗尽。

❌ 手动拼接 URL 字符串容易出错且易注入。用内置 `Uri` / `UriBuilder` / `QueryHelpers`（`Microsoft.AspNetCore.WebUtilities`）构造，并对外部输入做好编码；不引第三方 URL 库（[POLICY P10](../../governance/policy.md)）。

## 适用版本

`IHttpClientFactory` 自 netcoreapp2.1 起，全受支持版本可用；单例 `HttpClient` 的 DNS 刷新问题 net5+ 已修复。

## 参考资料

- [弹性与重试（Polly）](resilience.md)
- [日志与可观测性](observability.md)
- 官方文档：[HttpClient 使用准则](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-guidelines)
- 官方文档：[IHttpClientFactory](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-factory)
