---
title: 配置与 Options 模式
summary: 多源分层合并的配置系统；强类型 Options 绑定、命名/验证/热更新、配置绑定源生成与 AOT。
tags: [configuration, options, settings]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/configuration
updated: 2026-07-10
---

# 配置与 Options 模式

> **要点速览**
> - 配置是**多源分层合并**（命令行 ＞ 环境变量 ＞ 环境 json ＞ 基础 json ＞ 默认值），后加的覆盖先前的同名键。
> - 用 **Options 模式**强类型绑定，别到处 `IConfiguration["Key"]` 取魔法字符串。
> - 三个消费接口：`IOptions<T>`（单例快照）/`IOptionsMonitor<T>`（监听热更新）/`IOptionsSnapshot<T>`（**scoped 每次刷新**）。
> - 启动即校验：`ValidateOnStart()` fail-fast；命名选项用 `Configure<TOptions>("name", ...)`。
> - 机密不进 `appsettings.json`：开发用 user-secrets，生产用密钥保管库/环境变量。

## 概述

.NET 的配置系统核心是一套**分层合并的 provider**：基础 `appsettings.json`、环境专属 `appsettings.{Environment}.json`、环境变量、命令行参数、用户机密（开发期）、密钥保管库（生产）等按顺序叠加，后加入的源覆盖先前的同名键。这让"同一份代码在不同环境取不同配置"成为默认能力，而不是靠 `if (isProd)` 硬编码。

读取配置不推荐到处 `IConfiguration["Key"]` 拿魔法字符串，而应使用 **Options 模式**：把一段配置绑定到一个强类型类，通过 `IOptions<T>` 等接口注入使用。它带来类型安全、可校验、可随文件热更新等好处。

## 正确做法

### 1. 绑定强类型选项 + 启动期校验

```csharp
public sealed class SmtpOptions
{
    [Required] public string Host { get; set; } = "";
    [Range(1, 65535)] public int Port { get; set; }
}

builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .ValidateOnStart();      // 启动即校验，配置非法直接起不来（fail-fast）
```

### 2. 三种消费接口，按生命周期选

| 接口 | 生命周期 | 何时用 |
|------|----------|--------|
| `IOptions<T>` | 单例快照（首次解析后固定） | 配置只读、进程内不变 |
| `IOptionsMonitor<T>` | 单例、可监听变更 | 单例服务想感知配置热更新 |
| `IOptionsSnapshot<T>` | **scoped**（每请求重新读） | 每请求需拿到最新配置（只能注入 scoped） |

```csharp
public class Mailer(IOptions<SmtpOptions> options)            // 单例，值固定
{
    private readonly SmtpOptions _cfg = options.Value;
}

public class HotReloader(IOptionsMonitor<SmtpOptions> mon)    // 监听变更
{
    public string HostNow => mon.CurrentValue.Host;
}

// scoped 服务才用 Snapshot
public class PerRequest(IOptionsSnapshot<SmtpOptions> snap)   // 每请求重新绑定
{
    public string Host => snap.Value.Host;
}
```

> 把 `IOptionsSnapshot<T>` 注入 **singleton** 会抛生命周期不匹配异常（capture dependency）。单例要热更新用 `IOptionsMonitor<T>`。

### 3. 命名选项（同一类型多个实例）

```csharp
builder.Services.Configure<CacheOptions>("memory", builder.Configuration.GetSection("Cache:Memory"));
builder.Services.Configure<CacheOptions>("redis",  builder.Configuration.GetSection("Cache:Redis"));

public class CacheRouter(IEnumerable<IOptionsMonitor<CacheOptions>> named)
{
    public CacheOptions Get(string name)
        => named.First(o => o.Name == name).CurrentValue;   // 按名字取对应配置
}
```

### 4. 用委托配置 / 自定义校验

不一定要从配置节绑定，也能用代码给默认值或复杂校验：

```csharp
builder.Services.AddOptions<RetryOptions>()
    .Configure(o => { o.Max = 5; })                          // 代码补默认值
    .Validate(o => o.Max > 0 && o.Max <= 10, "Max 必须 1–10")   // 自定义谓词校验
    .ValidateOnStart();
```

### 5. 机密管理

- 开发期：`dotnet user-secrets init` + `dotnet user-secrets set "Smtp:Password" ...`，写入本机、不进仓库。
- 生产期：用环境变量或密钥保管库（Azure Key Vault 等经 OTLP 中立方式接入，[P12](../../governance/policy.md) 不绑定云），经 `AddAzureKeyVault`/`AddKeyedAzureKeyVault` 或自托管方案挂进同一配置系统。
- **绝不**把连接字符串、密钥写进 `appsettings.json` 提交仓库。

### 6. AOT 下的配置绑定：用**源生成**，别用反射 `Bind`

Native AOT 禁反射，`ConfigurationBinder` 的反射式 `Bind`/`Get<T>()` 会失效。开启**配置绑定源生成器**：

```xml
<PropertyGroup>
  <EnableConfigurationBindingGenerator>true</EnableConfigurationBindingGenerator>
</PropertyGroup>
```

开启后，`GetRequiredSection("Smtp").Get<SmtpOptions>()` 等由源生成器在编译期产出绑定代码，AOT 下可用（详见 [AOT 兼容性矩阵](../aot/aot-compatibility.md)）。

## 常见误区

❌ **满代码 `configuration["Smtp:Port"]` 再手动 `int.Parse`**——魔法字符串易错、无类型、无校验。改用 Options 绑定。

❌ **在 singleton 里注入 `IOptionsSnapshot<T>`**：它是 scoped，会抛生命周期不匹配（capture dependency）。单例用 `IOptions<T>`/`IOptionsMonitor<T>`。

❌ **把密钥写进 `appsettings.json` 提交仓库**：泄露凭据。开发用 user-secrets，生产用环境变量/密钥保管库。

❌ **配置非法却拖到运行期才炸**：没开 `ValidateOnStart()`，服务起来了，用到时才抛。启动即校验 fail-fast，问题前移。

❌ **AOT 后端用反射式 `Bind`/`Get<T>`**：运行期反射被裁剪。开启 `EnableConfigurationBindingGenerator` 走源生成（见 §6）。

## 适用版本

配置系统与 Options 模式全版本通用；`ValidateOnStart()` 自 **net6**；**配置绑定源生成器**（`EnableConfigurationBindingGenerator`）随 .NET 8 引入并在 net9/10 完善。**命名选项**全版本通用。

### Native AOT 兼容性

兼容 Native AOT（[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）：开启 **配置绑定源生成器**后，强类型绑定在 AOT 下可用；`ValidateDataAnnotations` 校验走 `System.ComponentModel.DataAnnotations`，AOT 下需确保注解类型被保留（源生成器通常会一并处理）。机密接入不依赖反射。

## 参考资料

- [依赖注入](dependency-injection.md) · [组合与架构模式（Options/Host）](../../patterns/composition.md#options-pattern)
- [安全加固与机密（Data Protection）](data-protection.md) · [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[.NET 配置](https://learn.microsoft.com/dotnet/core/extensions/configuration) · [Options 模式](https://learn.microsoft.com/dotnet/core/extensions/options) · [配置绑定源生成](https://learn.microsoft.com/dotnet/core/extensions/configuration/#configuration-binding-source-generator)
