---
title: Options 模式（强类型配置）
summary: 用强类型类绑定配置，通过 IOptions 注入并校验，避免散落的字符串键。
tags: [pattern, configuration]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/options
updated: 2026-07-09
---

## 意图

把 `appsettings.json` 等配置绑定到强类型（strongly-typed）类，避免代码中散落魔法字符串键；通过 `IOptions` / `IOptionsSnapshot` / `IOptionsMonitor` 注入，并在启动时校验，符合 [配置规范（configuration）](../standards/configuration.md)。

## 正确做法

定义配置类并绑定：

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

注册与校验：

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

用 DataAnnotations 做校验：

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

## 何时使用 / 何时不用

- 使用：任何需要从配置源读取、需在多处共享的结构化设置。
- 使用：`IOptionsMonitor` 用于单例服务需要实时感知配置变更；`IOptionsSnapshot` 用于作用域/瞬态服务每次解析拿最新值。
- 不用：不要直接 `Configuration["Key"]` 到处取值，失去类型安全与校验。
- 不用：机密信息（密钥）应走 Secret Manager / 环境变量，勿入源码。

## 参考资料

- [依赖注入](../concepts/dependency-injection.md)
- [Generic Host](../patterns/generic-host.md)
- [配置规范（configuration）](../standards/configuration.md)

