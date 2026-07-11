---
title: 原生 AOT（Native AOT）部署
summary: 提前编译为原生可执行文件，配合 trimming，反射受限，适合启动快/内存小的场景。
tags: [dotnet, native-aot, trimming, deployment, net10]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/deploying/native-aot
updated: 2026-07-10
---

> **要点速览**
> - 提前编译成原生可执行文件：启动快、内存小、无需运行时。
> - 代价：trimming + 反射受限，序列化等须用源生成器。
> - 适合 CLI/容器微服务；重反射/运行时动态加载场景不适用。

## 概述

通常我们发布的 .NET 应用，跑起来时还得靠目标机器上的 .NET 运行时，代码是到运行时才被 JIT 编译的。原生 AOT（Native AOT，ahead-of-time compilation，提前编译）走的是另一条路：它在**发布阶段**就把你的应用连同运行时的一部分一起，编译成一个独立的原生可执行文件。用户拿到手就能直接跑，机器上装不装 .NET 都无所谓。

这么做换来了什么？启动极快（没有 JIT 热身的那段延迟）、内存占用低、最终文件体积可控——这些都是命令行工具、Serverless 函数、容器化微服务这类场景最在意的指标。代价呢？因为编译期就要确定“哪些代码真正用得到”，所以它会做 trimming（裁剪），把判定为用不到的代码删掉；而一旦做了裁剪，运行时靠反射、靠动态生成代码的那套机制就会受限。换句话说，AOT 是用“灵活性”换“部署体验”，你得清楚自己换掉的是什么。

## 正确做法

开启 AOT 很简单，在项目文件里把开关打开，顺手把不变全球化（invariant globalization）也开了——它能砍掉一部分和文化相关的数据表，进一步缩小体积：

```csharp
// MyApp.csproj
// <PropertyGroup>
//   <PublishAot>true</PublishAot>
//   <InvariantGlobalization>true</InvariantGlobalization>
// </PropertyGroup>
```

发布时指定目标运行时标识符（RID）即可：

```csharp
// dotnet publish -c Release -r win-x64
```

真正需要注意的，是那些会被 trimming 误伤的代码。最典型的就是反射：编译器在静态分析时看不出你“将来会在运行时通过名字去加载哪个类型”，于是可能把它裁掉，等到运行时才崩溃。应对办法是用特性把这类代码标注出来，让编译器在构建期就给你警告，逼你显式处理：

```csharp
using System.Diagnostics.CodeAnalysis;

[RequiresUnreferencedCode("使用了反射扫描类型，AOT/trimming 下可能失效")]
static void ScanPlugins()
{
    // 反射逻辑，AOT 下需改用 source generator 或显式注册
}
```

有了这个特性，构建时只要扫到这段代码被调用，就会弹出 `IL2xxx` 级别的警告，提醒你“这里在 AOT 下不安全”。

## 常见误区

踩坑的重灾区几乎都和“被裁掉”有关。比如用 `System.Text.Json` 做序列化时图省事直接 `JsonSerializer.Serialize(obj)`——在 AOT 下 `obj` 的类型可能被剪掉，运行时才会失败。正确做法是用源生成器（source generator），通过 `[JsonSerializable]` 标注一个 `JsonSerializerContext`：

```csharp
// ❌ AOT 下类型可能被裁剪，导致运行时失败
var json = JsonSerializer.Serialize(obj);
// ✅ 改用 [JsonSerializable] 标注的 JsonSerializerContext 源生成
```

类似的，凡是 `Assembly.Load`、`Type.GetType(string)` 这种“按字符串动态加载类型”的写法，在 trimming 之后目标类型大概率已不在程序集里。构建时那些 `IL2xxx` / `IL3xxx` 的裁剪与 AOT 警告千万不能视而不见——它们是唯一能在上线前抓住问题的信号，等到了运行时才崩，定位和回滚都麻烦得多。最后，引用第三方库前最好确认它对 AOT 友好，不少旧库内部大量依赖反射，不经改造是没法 AOT 发布的。

## 适用版本

=== "net10"
    AOT 兼容库与诊断进一步完善，模板默认可选启用。

=== "net8"
    控制台与部分 ASP.NET Core 场景已支持 Native AOT，但限制较 net10 更多。

## AOT 调试实战

AOT 编译后**无法使用托管调试器**（Visual Studio 托管调试引擎、即时窗口、模块窗口均失效），因为没有运行时来托管调试会话。

### 可用工具

| 平台 | 调试器 | 说明 |
|------|--------|------|
| Windows | **WinDbg** / **Visual Studio C++ 调试器** | 需加载 `sos.dll` 扩展解析托管对象；PDB 含 C# 方法名，调用栈可读，但变量检视能力远弱于托管调试 |
| Linux / macOS | **lldb** / **gdb** | 需配合微软提供的 `sos` 插件（`dotnet-sos`）解析托管堆/线程；体验仍较硬核 |

### 关键限制

- **无托管即时窗口**：无法在断点处执行任意 C# 表达式
- **变量检视受限**：只能看基础类型字段；复杂对象需手动解析内存布局
- **无堆分析**：`dotnet-gcdump` / `dotnet-dump` 在 AOT 下**不支持堆分析**，内存泄漏排查极难

### 实战工作流

```bash
# 1. 发布时保留 PDB（默认已含）
dotnet publish -c Release -r linux-x64 -p:PublishAot=true

# 2. 容器/K8s 挂载调试器 sidecar
# Linux: kubectl debug -it <pod> --image=mcr.microsoft.com/dotnet/sdk:10.0 --target=<container>
# 进入后用 lldb 附着：
lldb -p <PID> -o "plugin load libsosplugin.so" -o "sos Threads"

# 3. Windows: WinDbg 附着进程
# .load sos.dll
# !Threads
# !ClrStack
```

> AOT 下**首选防御式编程**：大量结构化日志 + 指标 + 链路追踪，减少对生产调试的依赖。

## 参考资料

- 相关：[JIT 性能优化](../runtime/jit-optimizations.md)
- 官方文档：[Native AOT deployment](https://learn.microsoft.com/dotnet/core/deploying/native-aot)
