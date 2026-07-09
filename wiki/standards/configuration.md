---
title: 配置规范
summary: 使用 Options 模式强类型绑定配置，避免散落的字符串键。
tags: [standard, configuration]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/options
updated: 2026-07-10
---

## 概述

配置规范主张用 Options 模式把散落在各处的字符串配置键集中到强类型对象上，从而换取编译期类型安全、默认值与启动期校验。当配置以绑定类型而非原始字符串的形式注入到服务中时，拼写错误与类型错误能在构建或启动阶段被发现，而不是在运行时请求中才暴露。这种做法既减少了重复解析，也让配置来源与业务代码解耦，便于测试与演进。

## 正确做法

推荐用强类型选项类承载配置，并通过 `GetRequiredSection` 获取必填节，让缺失配置尽早失败（fail-fast）。在 `Configure<TOptions>` 时结合 `ValidateDataAnnotations` 或 `Validate` 做绑定校验，并用 `ValidateOnStart` 把校验前移到应用启动时刻。绑定类型的属性命名应与配置节一致，必要时用 `[ConfigurationKeyName]` 做映射；使用 `record` 或不可变类能让配置在注入后不被意外修改。

下方示例中，`DatabaseOptions` 集中声明了节名与默认值，注册时完成绑定与校验，业务类通过 `IOptions<DatabaseOptions>` 直接拿到强类型对象，不再触碰任何字符串键。

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

对应的 `appsettings.json` 节如下：

```json
{
  "Database": {
    "ConnectionString": "Server=.;Database=Orders",
    "MaxPoolSize": 200,
    "CommandTimeout": "00:00:45"
  }
}
```

## 反例（常见错误）

❌ 下面这种做法直接读取字符串键并在业务代码里手动解析，既没有类型校验，也要等到运行时才可能发现配置缺失：

```csharp
// 错误：散落的字符串键，无类型校验
var cs = _config["Database:ConnectionString"];
var pool = int.Parse(_config["Database:MaxPoolSize"]!);
if (string.IsNullOrEmpty(cs)) { /* 运行时才发现问题 */ }
```

其他常见错误：

- 把配置键字符串（如 `"ConnectionStrings:Default"`）硬编码在多个业务文件中，重构时极易遗漏。
- 使用 `IOptions` 却未配置任何校验，让非法配置一路传递到运行时。
- 用可变的普通类承载配置，导致注入后配置被业务代码悄悄改写。

## 适用版本

这些规范通用，本节省略（不写任何版本选项卡）。

## 参考资料

- 相关：[Options 模式](../patterns/options-pattern.md)
- 相关：[异常处理](../standards/exception-handling.md)
- 官方文档：[Options pattern in .NET](https://learn.microsoft.com/dotnet/core/extensions/options)
