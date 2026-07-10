---
title: 测试（单元测试与集成测试）
summary: 用 xUnit 写单元测试，用 WebApplicationFactory 做集成测试，用 Testcontainers 跑真实依赖。
tags: [testing, xunit, integration-test, testcontainers, 质量]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/testing/
updated: 2026-07-10
---

> **要点速览**
> - 分三层：单元（快、隔离）＞集成（拼装+真依赖）＞端到端；金字塔形分布。
> - 框架用 xUnit（基金会）/MSTest（微软）+ 内置 `Assert`；**手写测试替身**，不引 Moq/FluentAssertions。
> - 集成测试用 `WebApplicationFactory`；测真库用 `Microsoft.Data.Sqlite` 或手写脚本，不用第三方容器库。
> - 单元测试遵循 AAA，一个测试只验证一件事。

## 概述

测试不是"写完功能再补的作业"，它是让你敢改代码的底气。.NET 的测试大致分三层：**单元测试**验证单个类/方法的逻辑，跑得飞快、不碰数据库和网络；**集成测试**把若干组件拼起来（典型是整条 HTTP 管道 + 数据库）验证它们协作是否正确；端到端测试则从用户视角验证整个系统。金字塔原则是：单元测试最多、集成测试其次、端到端最少。

测试框架用 **xUnit**（.NET 基金会项目）或 **MSTest**（微软官方），断言用内置 `Assert`。**隔离依赖不引第三方 mock 库，而是手写测试替身**（fake/stub）——为被测接口写一个测试专用实现，简单、可控、无外部依赖（详见 [POLICY P10](../../governance/policy.md)）。ASP.NET Core 官方提供 `WebApplicationFactory<T>` 在内存里启动整个应用做集成测试；需要真实数据库时，用 `Microsoft.Data.Sqlite` 的内存库，或用手写 `docker compose` 脚本管理一次性数据库，不依赖第三方容器库。

## 正确做法

单元测试遵循 **AAA**（Arrange-Act-Assert）三段式，一个测试只验证一件事：

```csharp
public class PriceCalculatorTests
{
    [Theory]
    [InlineData(100, 0.1, 90)]
    [InlineData(200, 0.5, 100)]
    public void Discount_reduces_price(decimal price, decimal rate, decimal expected)
    {
        var sut = new PriceCalculator();               // Arrange
        var result = sut.ApplyDiscount(price, rate);   // Act
        Assert.Equal(expected, result);                // Assert
    }
}
```

隔离依赖时手写测试替身，而不是引入 mock 库——为接口写一个可控的假实现即可：

```csharp
sealed class FakeClock : IClock            // 手写 stub，替代 mock 框架
{
    public DateTime UtcNow { get; init; }
}

[Fact]
public void Token_expires_after_ttl()
{
    var clock = new FakeClock { UtcNow = new(2026, 1, 1) };
    var sut = new TokenService(clock);
    Assert.False(sut.IsValid(expiredToken));
}
```

集成测试用 `WebApplicationFactory` 启动应用，拿到真实的 `HttpClient` 打接口，覆盖路由、模型绑定、DI、中间件整条链路：

```csharp
public class OrdersApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_returns_ok()
    {
        var client = factory.CreateClient();
        var resp = await client.GetAsync("/orders/1");
        resp.EnsureSuccessStatusCode();
    }
}
```

要测真实数据库行为（迁移、SQL、并发），用 Testcontainers 起一个真 PostgreSQL/SQL Server 容器，测完自动销毁，避免"我机器上能过"。

## 常见误区

❌ 单元测试里连真实数据库、真实 HTTP，导致测试又慢又脆（网络一抖就红），本质上写成了集成测试。隔离外部依赖才是单元测试。

❌ 一个测试方法里堆一大串断言、验证好几件事，一红就不知道到底哪儿坏了。一个测试聚焦一个行为。

❌ 用内存数据库（EF InMemory）假装测数据库——它不校验关系约束、不跑真实 SQL，容易给假绿灯。测数据库逻辑应上 `Microsoft.Data.Sqlite` 内存库，或手写脚本起真实数据库。

## 适用版本

所有受支持版本通用。`WebApplicationFactory` 依赖应用暴露 `Program` 类（最小托管默认可用）。

## 参考资料

- [质量工程](../../standards/quality-engineering.md)
- [依赖注入](dependency-injection.md)
- 官方文档：[.NET 中的测试](https://learn.microsoft.com/dotnet/core/testing/)
- 官方文档：[ASP.NET Core 集成测试](https://learn.microsoft.com/aspnet/core/test/integration-tests)
