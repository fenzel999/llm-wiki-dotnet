---
title: 诊断与性能剖析（dotnet-trace / counters / dump）
summary: 性能与诊断——用微软官方 dotnet-* 诊断工具在生产观察计数器、采集跟踪与内存转储，定位真实瓶颈；AOT 同样可用。
tags: [diagnostics, profiling, dotnet-trace, dotnet-counters, dump]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/diagnostics/
updated: 2026-07-11
---

# 诊断与性能剖析（dotnet-trace / counters / dump）

> **要点速览**
> - 微软官方 `dotnet-*` 工具可挂到运行中进程取证，无需改代码、不停服。
> - 顺序：先 `dotnet-counters` 定性（CPU？GC？线程池？），再 `dotnet-trace`/`dotnet-dump` 定位。
> - 内存增长用 `dotnet-gcdump` 看什么在堆积、被谁引用，别乱猜"泄漏"。
> - 容器/K8s 里同样可用；别用 `Console.WriteLine` 埋点当剖析。

## 概述

线上应用变慢、内存涨、偶发卡顿，靠加日志猜往往事倍功半。.NET 提供一整套**跨平台命令行诊断工具**（微软官方，`dotnet tool` 安装），可挂到正在运行的进程上取证，不必改代码、不必停服：

- **`dotnet-counters`**：实时看性能计数器（CPU、GC、分配率、线程池队列、请求数），快速判断"病在哪一类"。
- **`dotnet-trace`**：采集 CPU 采样/事件跟踪，找出热点方法（可转 speedscope/Chromium 火焰图）。
- **`dotnet-dump`**：抓内存转储并离线分析（堆上什么占内存、是否泄漏、线程卡在哪）。
- **`dotnet-gcdump`**：轻量抓 GC 堆快照，专门查内存增长/泄漏。

诊断顺序：先用 counters 定性（CPU 高？GC 频繁？线程池饥饿？），再用 trace/dump 定位到具体方法或对象。

## 症状 → 工具 决策表

| 现象 | 先用 | 再深入 |
|------|------|--------|
| 整体变慢、不知方向 | `dotnet-counters monitor` | 看是 CPU/GC/线程池哪类高 |
| CPU 高、找热点方法 | `dotnet-trace collect` | 火焰图看采样栈 |
| 内存持续上涨、疑似泄漏 | `dotnet-gcdump collect` | 看何种类型堆积 |
| 卡死/线程阻塞 | `dotnet-dump collect` | 看线程栈与锁 |

```bash
dotnet tool install --global dotnet-counters
dotnet tool install --global dotnet-trace

dotnet-counters monitor -p <PID>                  # 实时看 CPU/GC/线程池/分配
dotnet-trace collect -p <PID> --duration 00:00:30  # 采 30s 跟踪，事后看火焰图
dotnet-gcdump collect -p <PID>                     # 内存疑似泄漏时抓 GC 堆快照
```

容器/K8s 里同样可用（把工具装进 sidecar 或调试镜像，附着到目标进程）。

## 常见误区

❌ **不测量就凭感觉改代码"优化性能"**，常常动错地方。先用 counters/trace 找到真正热点。

❌ **内存一直涨就断定"内存泄漏"并乱改**。先 `dotnet-gcdump`/`dotnet-dump` 看是什么类型在堆积、被谁引用，再对症。

❌ **只在开发机复现不了就放弃**。这些工具能挂到**生产进程**取证，正是为线上疑难而生。

❌ **用 `Console.WriteLine` 埋点测时间当剖析**。trace 采样给的是全局、带调用栈的真实分布。

## 适用版本

`dotnet-*` 诊断工具支持各受支持 .NET 版本，跨 Windows/Linux/macOS。

### Native AOT 兼容性

诊断工具在 AOT 下**同样可用**：AOT 发布的是正常 .NET 进程，counters/trace/dump 照常附着（见 [AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。注意：AOT 裁剪会移除部分反射信息，深度堆分析（`dotnet-dump` 的对象图遍历）可能不如 JIT 完整；GC 计数器、CPU trace 等不受影响。这些工具是独立 CLI，不进应用本身、不影响 AOT 发布。

## 参考资料

- [基准测试](benchmarking.md) · [GC 与内存](gc-memory.md) · [日志与可观测性](../dotnet/fundamentals/observability.md)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[.NET 诊断工具](https://learn.microsoft.com/dotnet/core/diagnostics/)
