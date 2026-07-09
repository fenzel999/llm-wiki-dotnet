---
title: ASP.NET Core 原生 OpenAPI 3.1
summary: .NET 10 内置生成 OpenAPI 3.1 文档，无需第三方 Swagger 生成器。
tags: [aspnetcore, openapi, swagger, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

.NET 10 的 ASP.NET Core 原生支持生成 OpenAPI 3.1（一种描述 HTTP API 的规范）文档。相较早期依赖 Swashbuckle 等第三方库，内置 `Microsoft.AspNetCore.OpenApi` 直接产出符合 3.1 的文档，并与最小 API 元数据、JSON Schema 对齐（3.1 完全兼容 JSON Schema），便于工具链消费。

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
<!-- ⚠️ needs-your-call: 确认 .NET 10 生成的默认 openapi 版本号即为 3.1 -->

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

- 期望内置生成同时提供 Swagger UI：`AddOpenApi` 只生成文档，UI 需额外引入（如 Scalar / Swagger UI）。
- 混用旧 Swashbuckle 配置与新内置 API，产生两份文档。
- 依赖 3.0 独有的写法而未适配 3.1 的 JSON Schema 语义（如 `nullable` 表达方式变化）。

## 适用版本

=== "net10"
    原生生成 OpenAPI 3.1 文档。

=== "net8"
    内置 `AddOpenApi` 生成 3.0，或使用第三方库。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[最小 API 内置验证](minimal-api-validation.md)

