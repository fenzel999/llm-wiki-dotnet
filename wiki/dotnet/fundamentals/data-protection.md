---
title: 安全加固（Data Protection 与机密管理）
summary: 用内置 Data Protection 加密敏感数据、共享密钥环，用 user-secrets/环境变量管理机密，杜绝硬编码。
tags: [security, data-protection, secrets, 加密, 机密]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet/core/security/data-protection/introduction
updated: 2026-07-10
---

> **要点速览**
> - 加密短期敏感数据用内置 **Data Protection**（`Protect`/`Unprotect`），别自己搓加密。
> - 多实例/容器**必须共享持久密钥环** + 固定 `ApplicationName`，否则跨实例解不开。
> - 机密（连接串/密钥）**绝不硬编码**：开发用 user-secrets、生产用环境变量/密钥库。
> - 它面向短期可轮换数据；密码用专用哈希，长期字段用专门加密。

## 概述

应用里总有需要加密保护的短期敏感数据：防伪令牌、临时票据、需要往返客户端又不能被篡改的值。.NET 内置的 **Data Protection**（`Microsoft.AspNetCore.DataProtection`）就是干这个的——它提供简单的 `Protect`/`Unprotect` API，底层自动管理密钥的生成、轮换与过期，你不必自己碰加密算法（自己搓加密几乎必错）。ASP.NET Core 的很多功能（认证 Cookie、防伪、TempData）本身就建立在它之上。

两个要点：**多实例/容器部署必须共享密钥环**——否则实例 A 加密的数据实例 B 解不开，默认存本地目录在容器里会丢，应持久化到共享位置（可自托管的文件共享/开源存储，不绑定付费云，见 [P12](../../governance/policy.md)）。**机密（连接串、API Key、签名密钥）绝不硬编码**：开发期用 user-secrets，生产期用环境变量或自托管密钥库。

## 正确做法

用 Data Protection 加解密敏感短期数据，按用途隔离 purpose：

```csharp
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo("/keys"))   // 多实例共享的持久密钥环
    .SetApplicationName("orders-app");                      // 同名应用才能互解

public class TicketService(IDataProtectionProvider provider)
{
    private readonly IDataProtector _p = provider.CreateProtector("tickets.v1"); // purpose 隔离
    public string Protect(string raw)   => _p.Protect(raw);
    public string Unprotect(string tok) => _p.Unprotect(tok);
}
```

机密用配置系统的安全源，开发期：

```bash
dotnet user-secrets set "Db:ConnectionString" "Host=...;Password=..."
```

## 常见误区

❌ 自己用 `Aes`/裸算法手搓加密与密钥管理。极易出错（IV 复用、密钥硬编码、无轮换）。用 Data Protection。

❌ 多实例部署不共享密钥环，或密钥存容器本地目录——重启/扩容后旧令牌全部失效、跨实例解密失败。持久化到共享位置并固定 `ApplicationName`。

❌ 把连接串、密钥写进 `appsettings.json` 提交仓库。用 user-secrets（开发）/环境变量（生产），密钥进密钥库。

❌ 用 Data Protection 存长期数据（如落库的密码）。它面向短期可轮换数据；密码应用专用哈希（如 `PasswordHasher`），长期字段用专门的加密方案。

## 适用版本

Data Protection 各受支持版本通用；user-secrets 为开发期工具。

## 参考资料

- [认证与授权](../aspnet-core/auth.md)
- [配置与 Options](configuration-options.md)
- 官方文档：[ASP.NET Core Data Protection](https://learn.microsoft.com/aspnet/core/security/data-protection/introduction)
- 官方文档：[开发中的机密管理](https://learn.microsoft.com/aspnet/core/security/app-secrets)
