---
title: 限界上下文（Bounded Context）
summary: 战略 DDD 的核心边界单元——用通用语言隔离模型、用上下文映射与防腐层连接上下文，避免巨型模型与跨库耦合。
tags: [ddd, architecture, strategic-design, net]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/
updated: 2026-07-11
---

> **要点速览**
> - 限界上下文是**模型边界**：边界内有一套自洽的「通用语言（Ubiquitous Language）」，边界外的同名概念可以完全不同含义。
> - 上下文之间靠**上下文映射（Context Map）**显式描述关系，而非靠共享代码或共享数据库隐式耦合。
> - 标准集成模式有 8 种：Shared Kernel、Customer/Supplier、Conformist、Anticorruption Layer、Separate Ways、Open Host Service + Published Language、Partnership。
> - 跨上下文集成优先用**防腐层（ACL）**手写适配器，把外部模型翻译成内部模型，绝不让外部类型渗入本上下文。
> - 「一个上下文多大」的判据是**通用语言是否还能连贯**，而非代码行数；一旦模型开始分裂出互相矛盾的术语，就该切分。
> - 限界上下文是纯设计概念，对运行时零影响；但 ACL/适配器必须遵守 Native AOT 规则（源生成 JSON、禁用反射）。

## 概述

限界上下文（Bounded Context）是 Eric Evans《领域驱动设计》中**战略设计**的核心概念，也是 .NET 微服务与模块化单体拆分的第一性原理。它的目标是：**在大型系统中，承认「同一词语在不同子域里含义不同」，并显式画出每个模型的边界**。

### 什么是限界上下文

一个限界上下文是一段**语义边界**，边界内：

- 存在一套**通用语言（Ubiquitous Language）**——开发团队与领域专家共用同一套术语，且这些术语在代码、对话、文档中含义完全一致。
- 有一个**自洽的领域模型**，实体、值对象、领域服务只服务于该语言。
- 模型对边界外**不负责**——外部如何使用你的模型，由上下文映射与集成模式决定。

例如在一个电商系统里：

- 在「**订单**上下文」中，「Product」是「被下单的商品快照（名称、价格、下单时的 SKU）」。
- 在「**库存**上下文」中，「Product」是「仓库中的物理单位（库位、批次、可用量）」。
- 在「**目录**上下文」中，「Product」是「营销素材（描述、图片、SEO）」。

如果强行用同一个 `Product` 类贯穿三者，就会出现「为了库存加了个 `Quantity` 字段，结果订单上下文也得背着它」的腐化。限界上下文主张：**让每个上下文拥有自己的 Product 模型，再在边界处翻译**。

### 与战术 DDD 的关系

限界上下文是**战略**层；实体、值对象、聚合、领域服务、仓储等是**战术**层（见 [DDD](../architecture/ddd.md)）。一个限界上下文内部通常包含若干聚合与领域事件，但战术模式超出本文范围——本文聚焦边界本身与边界之间的连接。

### 上下文映射（Context Map）

上下文映射是「系统的全景图」：它列出所有上下文，以及它们之间是哪种关系。没有映射，关系就是隐式的、靠口头约定，最容易腐烂成共享数据库。下文给出完整的关系模式清单。

## 正确做法

### 1. 先识别子域，再画出上下文边界

不要从技术分层（UI/API/DB）出发，而是从**业务子域**出发识别上下文。下面用控制台程序演示「如何把两个子域的模型各自独立定义」。

```csharp
namespace Ordering;

// 订单上下文内的 Product 模型：只关心下单那一刻的事实
public sealed record ProductSnapshot(Guid ProductId, string Name, decimal PriceAtOrderTime);

public sealed class Order
{
    public Guid Id { get; init; }
    public List<OrderLine> Lines { get; init; } = new();
}

public sealed record OrderLine(ProductSnapshot Product, int Quantity);

namespace Inventory;

// 库存上下文内的 Product 模型：只关心仓储事实，与订单无关
public sealed record StockKeepingUnit(Guid ProductId, string WarehouseCode, int Available);

public sealed class StockLevel
{
    public Guid ProductId { get; init; }
    public int Available { get; set; }
}
```

两个 `Product` 含义不同，各自命名（这里用 `ProductSnapshot` / `StockKeepingUnit`）避免撞名，是边界清晰的信号。

### 2. 用防腐层（ACL）在边界处翻译外部模型

当你的上下文必须消费上游上下文的数据，而上游模型你不能改、也不该直接用，就写一个**防腐层**把外部 DTO 翻译成内部模型。下面用 Minimal API 演示一个手写适配器，不使用任何第三方映射库。

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient<CatalogClient>();
var app = builder.Build();

