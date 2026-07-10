---
title: 安全加固（Data Protection 与机密管理）
summary: 用内置 Data Protection 加密短期可轮换数据；密码用专用哈希；机密走 user-secrets/密钥库，多实例共享密钥环。
tags: [security, data-protection, secrets]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/security/data-protection/introduction
updated: 2026-07-10
---

# 安全加固（Data Protection 与机密管理）

> **要点速览**
> - 加密**短期可轮换**的敏感数据用内置 **Data Protection**（`Protect`/`Unprotect`），别自己搓加密。
> - **密码**用专用哈希（`IPasswordHasher<T>`），不是 Data Protection——两者用途不同。
> - 多实例/容器**必须共享持久密钥环** + 固定 `ApplicationName`，否则跨实例解不开。
> - 机密（连接串/密钥）**绝不硬编码**：开发用 user-secrets、生产用环境变量/自托管密钥库。
> - 厂商中立：密钥环用可自托管存储，不绑定付费云（[P12](../../governance/policy.md)）。

## 概述

应用里总有要加密保护的短期敏感数据：防伪令牌、临时票据、需往返客户端且不可篡改的值。.NET 内置的 **Data Protection**（`Microsoft.AspNetCore.DataProtection`）提供简单的 `Protect`/`Unprotect`，底层自动管理密钥的生成、轮换、过期——你不必自己碰算法（自己搓加密几乎必错）。ASPNET Core 的认证 Cookie、防伪、TempData 都建立在它之上。

要点：**多实例部署必须共享密钥环**——默认存本地目录，在容器里会丢、实例间不互通，应持久化到共享位置（可自托管文件共享/开源存储，不绑云，见 [P12](../../governance/policy.md)）。**机密（连接串、API Key、签名密钥）绝不硬编码**：开发期 user-secrets，生产期环境变量或自托管密钥库。

## 正确做法

### 1. Data Protection：按 purpose 隔离 + 共享密钥环

```csharp
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo("/keys"))   // 多实例共享的持久密钥环（可自托管）
    .SetApplicationName("orders-app");                      // 同名应用才能互解

public class TicketService(IDataProtectionProvider provider)
{
    private readonly IDataProtector _p = provider.CreateProtector("tickets.v1"); // purpose 隔离
    public string Protect(string raw)  => _p.Protect(raw);
    public string Unprotect(string tok) => _p.Unprotect(tok);
}
```

### 2. 密码：用专用哈希，不是 Data Protection

Data Protection 面向**短期可轮换**数据；凭据应单向哈希、不可还原：

```csharp
public class AccountService(IPasswordHasher<User> hasher)
{
    public string Hash(string password) => hasher.HashPassword(user: null!, password);  // 返回含盐哈希
    public bool Verify(string hashed, string password)
        => hasher.VerifyHashedPassword(user: null!, hashed, password) == PasswordVerificationResult.Success;
}
// 用 ASP.NET Core Identity 时 IUserPasswordStore 自带 IPasswordHasher 集成
```

### 3. 机密管理

| 环境 | 方式 |
|------|------|
| 开发 | `dotnet user-secrets set "Db:ConnectionString" "..."`（本机、不进仓库） |
| 生产 | 环境变量，或自托管密钥库经配置系统接入 |

```bash
dotnet user-secrets set "Db:ConnectionString" "Host=...;Password=..."
```

## 常见误区

❌ **自己用 `Aes`/裸算法手搓加密与密钥管理**。极易出错（IV 复用、密钥硬编码、无轮换）。用 Data Protection。

❌ **多实例不共享密钥环，或密钥存容器本地目录**——重启/扩容后旧令牌全失效、跨实例解密失败。持久化到共享位置并固定 `ApplicationName`。

❌ **把连接串/密钥写进 `appsettings.json` 提交仓库**。用 user-secrets（开发）/环境变量（生产），密钥进密钥库。

❌ **用 Data Protection 存密码/长期机密**。`Protect` 是**可还原**加密、面向短期可轮换数据；密码应**单向哈希**（`IPasswordHasher`），长期机密走密钥库而非可还原加密。

## 适用版本

Data Protection 与 `IPasswordHasher<T>` 各受支持版本通用；user-secrets 为开发期工具。密钥环持久化位置 API 全版本一致。

### Native AOT 兼容性

Data Protection 与 `IPasswordHasher` 的注册/使用**兼容 Native AOT**（[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）：依赖注入与算法调用无运行期反射。密钥环持久化（文件系统/存储）是 IO 操作，不受 AOT 影响。机密经配置系统注入，注意开启配置绑定源生成（见 [配置与 Options](configuration-options.md)）。

## 参考资料

- [认证与授权](../aspnet-core/auth.md) · [配置与 Options（机密源）](configuration-options.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core Data Protection](https://learn.microsoft.com/aspnet/core/security/data-protection/introduction) · [开发中的机密管理](https://learn.microsoft.com/aspnet/core/security/app-secrets)
