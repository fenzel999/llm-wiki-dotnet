---
title: API 设计模式
summary: RESTful 设计规范、版本控制、错误处理、分页/筛选/排序、幂等性、乐观并发、HATEOAS 取舍；仅用 Minimal API + 标准库。
tags: [architecture, api-design, rest, http, versioning, pagination]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis
updated: 2026-07-11
---

# API 设计模式

> **要点速览**
> - 资源导向 URL、标准 HTTP 语义、ProblemDetails 错误、光标/偏移分页、ETag/If-None-Match 缓存。
> - 版本用 URL 前缀 `/api/v1/`；破坏性变更新版本，增量字段不破坏。
> - 幂等用 `Idempotency-Key` 保护非幂等写入；`ETag/If-Match` 乐观并发。
> - 仅用 Minimal API + 标准库；不引入 Swashbuckle/FluentValidation/第三方 SDK。

## 概述

API 是系统对外的契约，**稳定、可演进、可观测** 是核心目标。本页给出在 .NET Minimal API + 标准库下的落地规范，不依赖第三方框架。

## 资源与 URL 设计

| 规范 | 示例 | 说明 |
|------|------|------|
| 名词复数、小写、短横线 | `/api/v1/users/{id}/orders` | 资源集合用复数 |
| 层级不超过 3 层 | `/users/{id}/orders/{id}/items` | 过深改用查询参数或扁平化 |
| 动作用 HTTP 方法 | `POST /orders`、`GET /orders/{id}` | 不在 URL 放动词 |
| 版本用 URL 前缀 | `/api/v1/`、`/api/v2/` | 破坏性变更新版本，URL 显式 |

### 版本控制策略

| 策略 | 适用场景 | 实现 |
|------|----------|------|
| URL 前缀 | 公开 API、破坏性变更多 | `/api/v1/`、`/api/v2/`（默认推荐） |
| Header `Api-Version` | 内部 API、版本少 | `Api-Version` Header + `MapGroup` |
| 查询参数 `?v=1` | 简单场景 | 不推荐公开 API |

**Minimal API 实现**：

```csharp
var v1 = app.MapGroup("/api/v1").WithTags("v1");
var v2 = app.MapGroup("/api/v2").WithTags("v2");

v1.MapGet("/users", GetUsersV1);
v2.MapGet("/users", GetUsersV2); // 新增字段，不破坏 v1
```

## HTTP 语义与状态码

| 场景 | 状态码 | 说明 |
|------|--------|------|
| 成功获取 | `200 OK` | GET 成功 |
| 成功创建 | `201 Created` | Location 指向新资源 |
| 成功无内容 | `204 No Content` | DELETE/PATCH 成功无返回体 |
| 客户端错误 | `400 Bad Request` | 参数校验失败、格式错误 |
| 未授权 | `401 Unauthorized` | 无/无效 Token |
| 无权限 | `403 Forbidden` | 有 Token 但权限不足 |
| 不存在 | `404 Not Found` | 资源不存在 |
| 冲突 | `409 Conflict` | 幂等键冲突、并发冲突 |
| 验证失败 | `422 Unprocessable Entity` | 语义校验失败（字段约束） |
| 服务端错误 | `500 Internal Server Error` | 未预期异常（记录日志、返回追踪 ID） |

