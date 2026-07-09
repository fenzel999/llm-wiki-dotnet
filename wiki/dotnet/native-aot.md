---
title: 原生 AOT（Native AOT）部署
summary: 提前编译为原生可执行文件，配合 trimming，反射受限，适合启动快/内存小的场景。
tags: [dotnet, native-aot, trimming, deployment, net10]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

原生 AOT（Native AOT，ahead-of-time compilation，提前编译）在发布时将应用直接编译为独立的原生可执行文件，无需在目标机安装 .NET 运行时。优点是启动快、内存占用低、体积可控；代价是构建期需 trimming（裁剪未使用代码），且对运行时反射（reflection）与动态代码生成有较强限制。

## 正确做法

在项目文件中启用：

```csharp
// MyApp.csproj
// <PropertyGroup>
//   <PublishAot>true</PublishAot>
//   <InvariantGlobalization>true</InvariantGlobalization>
// </PropertyGroup>
```

发布命令：

```csharp
// dotnet publish -c Release -r win-x64
```

对可能被裁剪破坏的反射代码，用特性标注以获得编译期警告，从而显式处理：

```csharp
using System.Diagnostics.CodeAnalysis;

[RequiresUnreferencedCode("使用了反射扫描类型，AOT/trimming 下可能失效")]
static void ScanPlugins()
{
    // 反射逻辑，AOT 下需改用 source generator 或显式注册
}
```

## 常见错误

- 依赖运行时反射序列化（如未配置的 `System.Text.Json`）；应改用 source generator（`JsonSerializerContext`）。
- 使用 `Assembly.Load` / `Type.GetType(string)` 动态加载，在 trimming 后目标类型被裁掉。
- 忽略 `IL2xxx` / `IL3xxx` 裁剪与 AOT 警告，导致运行时才崩溃。
- 引入不兼容 AOT 的第三方库而未验证。

## 适用版本

=== "net10"
    AOT 兼容库与诊断进一步完善，模板默认可选启用。

=== "net8"
    控制台与部分 ASP.NET Core 场景已支持 Native AOT。

## 参考资料

- [源汇总 sources/README.md](../sources/README.md)
- 相关：[JIT 性能优化](runtime/jit-optimizations.md)


