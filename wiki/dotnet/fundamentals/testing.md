---
title: 测试（单元测试与集成测试）
summary: 测试金字塔——单元（快/隔离）＞集成（拼装+真依赖）＞端到端；框架 xUnit/MSTest，替身手写不引 mock 库。
tags: [testing, xunit, integration-test]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/testing/
updated: 2026-07-10
---

# 测试（单元测试与集成测试）

> **要点速览**
> - 测试金字塔：**单元**（单类/隔离，最多）＞**集成**（拼装+真依赖，其次）＞**端到端**（用户视角，最少）。
> - 框架用 **xUnit**（.NET 基金会）/ **MSTest**（微软）；断言用内置 `Assert`。
> - 隔离依赖**手写替身**，不引 Moq/FluentAssertions（[P10](../../governance/policy.md)）。
> - 测真实 SQL 用 `Microsoft.Data.Sqlite` 内存库，不引第三方容器库。
> - 详见：[集成测试](integration-testing.md) · [测试替身](test-doubles.md)。

## 概述

测试不是"写完功能再补的作业"，它是让你敢改代码的底气。.NET 的测试大致分三层：**单元测试**验证单个类/方法的逻辑，跑得飞快、不碰数据库和网络；**集成测试**把若干组件拼起来（典型是整条 HTTP 管道 + 数据库）验证协作是否正确；**端到端测试**从用户视角验证整个系统。金字塔原则：单元最多、集成其次、E2E 最少。

框架用 **xUnit**（.NET 基金会项目）或 **MSTest**（微软官方），断言用内置 `Assert`。隔离依赖**不引第三方 mock 库**，而是手写测试替身（fake/stub/spy）——为被测接口写一个测试专用实现，简单、可控、无外部依赖（[P10](../../governance/policy.md)、[测试替身](test-doubles.md)）。

## 正确做法

### 1. 金字塔分布：选对测试等级

| 等级 | 测什么 | 依赖 | 数量 |
|------|--------|------|------|
| 单元 | 单类逻辑/规则 | 全替身隔离 | 最多 |
| 集成 | 多组件拼装（HTTP+DB） | 真实 DB/管道 | 其次 |
| 端到端 | 用户视角的整个系统 | 全真实 | 最少 |

### 2. 单元测试：AAA + 一个行为一测

遵循 **AAA**（Arrange-Act-Assert），一个测试只验证一件事；纯逻辑直接测、不塞替身：

```csharp
[Theory]
[InlineData(100, 0.1, 90)]
[InlineData(200, 0.5, 100)]
public void Discount_reduces_price(decimal price, decimal rate, decimal expected)
{
    var sut = new PriceCalculator();                       // Arrange
    var result = sut.ApplyDiscount(price, rate);            // Act
    Assert.Equal(expected, result);                        // Assert
}
```

### 3. 隔离依赖：手写替身

需要挡外部依赖时，为接口写测试专用实现（stub/fake/spy），而不是引 mock 框架：

```csharp
sealed class FakeClock : IClock { public DateTime UtcNow { get; init; } }

[Fact]
public void Token_expires_after_ttl()
{
    var clock = new FakeClock { UtcNow = new(2026, 1, 1) };
    Assert.False(new TokenService(clock).IsValid(expiredToken));
}
```

### 4. 集成测试：起真实管道 + 真实 SQL

用 `WebApplicationFactory` 起整个应用、拿真实 `HttpClient` 打接口；测真实数据库行为用 `Microsoft.Data.Sqlite` 内存库。详见 [集成测试](integration-testing.md)。

## 常见误区

❌ **单元测试连真实数据库/HTTP**：慢且脆，本质是写成集成测试。隔离外部依赖才叫单元（[测试替身](test-doubles.md)）。

❌ **一个测试堆一大串断言**：一红不知哪坏。一个测试聚焦一个行为。

❌ **用 EF InMemory 假装测数据库**：不校验约束、不跑真实 SQL，易给假绿灯。真实 SQL 用 SQLite 内存库或手写脚本。

❌ **引 mock 框架只为省两行**：手写替身可控、可断言、零依赖（[P10](../../governance/policy.md)）。

❌ **所有用例都走完整 HTTP 链路**：纯领域/应用逻辑用单元更快、定位更准。

## 适用版本

全版本通用。`WebApplicationFactory` 依赖应用暴露入口类型（最小托管默认可用）；xUnit/AAA 通用。

### Native AOT 兼容性

测试工程**不参与 Native AOT 发布**（普通 JIT 测试工程），故本页与 [集成测试](integration-testing.md)、[测试替身](test-doubles.md) 写法**不受 AOT 约束**。对**被测的 AOT 应用**，集成测试正是"AOT 部署后跑通每个端点"的验证手段之一（详见 [AOT 矩阵](../aot/aot-compatibility.md)）。

## 参考资料

- [集成测试（WebApplicationFactory / SQLite）](integration-testing.md) · [测试替身（fake/stub/spy）](test-doubles.md)
- [质量工程（可测试性）](../../standards/quality-engineering.md) · [依赖注入（替换服务）](dependency-injection.md)
- 官方文档：[.NET 中的测试](https://learn.microsoft.com/dotnet/core/testing/) · [ASP.NET Core 集成测试](https://learn.microsoft.com/aspnet/core/test/integration-tests)