**错误统一格式（RFC 9457 ProblemDetails）**：

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Validation Failed",
  "status": 422,
  "traceId": "0HMQU9V2K7G8V",
  "errors": {
    "email": ["格式无效"],
    "qty": ["必须大于 0"]
  }
}
```

**Minimal API 统一异常处理**（见 `exception-handling.md`）：

```csharp
app.UseExceptionHandler(opt => opt.Run(async ctx =>
{
    var problem = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var pd = new ProblemDetails
    {
        Status = StatusCodes.Status500InternalServerError,
        Title = "Internal Error",
        TraceId = ctx.TraceIdentifier
    };
    ctx.Response.StatusCode = pd.Status.Value;
    await ctx.Response.WriteAsJsonAsync(pd);
}));
```

## 分页、筛选、排序

### 偏移分页（简单场景）

```
GET /api/v1/users?page=2&pageSize=20
```

响应：

```json
{
  "items": [...],
  "page": 2,
  "pageSize": 20,
  "totalCount": 1045,
  "totalPages": 53
}
```

> 字段名与 [DTO 分页载体 `PagedResult<T>`](dto.md)（PascalCase `Items/TotalCount/Page/PageSize/TotalPages`）对应；序列化用 `System.Text.Json` 源生成时默认保留 PascalCase 属性名。

### 游标分页（大数据/高并发）

```
GET /api/v1/users?after=cursor_xyz&limit=20
```

响应：

```json
{
  "items": [...],
  "nextCursor": "cursor_abc",
  "hasMore": true
}
```

### 筛选与排序

```
GET /api/v1/users?filter[name]=john&filter[status]=active&sort=-createdAt,email
```

- 筛选：`filter[字段]=值`，支持多字段 AND
- 排序：`sort=字段` 升序，`sort=-字段` 降序，逗号分隔多字段
- **白名单机制**：仅允许预定义字段（防 SQL 注入、防性能失控）

## 幂等性与乐观并发

### 幂等键（写入去重）

```http
POST /api/v1/orders
Idempotency-Key: a1b2-c3d4-e5f6
Content-Type: application/json

{ "userId": 1, "items": [...] }
```

- 服务端记录 `Idempotency-Key` + 响应，4h 内重复键直接返回原响应
- 仅用于非幂等写入（POST）；GET/PUT/DELETE 天然幂等无需

### 乐观并发（ETag / If-Match）

```http
GET /api/v1/users/123
ETag: "abc123"

