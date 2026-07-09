---
title: Options 模式（强类型配置）
summary: 用强类型类绑定配置，通过 IOptions 注入并校验，避免散落的字符串键。
tags: [pattern, configuration]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/options
updated: 2026-07-10
---

## 概述

Options 模式把 `appsettings.json` 等配置源绑定到强类型（strongly-typed）类，避免在代码中散落魔法字符串键，并通过 `IOptions` / `IOptionsSnapshot` / `IOptionsMonitor` 注入，在启动时完成校验。当你需要在多处共享结构化设置、或希望获得类型安全与启动期校验时，应当使用它；而零星的一次性取值直接读 `Configuration["Key"]` 会丧失类型安全与校验，应当避免。机密信息则应走 Secret Manager / 环境变量，不应写入源码。

## 正确做法

先定义配置类，并为对应的配置节声明一个 `Section` 常量，便于后续绑定：

```csharp
namespace App.Config;

public sealed class NotificationOptions
{
    public const string Section = "Notification";

    public string SmtpHost { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string From { get; set; } = string.Empty;
}
```

通过 `AddOptions<T>()` 绑定配置节、挂上 DataAnnotations 校验，并在启动时校验，避免错误配置进入运行期：

```csharp
using Microsoft.Extensions.Options;

builder.Services.AddOptions<NotificationOptions>()
    .Bind(builder.Configuration.GetSection(NotificationOptions.Section))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// 使用 IOptionsSnapshot（每次请求重新读取，适合可热更新配置）
public sealed class Notifier
{
    private readonly NotificationOptions _options;
    public Notifier(IOptionsSnapshot<NotificationOptions> options)
        => _options = options.Value;

    public void Send(string to, string body)
        => Console.WriteLine($"[{_options.SmtpHost}:{_options.Port}] -> {to}");
}
```

校验本身借助 DataAnnotations 标注在属性上，框架会在启动期拦截非法配置：

```csharp
using System.ComponentModel.DataAnnotations;

public sealed class NotificationOptions
{
    public const string Section = "Notification";

    [Required] public string SmtpHost { get; set; } = string.Empty;
    [Range(1, 65535)] public int Port { get; set; } = 587;
    [Required, EmailAddress] public string From { get; set; } = string.Empty;
}
```

## 反例（常见错误）

❌ 直接在业务代码中散落字符串键取值，失去类型安全与集中校验：

```csharp
var host = Configuration["Notification:SmtpHost"]; // 拼写错误仅在运行期暴露
var port = int.Parse(Configuration["Notification:Port"]); // 无校验、易崩溃
```

- 用错接口：单例服务需要实时感知配置变更却用了 `IOptions`，应改用 `IOptionsMonitor`。
- 把密钥等机密写进 `appsettings.json`：应走 Secret Manager / 环境变量。
- 忽略 `ValidateOnStart`：错误配置要等到运行时才暴露，而非启动即失败。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- 相关：[依赖注入](../concepts/dependency-injection.md)
- 相关：[Generic Host](../patterns/generic-host.md)
- 相关：[配置规范（configuration）](../standards/configuration.md)
- 官方文档：[.NET Options 模式](https://learn.microsoft.com/dotnet/core/extensions/options)
