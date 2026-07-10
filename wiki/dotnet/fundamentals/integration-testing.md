---
title: 集成测试（WebApplicationFactory / TestServer）
summary: 用 WebApplicationFactory 起真实管道测 HTTP 全链路；用 SQLite 内存库测真实 SQL；不引第三方容器库。
tags: [testing, integration-test, webapplicationfactory, sqlite]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/test/integration-tests
updated: 2026-07-10
---

# 集成测试（WebApplicationFactory / TestServer）

> **要点速览**
> - 集成测试=把组件**拼起来**跑真实路径：典型是整条 HTTP 管道 + 数据库，验证协作是否正确。
> - 用 **`WebApplicationFactory<TEntry>`** 在内存起整个应用，拿到真实 `HttpClient` 打接口，覆盖路由/绑定/DI/中间件/验证全链路。
> - 测真实 SQL 用 `Microsoft.Data.Sqlite`（内存库）替换 DbContext；**不引第三方容器库**（[P10](../../governance/policy.md)）。
> - 它**不是** AOT 测试（测试工程不发布 Native AOT）；AOT 应用的正确性靠"跑通每个端点"验证（见[AOT 矩阵](../aot/aot-compatibility.md)）。

## 概述

单元测试验证单个类、隔离依赖、跑得飞快；**集成测试**则验证"多个东西拼起来也对"——最典型的是整条 ASP.NET Core 请求管道（路由→模型绑定→授权→端点→序列化）加上真实数据库，确认它们协作无误。它在金字塔里位于单元之上、端到端之下，数量少于单元、多于 E2E。

ASP.NET Core 官方提供 **`WebApplicationFactory<T>`**：以一个入口类型（`Program` 或 `App`/`WebApp`，取决于项目暴露方式）为种子，在内存用 `TestServer` 启动整个应用，给你一个能打真实端点的 `HttpClient`。需要真实数据库时，用 `Microsoft.Data.Sqlite` 的内存连接替换应用里的 `DbContext`，或用手写脚本起一次性数据库。**不依赖** Testcontainers 这类第三方容器库（[P10](../../governance/policy.md)）。

## 正确做法

### 1. 基础：起工厂、打接口、断言状态码

```csharp
public class OrdersApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_missing_order_returns_404()
    {
        var client = factory.CreateClient();
        var resp = await client.GetAsync("/orders/does-not-exist");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);   // 验证 HTTP 语义（见 错误处理）
    }

    [Fact]
    public async Task Create_returns_201_and_location()
    {
        var client = factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/orders", new { customerId = "c1" });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        Assert.False(string.IsNullOrEmpty(resp.Headers.Location?.ToString()));
    }
}
```

### 2. 换数据库：SQLite 内存库 + 自建 schema

要让端点走到真实 SQL，用 `WithWebHostBuilder` 把 `DbContext` 换成 SQLite 内存库，并在测试里建表：

```csharp
private static WebApplicationFactory<Program> SqliteFactory()
    => new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
    {
        b.ConfigureServices(services =>
        {
            // 移除应用原 DbContext 注册，换成 SQLite 内存
            var desc = services.Single(d => d.ServiceType == typeof(DbContextOptions<OrdersDbContext>));
            services.Remove(desc);
            services.AddDbContext<OrdersDbContext>(o => o.UseSqlite("DataSource=:memory:"));
        });
    });

[Fact]
public async Task Create_then_get_roundtrips_rows()
{
    var factory = SqliteFactory();
    using var scope = factory.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<OrdersDbContext>();
    db.Database.OpenConnection();          // 内存库需先打开连接
    db.Database.EnsureCreated();

    var client = factory.CreateClient();
    var created = await client.PostAsJsonAsync("/orders", new { customerId = "c1" });
    created.EnsureSuccessStatusCode();
    var list = await client.GetFromJsonAsync<OrderDto[]>("/orders");
    Assert.Single(list!);
}
```

> SQLite 内存库进程内、零依赖、拼真实 SQL（建表/约束/迁移），比 EF InMemory 可靠（InMemory **不校验关系约束、不跑真实 SQL**，易给假绿灯，[质量工程](../../standards/quality-engineering.md) 已禁用）。

### 3. 自定义 host 设置（配置/服务覆盖）

`ConfigureTestServices` 注入测试替身（如把邮件服务换成 fake），或覆盖配置：

```csharp
.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
    services.AddScoped<INotifier, FakeNotifier>()))   // 用测试替身替换真实实现
```

### 4. 何时用哪种数据库

| 方式 | 真假 SQL | 何时 |
|------|----------|------|
| 不替换 DbContext（用应用默认库） | 真实 | 有可用的真实/测试数据库时最稳，但依赖外部 |
| SQLite 内存库 | ✅ 真 SQL | 进程内、无外部依赖，验证迁移/约束/查询 |
| 手写 `docker compose` 脚本起库 | ✅ 真 SQL | 需贴近生产数据库（PostgreSQL 等）的特性 |
| EF InMemory | ❌ | **避免**——不校验约束，给假绿灯 |

## 常见误区

❌ **单元测试里连真实数据库/HTTP**：慢且脆，本质写成集成测试。单元隔离依赖（[测试替身](test-doubles.md)），集成才碰真实依赖。

❌ **用 EF InMemory 当数据库测试**：它不跑真实 SQL、不校验关系/约束，迁移也不验证，很容易"测过了其实挂了"。要真实 SQL 用 SQLite 内存库或手写脚本。

❌ **引第三方容器库（Testcontainers 等）** 只为起个库。按 [P10](../../governance/policy.md) 用内置 `Microsoft.Data.Sqlite` 或手写 `docker compose` 脚本，零第三方依赖。

❌ **集成测试断言实现细节**（具体 SQL、内部调用顺序）。它验证**行为/协议**（状态码、返回体、副作用），不是单元级细节——细节由单元测试覆盖。

❌ **所有用例都走完整 HTTP 链路**。纯领域/应用逻辑用单元测试更快、定位更准；只在验证"拼起来对不对"时才上集成测试。

## 适用版本

`WebApplicationFactory` 与 `TestServer` 全版本通用；其依赖应用**暴露入口类型**（`Program`/顶级语句项目默认可用）。`PostAsJsonAsync`/`GetFromJsonAsync` 来自 `Microsoft.AspNetCore.Mvc.Testing` 包。

### Native AOT 兼容性

集成测试工程**不参与 Native AOT 发布**（它是普通 JIT 测试工程），因此本页写法不受 AOT 约束。对**被测的 AOT 应用**，集成测试正是"AOT 部署后跑通每个端点"验证手段之一——注意要逐一打通端点，捕获"编译过、启动好、首请求 500"的源生成遗漏（详见 [AOT 矩阵](../aot/aot-compatibility.md)）。

## 参考资料

- [测试总览（金字塔/框架）](testing.md) · [测试替身（fake/stub）](test-doubles.md)
- [依赖注入（替换服务）](dependency-injection.md) · [全局异常处理（HTTP 状态码）](../aspnet-core/exception-handling.md)
- 官方文档：[ASP.NET Core 集成测试](https://learn.microsoft.com/aspnet/core/test/integration-tests)
