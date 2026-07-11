---
title: 数据传输对象 (DTO)
summary: DTO 隔离领域层与表现层；用 record 定义、输入/输出 DTO 分离、分页载体 PagedResult<T>、请求上限校验、手写映射与投影；AOT 友好用源生成。
tags: [architecture, dto, application-service, ddd, serialization]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-application-layer-implementation-web-api
updated: 2026-07-11
---

# 数据传输对象 (DTO)

> **要点速览**
> - **定位**：DTO（Data Transfer Object）在**应用层与表现层/客户端之间**传输数据，把领域层与实体**完全隔离**。见[领域服务与应用服务](domain-application-services.md)。
> - **为什么**：抽象领域层、**数据隐藏**（不泄漏 `Password` 等字段）、避免实体序列化的**循环引用/延迟加载/整库拉取**问题。
> - **怎么写**：优先用 `record`（不可变、值相等、天生适合序列化）；DTO **不含业务逻辑**、**不引用实体**。
> - **输入 DTO 不复用**（每个用例一个）；**输出 DTO 可复用**（前提是所有属性都填满）。
> - 列表用**分页载体** `PagedResult<T>`（`Items` + `TotalCount`），是合法数据模型，**不是**统一 `Result<T>` 信封（[P15](../governance/policy.md)）。
> - 请求分页 DTO 必须**限制并校验上限**（防滥用）；排序走**白名单**（[分页](../dotnet/ef-core/pagination.md)）。
> - 映射**手写/LINQ 投影**，不用 AutoMapper（[P10](../governance/policy.md)）；序列化用 `System.Text.Json` **源生成**（AOT 友好）。

## 概述

**DTO** 是应用服务的**契约边界**：表现层（或其他客户端）用 DTO 作参数调用[应用服务](domain-application-services.md)，应用服务用领域对象执行业务逻辑，再（可选）返回 DTO。这样表现层与领域层彻底解耦。

**为什么值得为每个用例写 DTO：**

| 收益 | 说明 |
|------|------|
| **抽象领域层** | 只要应用服务的契约（方法签名 + DTO）不变，可自由重写领域层、换数据库 schema、换 ORM，而表现层不动。 |
| **数据隐藏** | `User` 实体有 `Password`，若 `GetUsers()` 直接返回 `List<User>`，即使界面不显示，客户端也能拿到密码。应用服务应**只返回该用例需要的字段**，不多不少。 |
| **避免序列化陷阱** | 实体间常有引用（`User → Roles → Permissions → …`）。序列化实体可能**顺藤摸瓜把整库序列化**，循环引用还会直接序列化失败。 |
| **避免延迟加载爆炸** | ORM 的延迟加载会在访问导航属性时触发额外查询；把实体丢给序列化器逐属性读取，会引发大量意外查询（N+1）。 |

> 铁律：**表现层不引用领域/业务层程序集**。DTO + 应用服务契约是唯一通道。

## 正确做法

### 1. 用 record 定义 DTO

现代 C# 首选 `record`：不可变、基于值相等、简洁，天然适合序列化边界（[P1](../governance/policy.md)、[record vs class](../comparisons/record-vs-class.md)）。

```csharp
// 输出 DTO：对应实体，但只暴露该用例需要的字段（隐藏 Password 等）
public sealed record ProductDto(Guid Id, string Name, decimal Price);

// 输入 DTO：仅含创建该资源所需字段 + 校验
public sealed record CreateProductDto(
    [property: Required, StringLength(128)] string Name,
    [property: Range(0, 1_000_000)] decimal Price);
```

- 需要传参构造又需序列化时，若用 `class`，建议保留一个**无参公共构造函数**；`record` / `init` 属性一般无此顾虑。
- 审计字段（`CreationTime`、`CreatorId`、`LastModificationTime` 等）按需在**输出 DTO** 上以普通属性体现，不要为了"框架基类"而继承实体。

### 2. 输入 DTO 与输出 DTO 分离

| 原则 | 说明 |
|------|------|
| 输入 DTO **只放该用例需要的属性** | 多余属性会让调用方困惑，也留下"某些字段在某些用例不生效"的坑。 |
| 输入 DTO **不要跨用例复用** | 不同用例需要不同字段；复用会导致部分字段在部分场景无意义，滋生 bug。 |
| 输出 DTO **可复用** | 前提：在**所有**返回路径都把属性**填满**，否则调用方拿到半空对象。 |

### 3. 列表与分页载体

返回列表时，直接返回 `List<ProductDto>` 也没错；但用统一**分页载体** `PagedResult<T>` 便于将来加字段不破坏客户端（如加 `TotalPages`）。这是承载数据的模型，**不是**"永远 200 + `{success,data,error}`"的统一信封（[P15](../governance/policy.md) 明确允许分页载体）。通用定义与可复用扩展放在 `SharedKernel`（实现详见 [EF Core 分页](../dotnet/ef-core/pagination.md)）：

```csharp
// 分页载体（放 SharedKernel）：纯数据模型，携带这一页 + 元数据
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}

// 分页请求 DTO（放 SharedKernel / Contracts）：构造时夹紧非法值，带硬上限防滥用
public sealed record PageRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; }
    public bool Descending { get; init; }

    public int SafePage => Page < 1 ? 1 : Page;
    public int SafeSize => Math.Clamp(PageSize, 1, 100);   // 上限防一次拉全表
    public string? Sorting =>
        string.IsNullOrWhiteSpace(SortBy) ? null : SortBy + (Descending ? " desc" : "");
}
```

