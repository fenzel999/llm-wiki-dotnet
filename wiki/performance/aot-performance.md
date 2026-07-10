---
title: AOT 性能工程
summary: JIT vs AOT 性能决策矩阵、静态 PGO、AVX-512/向量化、COW 内存共享、JIT vs AOT 决策矩阵。
tags: [performance, native-aot, pgo, simd, jit-vs-aot]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-10/
updated: 2026-07-11
---

# AOT 性能工程

> **要点速览**
> - **JIT vs AOT 决策矩阵**：长周期高吞吐 → JIT（动态 PGO），冷启动/内存密度/边缘 → AOT。
> - **静态 PGO**：收集 MIB → 反馈编译器 → 权衡代码体积膨胀（实验性）。
> - **向量化显式开启**：`<IlcInstructionSet>AVX512</IlcInstructionSet>` 针对加密/JSON/张量。
> - **COW 内存共享**：AOT 只读代码段跨容器共享物理页，PowerToys 降 15% 内存。
> - **JIT vs AOT 决策矩阵**：长周期高吞吐→JIT；冷启动/边缘/Serverless→AOT。

## 概述

AOT 不是银弹。**JIT（动态 PGO）** 在长周期、高吞吐服务中仍是性能上限保持者；**AOT** 在冷启动、内存密度、容器启动速度、边缘计算场景胜出。选择取决于你的性能目标。

## JIT vs AOT 决策矩阵

| 评估维度 | 推荐 JIT（长周期高吞吐） | 推荐 AOT（冷启动/内存密度/边缘） |
|----------|--------------------------|----------------------------------|
| 应用类型 | 长周期 Web API、后台服务、高吞吐计算 | CLI 工具、Sidecar、Job Worker、Serverless、边缘 |
| 部署环境 | 长期运行 VM、K8s 长驻 Pod | AWS Lambda、Azure Container Apps、Edge Devices |
| 性能目标 | 极致峰值吞吐量 (RPS) | 极致冷启动速度、低内存占用 |
| 依赖库 | 现代库、System.Text.Json、Dapper、Minimal API | 同上（遗留库 Newtonsoft/旧版 AutoMapper/EF6 红灯） |
| 调试需求 | 托管调试器全支持 | 仅原生调试器（WinDbg/lldb），无托管即时窗口 |

> ⚠️ **长周期高吞吐服务默认选 JIT**。AOT 的静态 PGO 尚未超越 JIT 动态 PGO 的运行时自适应优化。

## 静态 PGO（Profile-Guided Optimization）

| 阶段 | 操作 | 说明 |
|------|------|------|
| 1. 训练 | `dotnet run --profile` 或生产环境跑负载 | 生成 `default.mib` (MIB = Methods in Bundle) |
| 2. 反馈 | 将 `.mib` 放入项目或传给发布 | 编译器按热点方法/分支概率优化 |
| 3. 发布 | `dotnet publish -p:PublishAot=true -p:OptimizationPreference=Speed` | 产出 PGO 优化的原生二进制 |

**权衡**：
- ✅ 热点路径指令更紧凑、分支预测更准
- ⚠️ 代码体积膨胀（每个热点方法生成多版本），可能抵消 AOT 体积优势
- ⚠️ CI/CD 复杂度↑：需两阶段构建（训练→发布），MIB 需随版本更新

**建议**：仅在 AOT 场景且性能敏感时开启；JIT 场景用动态 PGO（默认开启）。

## 向量化显式开启（SIMD / AVX-512 / AVX10.2）

```xml
<!-- .csproj -->
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <IlcInstructionSet>AVX512</IlcInstructionSet>  <!-- 或 AVX10.2 -->
  <RuntimeIdentifier>linux-x64</RuntimeIdentifier>
</PropertyGroup>
```

| 指令集 | 适用场景 | 体积/兼容性代价 |
|--------|----------|-----------------|
| SSE2/SSE4.2 | 基线，所有 x64 支持 | 无 |
| AVX2 | 大多数现代云实例 | 兼容性好 |
| AVX-512 / AVX10.2 | 加密、JSON 解析、张量计算、向量化循环 | 需目标 CPU 支持；不支持的 CPU 会回退或崩溃，**需分发多版本或明确目标环境** |

> ⚠️ AOT 无运行时 CPU 特性检测，**必须显式指定目标 ISA**。多架构分发需分别发布。

## Arm64 优化（Graviton / Cobalt）

- **写屏障指令序列优化**：.NET 10 AOT 编译器优化了 Arm64 写屏障指令序列，减少内存存储延迟
- **基线提升**：针对 Neoverse N1/N2/V1 显式开启 `<IlcInstructionSet>ARM64</IlcInstructionSet>`

## COW 内存共享

AOT 生成的代码段是**只读**的，操作系统可在多个容器实例间共享这些物理内存页：

| 指标 | JIT | AOT |
|------|-----|-----|
| 代码段 | 读写（JIT 生成代码在堆上） | 只读（编译期生成，映射为只读段） |
| 多实例共享 | 否（每进程私有脏页） | **是**（COW，共享只读代码页） |
| 典型内存降低 | — | **10~20%**（PowerToys 实测降 15%） |

> 仅当多个同镜像容器共驻同宿主机时生效；单实例部署无收益。

## 代码体积优化技巧

| 技巧 | 效果 |
|------|------|
| `<TrimMode>full</TrimMode>` + `<SuppressTrimAnalysisWarnings>false</SuppressTrimAnalysisWarnings>` | 激进裁剪，需配合警告清零 |
| `InvariantGlobalization` + `HttpActivityPropagation` 关闭 | 砍掉 ICU 全球化数据表、诊断源 |
| `EventSource` / `LoggerMessage` 源生成 | 替代反射式日志，减少元数据 |
| `DllImport` + `LibraryImport` | 替代 `DllImport` 反射解析 |
| `IlcDisableReflection=true` | 禁止反射，强制源生成（极端精简） |

## Jit 情况下的最后手段

## JIT vs AOT 性能实测参考（官方 .NET 10）

| 场景 | JIT (PGO) | AOT (PGO) | 差异 |
|------|-----------|-----------|------|
| 启动时间 | ~500ms | **~50ms** | AOT 胜 10x |
| 内存 (RSS) | ~80MB | **~60MB** | AOT 胜 20%+ |
| 峰值吞吐 (RPS) | **基线 100%** | 95~105% | 持平 |
| 首次请求延迟 | JIT 编译开销 | **零 JIT** | AOT 胜 |
| 长跑 24h 吞吐 | **最优** | ±5% | JIT 微优 |

> 数据来源：.NET 10 Performance Improvements 官方博客、PowerToys 迁移案例。

## 参考资料

- [Performance Improvements in .NET 10](https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-10/)
- [AOT Deployment Overview](https://learn.microsoft.com/dotnet/core/deploying/native-aot)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md) · [原生 AOT 部署](../dotnet/aot/native-aot.md) · [AOT 调试实战](../dotnet/aot/native-aot.md)
- [PowerToys AOT 迁移案例](https://github.com/microsoft/PowerToys/pull/25000)