---
title: 配置与 Options 模式
summary: 多源合并的配置系统，配合强类型 Options 模式把配置绑定成对象并做启动期校验。
tags: [configuration, options, settings, 校验]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/configuration
updated: 2026-07-10
---

## 概述

.NET 的配置系统是"多源分层合并"的：`appsettings.json`、环境专属的 `appsettings.{Environment}.json`、环境变量、命令行参数、用户机密（开发期）、密钥保管库（生产）等按顺序叠加，后加入的源覆盖先前的同名键。这套机制让"同一份代码在不同环境用不同配置"成为默认能力，而不是靠 `if (isProd)` 硬编码。

读取配置不推荐到处 `IConfiguration["Key"]` 拿魔法字符串，而应使用 **Options 模式**：把一段配置绑定到一个强类型类上，通过 `IOptions<T>` 注入使用。它带来类型安全、可校验、可随文件热更新（`IOptionsSnapshot`/`IOptionsMonitor`）等好处。

## 正确做法

定义一个配置类，绑定到配置节，并注册**启动期校验**——配置不合法就让应用起不来，而不是运行到一半才炸：

```csharp
public sealed class SmtpOptions
{
    [Required] public string Host { get; set; } = "";
    [Range(1, 65535)] public int Port { get; set; }
}

builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .ValidateOnStart();      // 启动即校验，fail-fast
```

使用时注入合适的接口：单例服务里用 `IOptions<T>`（值固定）；需要随配置文件热更新则用 `IOptionsMonitor<T>`；在 scoped（每请求）场景用 `IOptionsSnapshot<T>`：

```csharp
public class Mailer(IOptions<SmtpOptions> options)
{
    private readonly SmtpOptions _cfg = options.Value;
}
```

## 常见误区

❌ 满代码 `configuration["Smtp:Port"]` 取值再手动 `int.Parse`——魔法字符串易错、无类型、无校验。改用 Options 绑定。

❌ 在 singleton 服务里注入 `IOptionsSnapshot<T>`：它是 scoped 生命周期，会抛生命周期不匹配异常。单例用 `IOptions<T>` 或 `IOptionsMonitor<T>`。

❌ 把连接字符串、密钥直接写进 `appsettings.json` 提交到仓库。开发期用 user-secrets，生产期用环境变量或密钥保管库。

## 适用版本

配置系统与 Options 模式全版本通用；`ValidateOnStart()` net6+。

## 参考资料

- [依赖注入](dependency-injection.md)
- [组合与架构模式](../../patterns/composition.md#options-pattern)
- 官方文档：[.NET 配置](https://learn.microsoft.com/dotnet/core/extensions/configuration)
- 官方文档：[Options 模式](https://learn.microsoft.com/dotnet/core/extensions/options)