应用服务里用**投影**直接查出 DTO；排序走**编译期表达式白名单**（`DynamicOrderByAllowList`，不反射、AOT 友好），分页下推数据库：

```csharp
// 模块内声明可排序白名单（键即前端可传的字段名，见分页页完整实现）
private static readonly DynamicOrderByAllowList<Product> Sortable = new()
    .Map(p => p.Name)
    .Map(p => p.Price);

public async Task<PagedResult<ProductDto>> GetListAsync(PageRequest req, CancellationToken ct)
{
    var query = db.Products
        .WithDynamicOrderBy(req.Sorting, Sortable)          // 白名单排序，"Name desc"
        .WithOffsetPaging((req.Page - 1) * req.PageSize, req.PageSize);
    var total = await query.CountAsync(ct);
    var items = await query
        .Select(p => new ProductDto(p.Id, p.Name, p.Price)) // 投影成 DTO
        .ToListAsync(ct);
    return new(items, total, req.Page, req.PageSize);
}
```

> `DynamicOrderByAllowList` / `WithDynamicOrderBy` / `WithOffsetPaging` 的完整实现见 [EF Core 分页](../dotnet/ef-core/pagination.md)；本页只讲 DTO 边界怎么用。注意 `PageRequest.PageSize` 必须服务端夹紧上限，客户端传超大值直接 **422**（见 [验证](../dotnet/aspnet-core/validation.md)）。

### 4. 映射：手写 / 投影优先

- **读路径**：LINQ `Select` 投影成 DTO（上例），高效且 AOT 安全。
- **写路径**：手写一行 `Map`/`ToEntity`，透明可调试。
- 不引 AutoMapper 等反射映射库（第三方且反射不兼容 AOT，[P10](../governance/policy.md)/[P16](../governance/policy.md)）。详见 [领域服务与应用服务 · DTO 手写映射](domain-application-services.md)。

### 5. 校验

DTO 是校验的落点：用标准 `System.ComponentModel.DataAnnotations`（`[Required]`、`[Range]`、`[StringLength]`）或实现 `IValidatableObject` 做跨字段校验；Minimal API 端点自动触发校验，失败返回 **422**（见 [验证](../dotnet/aspnet-core/validation.md)、[异常处理 ProblemDetails](../dotnet/aspnet-core/exception-handling.md)）。不引 FluentValidation（[P10](../governance/policy.md)）。

## 常见误区

❌ **直接返回 EF 实体** —— 泄漏内部字段（`Password`）、触发循环引用/延迟加载、可能"整库序列化"。**为什么错**：实体是领域内部结构，导航属性会被序列化器递归展开。用 DTO 只暴露该用例所需。

❌ **跨用例复用输入 DTO** —— 不同用例字段需求不同，复用后总有字段"这里用那里不用"。**为什么错**：调用方无法判断哪些字段有效，易传错、留 bug。每个用例一个输入 DTO。

❌ **在 DTO 里写业务逻辑** —— DTO 只承载数据（顶多做形式校验）。**为什么错**：业务规则属领域层；写进 DTO 会绕过领域不变量、无法复用。

❌ **不限制分页上限** —— `Take` 无上限。**为什么错**：客户端可一次请求百万条拖垮服务端；必须设默认值 + 硬上限并校验（422）。

❌ **再包统一 `Result<T>` 信封（永远 200）** —— 用真实 HTTP 状态码表达结果（[P15](../governance/policy.md)）。**为什么错**：吞掉 HTTP 语义，客户端/网关无法据状态码处理。分页载体 `PagedResult<T>` 例外（它只是数据模型）。

❌ **用反射映射库（AutoMapper 等）** —— 手写映射/投影更透明。**为什么错**：第三方依赖 + 运行期反射，破坏 AOT（[P10](../governance/policy.md)/[P16](../governance/policy.md)）。

## 适用版本

DTO 概念与版本无关；示例面向 net8+（`record`、`init`、Minimal API、EF Core 投影）。`record` 主构造 + `[property: ...]` 特性转发在 C# 10+ 可用。

### Native AOT 兼容性

DTO 本身是普通类型，**AOT 安全**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。关键点：

- 序列化用 `System.Text.Json` **源生成**（[`JsonSerializerContext`](../dotnet/csharp/serialization.md)），不用反射序列化。
- 映射用 LINQ 投影 / 手写，不用反射映射库。
- 排序等动态逻辑走**编译期白名单表达式**，不按字符串反射属性名（[分页](../dotnet/ef-core/pagination.md)）。

## 参考资料

- [领域服务与应用服务（DTO 手写映射）](domain-application-services.md) · [领域驱动设计](ddd.md) · [API 设计模式](api-design.md) · [CQRS](cqrs.md)
- [EF Core 分页（白名单排序）](../dotnet/ef-core/pagination.md) · [查询性能（投影）](../dotnet/ef-core/query-performance.md) · [验证](../dotnet/aspnet-core/validation.md) · [序列化源生成](../dotnet/csharp/serialization.md)
- 官方文档：[微服务应用层实现（DTO 与 Web API）](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-application-layer-implementation-web-api) · [面向 DDD 的微服务设计](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice)
