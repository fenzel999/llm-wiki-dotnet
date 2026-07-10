---
title: 诊断与性能剖析（dotnet-trace / counters / dump）
summary: 用微软官方 dotnet-* 诊断工具在生产观察计数器、采集跟踪与内存转储，定位真实瓶颈。
tags: [diagnostics, profiling, dotnet-trace, dotnet-counters, dump]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/diagnostics/
updated: 2026-07-10
---

## 概述

线上应用变慢、内存涨、偶发卡顿，靠加日志猜往往事倍功半。.NET 提供一整套**跨平台命令行诊断工具**（全部微软官方，`dotnet tool` 安装），可以挂到正在运行的进程上取证，不必改代码、不必停服：

- **`dotnet-counters`**：实时看性能计数器（CPU、GC、分配率、线程池队列、请求数），快速判断"病在哪一类"。
- **`dotnet-trace`**：采集 CPU 采样/事件跟踪，找出热点方法（可转 speedscope/Chromium 火焰图查看）。
- **`dotnet-dump`**：抓内存转储并离线分析（看堆上什么在占内存、有没有泄漏、线程都卡在哪）。
- **`dotnet-gcdump`**：轻量抓 GC 堆快照，专门查内存增长/泄漏。

诊断的正确顺序：先用 counters 定性（是 CPU 高？GC 频繁？还是线程池饥饿？），再用 trace/dump 定位到具体方法或对象。

## 正确做法

先实时观察计数器定性问题，再针对性采集：

```bash
dotnet tool install --global dotnet-counters
dotnet tool install --global dotnet-trace

dotnet-counters monitor -p <PID>                 # 实时看 CPU/GC/线程池/分配
dotnet-trace collect -p <PID> --duration 00:00:30 # 采 30s 跟踪，事后看火焰图
dotnet-gcdump collect -p <PID>                    # 内存疑似泄漏时抓 GC 堆快照
```

在容器/K8s 里同样可用（把工具装进 sidecar 或调试镜像，附着到目标进程）。

## 常见误区

❌ 不测量就凭感觉改代码"优化性能"，常常动错地方。先用 counters/trace 找到真正热点。

❌ 内存一直涨就断定"内存泄漏"并乱改。先 `dotnet-gcdump`/`dotnet-dump` 看是什么类型在堆积、被谁引用，再对症。

❌ 只在开发机复现不了就放弃。这些工具能挂到**生产进程**取证，正是为线上疑难而生。

❌ 用 `Console.WriteLine` 埋点测时间当剖析。用 trace 采样得到的是全局、带调用栈的真实分布。

## 适用版本

`dotnet-*` 诊断工具支持各受支持 .NET 版本，跨 Windows/Linux/macOS。

## 参考资料

- [基准测试](benchmarking.md)
- [GC 与内存](gc-memory.md)
- [日志与可观测性](../dotnet/fundamentals/observability.md)
- 官方文档：[.NET 诊断工具](https://learn.microsoft.com/dotnet/core/diagnostics/)