// 外部（目录上下文）契约：我们不控制它，且字段命名/语义与内部不同
public sealed record CatalogProductDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("list_price")] decimal ListPrice);

// 本上下文（订单）需要的内部模型
public sealed record ProductSnapshot(Guid ProductId, string Name, decimal PriceAtOrderTime);

// 防腐层：唯一允许“看见”外部 DTO 的地方
public sealed class CatalogAnticorruptionLayer
{
    private readonly CatalogClient _client;
    public CatalogAnticorruptionLayer(CatalogClient client) => _client = client;

    public async Task<ProductSnapshot?> ResolveAsync(Guid productId, CancellationToken ct)
    {
        var dto = await _client.GetAsync(productId, ct);
        if (dto is null) return null;
        // 在此处做语义翻译与防御：外部价格 -> 下单时价格（此处可加规则）
        return new ProductSnapshot(dto.Id, dto.Title, dto.ListPrice);
    }
}

public sealed class CatalogClient(HttpClient http)
{
    public async Task<CatalogProductDto?> GetAsync(Guid id, CancellationToken ct)
    {
        using var resp = await http.GetAsync($"/catalog/products/{id}", ct);
        if (!resp.IsSuccessStatusCode) return null;
        return await resp.Content.ReadFromJsonAsync<CatalogProductDto>(CatalogJsonContext.Default.CatalogProductDto, ct);
    }
}

// 端点只依赖内部模型与 ACL，永远不直接依赖外部 DTO
app.MapPost("/orders", async (Guid productId, int qty, CatalogAnticorruptionLayer acl, CancellationToken ct) =>
{
    var snapshot = await acl.ResolveAsync(productId, ct);
    if (snapshot is null) return Results.NotFound();
    var order = new Order { Id = Guid.NewGuid(),
        Lines = new() { new(snapshot, qty) } };
    return Results.Ok(order);
});

app.Run();

public sealed class Order { public Guid Id { get; init; } = Guid.NewGuid(); public List<OrderLine> Lines { get; init; } = new(); }
public sealed record OrderLine(ProductSnapshot Product, int Quantity);
```

要点：外部 `CatalogProductDto` 仅在 `CatalogAnticorruptionLayer` 与 `CatalogClient` 中出现；订单处理代码只认 `ProductSnapshot`。这就是「防腐」——外部模型无法渗透进订单上下文。

### 3. 用 Open Host Service + Published Language 暴露稳定契约

当你是**被多方依赖的上游**，与其让每个下游各自猜你的模型，不如主动提供一套**公开发布语言（Published Language）**并通过**开放主机服务（Open Host Service）**统一暴露。下游可用 ACL 对接。

```csharp
// 上游：库存上下文作为开放主机，发布稳定的 JSON 契约
app.MapGet("/api/v1/stock/{productId:guid}", (Guid productId, StockRepository repo) =>
{
    var level = repo.Get(productId);
    // Published Language 契约版本化、稳定，下游据此写 ACL
    return Results.Ok(new StockView(productId, level.Available));
});

public sealed record StockView(Guid ProductId, int Available);
```

### 4. 把上下文映射成模块（而非微服务）

并非每个上下文都要独立部署。在 [模块化单体](../architecture/modular-monolith.md) 中，每个限界上下文是一个**编译隔离的模块/项目**，跨模块只能经由显式公开的接口或消息通信。这样先获得边界，等真正需要独立伸缩时再切成 [微服务](../architecture/microservices.md)。

```csharp
// 模块边界通过内部可见性强制：仅暴露一个门面
namespace Inventory.Module;

internal sealed class StockRepository { /* 内部实现，外部不可见 */ }

