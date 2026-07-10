---
title: 测试替身（Fake / Stub / Spy）
summary: 隔离依赖不靠 mock 框架——手写可断言的替身；按用途选 fake/stub/spy，仅测纯逻辑才需替身。
tags: [testing, test-doubles, fake, stub, mock]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/testing/
updated: 2026-07-10
---

# 测试替身（Fake / Stub / Spy）

> **要点速览**
> - 隔离依赖靠**替身**，不引 mock 框架（[P10](../../governance/policy.md)）——为接口写一个可控的测试实现即可。
> - 按用途选：**Fake**（带真逻辑的替身实现）/ **Stub**（只喂定值）/ **Spy**（记录被怎么调用）。
> - 只给"有外部依赖的"被测对象塞替身；**纯逻辑直接测**，不套桩。
> - 替身要能**断言**（Spy 记录调用次数/参数），而不只是吞掉调用。

## 概述

单元测试要"快、隔离、可重复"，关键是**把被测对象的外部依赖挡在外面**——数据库、时钟、网络、消息总线。挡的方式是用**测试替身（test double）**：一个在测试里替代真实依赖的对象。本库约定**不引第三方 mock 框架**（Moq/FakeItEasy 等，[P10](../../governance/policy.md)），而是**手写替身**——为接口写个测试专用实现，简单、可控、零外部依赖，还顺带把"依赖长什么样"讲得更清楚。

不是所有替身都一样，按"替身做什么"分三类：

| 替身 | 它做什么 | 例子 |
|------|----------|------|
| **Fake** | 有**真逻辑**的轻量实现（通常是内存版） | 内存仓储、内存缓存、假消息总线 |
| **Stub** | 只**喂定值**，不实现真逻辑 | 始终返回固定 `now` 的 `IClock`、返回预设用户的 `IUserRepo` |
| **Spy** | 包着真/桩实现，**记录**被怎么调用 | 记录 `Send` 被调几次、传了什么 |

## 正确做法

### 1. Stub：喂定值（最常用）

被测逻辑需要"现在几点""当前用户是谁"这类输入，又不想绑真时钟/真库：

```csharp
sealed class FakeClock(DateTime now) : IClock   // 只喂固定值
{
    public DateTime UtcNow => now;
}

[Fact]
public void Token_expires_after_ttl()
{
    var clock = new FakeClock(new(2026, 1, 1));
    var sut = new TokenService(clock);
    Assert.False(sut.IsValid(expiredToken));
}
```

### 2. Fake：带真逻辑的内存实现

比 Stub 更进一步，替身自己跑真逻辑——适合"被测对象要和某个仓储协作，但真库太重"：

```csharp
sealed class InMemoryOrderRepo : IOrderRepository   // 真逻辑的内存版
{
    private readonly Dictionary<Guid, Order> _store = new();
    public Task<Order?> GetAsync(Guid id) => Task.FromResult(_store.GetValueOrDefault(id));
    public Task SaveAsync(Order o) { _store[o.Id] = o; return Task.CompletedTask; }
}
// 用它即可测依赖 IOrderRepository 的用例，零数据库
```

### 3. Spy：记录调用，断言副作用

测"通知有没有发出去、发出几次"——用 Spy 包一层记录：

```csharp
sealed class SpyNotifier : INotifier
{
    public List<string> Sent { get; } = new();
    public Task SendAsync(string msg) { Sent.Add(msg); return Task.CompletedTask; }
}

[Fact]
public async Task Place_order_publishes_notification()
{
    var spy = new SpyNotifier();
    await new OrderService(spy).PlaceAsync(order);
    Assert.Single(spy.Sent);          // 断言副作用发生且次数对
}
```

### 4. 替身只在"有外部依赖"时才需要

纯逻辑（折扣计算、状态机、解析器）**直接测真实实现，不塞任何替身**：

```csharp
[Theory]
[InlineData(100, 0.1, 90)]
public void Discount_reduces_price(decimal p, decimal r, decimal expected)
    => Assert.Equal(expected, new PriceCalculator().ApplyDiscount(p, r));
```

## 常见误区

❌ **引 mock 框架只为"省两行"**。手写替身更可控、可断言、零依赖，且让依赖契约更显式（[P10](../../governance/policy.md)）。除非有框架无法手写的极端场景，否则不引。

❌ **给纯逻辑也套一堆 stub**。被测对象是纯函数就直接测，替身只挡真正的外部依赖（库/网络/时钟/文件系统）。

❌ **替身只吞掉调用、不记录**。测"副作用"必须能用 Spy 断言"被调几次、传了什么"，否则测试证明不了行为。

❌ **Fake 和真实实现行为不一致**。内存 Fake 要复刻真实实现的关键语义（如查不到返回 `null`），否则测的是假逻辑。仅当差异无关测试点时才允许简化。

❌ **一个替身类塞进所有测试、状态不重置**。Fake/Spy 跨用例要 `new` 干净，或在构造函数清空记录，避免用例间串扰。

## 适用版本

替身是纯 C# 实现，与版本无关。xUnit `[Theory]`/`[InlineData]`、`IClassFixture<>` 等全版本通用。

### Native AOT 兼容性

测试工程本身**不参与 Native AOT 发布**（普通 JIT 测试工程），故手写替身/框架都不受 AOT 约束。替身写法与本库 [P16](../../governance/policy.md) 的 AOT 规则无关——那是针对**被测的生产代码**。

## 参考资料

- [测试总览（金字塔/框架）](testing.md) · [集成测试（WebApplicationFactory）](integration-testing.md)
- [依赖注入（依赖即签名）](dependency-injection.md) · [质量工程（可测试性）](../../standards/quality-engineering.md)
- 官方文档：[.NET 中的测试](https://learn.microsoft.com/dotnet/core/testing/)
