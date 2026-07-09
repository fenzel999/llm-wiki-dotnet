---
title: ASP.NET Core 原生 OpenAPI 3.1
summary: .NET 10 内置生成 OpenAPI 3.1 文档，不依赖 Swashbuckle/Swagger。
tags: [aspnetcore, openapi, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

.NET 10 的 ASP.NET Core 原生支持生成 OpenAPI 3.1（一种描述 HTTP API 的规范）文档。**不再需要 Swashbuckle（Swagger）**：内置的 `Microsoft.AspNetCore.OpenApi` 直接产出符合 3.1 的文档，并与最小 API 元数据、JSON Schema 对齐（3.1 完全兼容 JSON Schema），便于工具链消费。

> 约定：**本项目不使用 Swagger/Swashbuckle**。API 文档由 .NET 10 原生 `AddOpenApi()` 生成。

## 正确做法

注册并暴露文档端点：

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
var app = builder.Build();

app.MapOpenApi();   // 暴露 /openapi/v1.json

app.MapGet("/ping", () => "pong")
   .WithSummary("健康检查");

app.Run();
```

可通过文档转换器自定义信息：

```csharp
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((doc, ctx, ct) =>
    {
        doc.Info.Title = "My API";
        return Task.CompletedTask;
    });
});
```

## 常见错误

- 继续引用 Swashbuckle：`AddSwaggerGen` / `UseSwagger` / `UseSwaggerUI` 不应出现；一律改用原生 `AddOpenApi()` + `MapOpenApi()`。
- 期望内置生成同时提供交互式 UI：`AddOpenApi` 只生成文档（JSON）。若需要 UI，引入轻量替代品（如 Scalar，而非 Swagger UI），并指向 `MapOpenApi` 的文档端点。
- 混用旧 Swashbuckle 配置与新内置 API，产生两份文档。
- 依赖 3.0 独有的写法而未适配 3.1 的 JSON Schema 语义（如 `nullable` 表达方式变化）。

## 适用版本

=== "net10"
    原生 `AddOpenApi()` 生成 **OpenAPI 3.1** 文档（本库约定做法）。

=== "net9"
    原生 `AddOpenApi()` 已可用，生成 **OpenAPI 3.0**；升级到 net10 即得到 3.1。

=== "net8"
    无内建 OpenAPI 生成器，需第三方库（如 Swashbuckle）。如本库已统一到 net10，推荐直接升级。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[最小 API 内置验证](minimal-api-validation.md)