// 模块对外唯一出口
public sealed class InventoryGateway
{
    private readonly StockRepository _repo = new();
    public int Available(Guid productId) => _repo.Get(productId).Available;
}
```

## 常见误区

❌ **误区 1：用「一个共享的域模型类库」贯穿全系统。**
✅ 这等于消除了限界上下文。共享类库会变成「所有上下文的交集」，任何上下文加字段都拖累他人，最终腐化成贫血的大对象。正确做法：每个上下文自拥模型，跨边界靠 ACL 翻译（见上文防腐层示例）。**WHY**：限界上下文的存在意义就是允许模型在边界内自洽；共享类库让边界失效，通用语言重新分裂成「谁都不满意的中间模型」。

❌ **误区 2：用「共享数据库」当作上下文之间的集成方式。**
✅ 共享数据库让两个上下文在存储层悄悄耦合——一方改表结构，另一方立刻崩溃，且无法独立部署、独立演进。正确做法：每个上下文拥有自己的持久化（可以是同一数据库引擎的不同 schema/表，但逻辑上归属各自），跨上下文通过 ACL / 消息 / 开放主机服务集成。**WHY**：共享数据库是最隐蔽的上下文泄漏，它使「边界」在基础设施层名存实亡，是微服务与模块化单体最常见的失败根因。

❌ **误区 3：ACL 里只做「字段拷贝」，不翻译语义（贫血翻译）。**
✅ 反例：直接 `new ProductSnapshot(dto.Id, dto.Title, dto.ListPrice)` 不加任何规则看似省事，但若上游价格含税、本上下文价格不含税，拷贝后数据语义错误。正确做法：在 ACL 内显式表达语义转换规则（单位换算、状态映射、缺省值策略）。**WHY**：防腐层不只是「格式转换器」，更是「语义翻译器」。不做语义翻译，上游的每一次业务变更都会以错误数据的形式静默污染本上下文。

❌ **误区 4：一个系统只设一个「大上下文」，认为「通用语言」应该全公司统一。**
✅ 全公司统一一套术语几乎不可能，且强行统一会制造大量无人使用的抽象。正确做法：接受「Product 在订单与库存里含义不同」，用多个上下文 + 上下文映射来容纳差异。**WHY**：Evans 明确指出通用语言只在**单个限界上下文内**通用；跨上下文强行统一语言，只会让模型承载互相矛盾的约束而崩溃。

❌ **误区 5：把上下文拆得过小（一个聚合一个上下文）。**
✅ 过度切分会产生大量 ACL 与集成成本，反而拖慢交付。正确做法：以「通用语言能否连贯」为判据——当子域内术语一致、演进节奏相同，它们属于同一上下文。**WHY**：上下文映射与集成本身有成本；只有真正语义独立、演进速率不同的子域才值得成为独立上下文。

## 适用版本

- 限界上下文是**设计/架构概念**，不依赖任何具体 .NET 版本，从 .NET Framework 到 .NET 5/6/7/8/9/10 乃至未来版本通用。
- 文中代码示例使用 Minimal API（[Microsoft.AspNetCore](https://www.nuget.org/packages/Microsoft.AspNetCore.App.Ref) 内置，无需额外包）、`System.Text.Json` 源生成序列化（.NET 6+ 推荐，.NET 8+ 默认行为更优），可在 .NET 8/9/10 上直接编译运行。

### Native AOT 兼容性

限界上下文本身**不影响运行时**——它只是代码组织与模型边界的方式，不会出现在编译产物里。但是：

- 跨上下文集成时写的**防腐层 / 适配器 / 开放主机契约**必须遵守 [Native AOT](../dotnet/aot/native-aot.md) 规则：使用 `System.Text.Json` 的**源生成**（`[JsonSerializable(...)]` 上下文）而非运行时反射，否则 AOT 剪裁会丢类型。
- 避免在 ACL 中使用 `Type.GetType`、`Activator.CreateInstance`、基于反射的泛型反序列化等不可静态分析的 API。
- 若采用带 `JsonSerializerContext` 的源生成写法（如上例 `CatalogJsonContext.Default.CatalogProductDto`），在 `dotnet publish -r linux-x64 -p:PublishAot=true` 下可正常工作。

```csharp
// AOT 安全的源生成 JSON 上下文（放在 ACL 所在程序集内）
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(CatalogProductDto))]
internal sealed partial class CatalogJsonContext : JsonSerializerContext { }
```

## 何时使用

- 当模型开始互相污染、跨库耦合，或不同团队对同一词有不同理解时 → 划限界上下文、用通用语言隔离。
- 需要连接外部/遗留系统时 → 用防腐层（ACL）在边界处翻译，而非直接耦合外部模型。

## 与其他模式的关系

- 战略 DDD 的核心边界单元；与 [DDD](ddd.md) 战略部分咬合。
- 在 [模块化单体](modular-monolith.md) 中"模块=上下文"，在 [微服务](microservices.md) 中"服务=上下文"。
- 对外暴露稳定契约用 [API 设计](api-design.md)；连接用 [API 网关与 BFF](api-gateway-bff.md)。
- 见 [架构总览与决策指南](overview.md) 学习路径第 9 步。

## 参考资料

- Microsoft — DDD, CQRS, and microservices architecture guidance（本文 `source` 字段）: <https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/>
- Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software*（限界上下文与通用语言的原始定义）。
- 相关页面：[DDD](../architecture/ddd.md)、[模块化单体](../architecture/modular-monolith.md)、[微服务](../architecture/microservices.md)、[Native AOT](../dotnet/aot/native-aot.md)。