PATCH /api/v1/users/123
If-Match: "abc123"
{ "email": "new@example.com" }
```

- 响应 `ETag`；写入需带 `If-Match`，版本不匹配返回 `412 Precondition Failed`
- 实现：实体含 `RowVersion`/`xmin`/`ETag` 字段，EF Core 乐观并发拦截

## 缓存与条件请求

| 头 | 用途 | 示例 |
|----|------|------|
| `ETag` | 资源版本标识 | `ETag: "v1-abc123"` |
| `If-None-Match` | 条件 GET | `If-None-Match: "v1-abc123"` → `304 Not Modified` |
| `If-Match` | 条件写入 | `If-Match: "v1-abc123"` → `412` 冲突 |
| `Cache-Control` | 缓存策略 | `Cache-Control: public, max-age=60` |
| `Vary` | 变体缓存 | `Vary: Accept-Encoding, Authorization` |

**Minimal API 实现**：

```csharp
app.MapGet("/users/{id}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();
    var etag = $"\"{user.RowVersion}\"";
    return Results.Ok(user)
        .WithETag(etag)
        .WithHeader("Cache-Control", "public, max-age=60");
});
```

## HATEOAS（可选）

仅当客户端需**自发现**能力时加入（如通用客户端、SDK 生成）。多数内部/移动端 API **不需要**。

```json
{
  "id": 1,
  "name": "John",
  "_links": {
    "self": { "href": "/api/v1/users/1" },
    "orders": { "href": "/api/v1/users/1/orders" }
  }
}
```

## 安全与合规

| 规范 | 做法 |
|------|------|
| HTTPS 强制 | 全站 HTTPS；HSTS、CSP、X-Frame-Options |
| 认证 | JWT Bearer（AOT 兼容）；Cookie/OIDC 仅非 AOT 前端 |
| 授权 | Policy-based（`RequireAuthorization("Admin")`） |
| 速率限制 | `MapGet(...).RequireRateLimiting("fixed")` |
| 输入验证 | DataAnnotations + `IValidatableObject`；`FluentValidation` 不用 |
| 敏感数据 | 连接串/密钥走配置系统 + 密钥库；不进代码/日志 |
| 审计 | 写入操作记录 `UserId`、`TraceId`、`Before/After` 快照 |

## 观测性内建

| 能力 | 实现 |
|------|------|
| 请求/响应日志 | `UseHttpLogging()` + 结构化日志 |
| 指标 | `dotnet-counters`、`prometheus-net`、`/metrics` |
| 分布式追踪 | `ActivitySource` + `OpenTelemetry` → Jaeger/Zipkin |
| 关联 ID | `TraceId` 透传 Header `X-Correlation-ID`，日志/追踪/错误自动关联 |

> 观测性**导出走 OTLP + 开源后端**（Prometheus / Grafana / Jaeger，见 [可观测性](../dotnet/fundamentals/observability.md)），符合 [P12](../governance/policy.md)。表中 `prometheus-net` 是**可选社区库、非微软/.NET 基金会**（[P10](../governance/policy.md)），非必需；用内置 `ActivitySource` + OTLP 即可满足。

## 文档与契约测试

| 工具 | 用途 |
|------|------|
| OpenAPI 静态生成 | `AddOpenApi()` + `MapOpenApi()` → `/openapi/v1.json` |
| 契约测试 | `PactNet` (Provider 验证) / `Refit` (Client 生成) |
| 示例生成 | `dotnet-openapi` 生成 Client SDK（TS/C#/Python） |

> `PactNet` / `Refit` 是**可选社区工具、非微软/.NET 基金会**（[P10](../governance/policy.md)），非本库推荐基线；核心契约用内置 `AddOpenApi()` + `MapOpenApi()` 生成 OpenAPI 文档即可。

## 常见误区

❌ **URL 放动词** `/api/v1/getUsers` → `/api/v1/users`  
❌ **以为 `EnableOpenApi` 就能生成完整文档** —— 需在端点上显式 `.Produces()`、`.WithName()`、`.WithTags()` 等元数据，否则生成文档空洞  
❌ **以为 AOT 下 `MapControllers()` 也能用源生成** —— **MVC/Controller 完全不支持 AOT**，必须用 Minimal API  

### Native AOT 兼容性

API 设计本身与 AOT 不冲突，关键在于**落地手段**必须选 AOT 友好路径（[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：

- **端点用 Minimal API**（不用 MVC/控制器，完全不支持 AOT）——见 [ASP.NET Core 10](../dotnet/aspnet-core/aspnet-core-10.md)。
- **认证用 JWT Bearer**（✅ AOT）；Cookie / OIDC ❌ 不兼容 AOT，非 AOT 前端才能用——见 [认证与授权](../dotnet/aspnet-core/auth.md)。
- **错误响应走 `ProblemDetails`**（源生成），不用统一 `Result<T>` 信封——见 [全局异常处理](../dotnet/aspnet-core/exception-handling.md)。
- **JSON 序列化用 `System.Text.Json` 源生成**（`JsonSerializerContext`），不用反射序列化——见 [序列化](../dotnet/csharp/serialization.md)。
- **分页/排序用编译期表达式白名单**（[分页](../dotnet/ef-core/pagination.md)），不按字符串反射属性名。

## 何时使用

- 对外暴露 HTTP 能力、需要稳定契约、版本策略与一致错误模型时。
- 需要分页/筛选/排序、幂等、乐观并发等标准契约时。

## 与其他模式的关系

- 契约服务于 [微服务](microservices.md) / [API 网关与 BFF](api-gateway-bff.md) / [模块化单体](modular-monolith.md) 的端点；错误模型用 ASP.NET Core 内建（[ASP.NET Core 10](../dotnet/aspnet-core/aspnet-core-10.md)）。
- 与 [事件驱动](event-driven.md)（集成事件）分工：**同步契约 vs 异步事件**。
- 仅用 Minimal API + 标准库，不引 Swashbuckle/Scalar（[POLICY P10](../governance/policy.md)）。
- 见 [架构总览与决策指南](overview.md) 学习路径第 9 步。

## 参考资料
- [ASP.NET Core Native AOT 支持](https://learn.microsoft.com/aspnet/core/fundamentals/native-aot)
- [Minimal API 概述](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis)
- [System.Text.Json 源生成](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/source-generation)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md) · [持久约定 POLICY](../governance/policy.md) · [架构分类](enterprise-patterns.md)
