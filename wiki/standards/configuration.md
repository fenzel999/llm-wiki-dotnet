---
title: 配置规范
summary: 使用 Options 模式强类型绑定配置，避免散落的字符串键。
tags: [standard, configuration]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/options
updated: 2026-07-09
---

## 规则

- 配置应使用 **Options 模式**（见 [Options 模式](../patterns/options-pattern.md)）强类型绑定，而非到处读取 `IConfiguration["SomeKey"]` 字符串。
- 使用 `GetRequiredSection` 获取必填节，缺失时尽早失败（fail-fast）。
- 在 `Configure<TOptions>` 时通过 `ValidateDataAnnotations` 或 `Validate` 进行绑定校验。
- 避免把配置键（`"ConnectionStrings:Default"`）作为字符串散落在业务代码中。
- 绑定类型使用 `record` 或不可变类，属性命名与配置节一致（可用 `[ConfigurationKeyName]` 映射）。

## 正确做法

```csharp
public class DatabaseOptions
{
    public const string SectionName = "Database";

    public string ConnectionString { get; set; } = string.Empty;
    public int MaxPoolSize { get; set; } = 100;
    public TimeSpan CommandTimeout { get; set; } = TimeSpan.FromSeconds(30);
}

// 注册（Program.cs）
builder.Services
    .AddOptions<DatabaseOptions>()
    .BindConfiguration(DatabaseOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

// 使用
public class OrderSettings
{
    private readonly DatabaseOptions _options;
    public OrderSettings(IOptions<DatabaseOptions> options) => _options = options.Value;
}
```

```json
{
  "Database": {
    "ConnectionString": "Server=.;Database=Orders",
    "MaxPoolSize": 200,
    "CommandTimeout": "00:00:45"
  }
}
```

## 反例

```csharp
// 错误：散落的字符串键，无类型校验
var cs = _config["Database:ConnectionString"];
var pool = int.Parse(_config["Database:MaxPoolSize"]!);
if (string.IsNullOrEmpty(cs)) { /* 运行时才发现问题 */ }
```

## 理由

Options 模式把字符串键集中到绑定类型，提供编译期类型安全、默认值与启动期校验。服务通过依赖注入获取强类型对象，避免各处重复解析与拼写错误。`ValidateOnStart` 让错误配置在应用启动而非运行时请求时才暴露。
