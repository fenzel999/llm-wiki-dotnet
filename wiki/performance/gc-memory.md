---
title: GC 与内存（分配、代际、Span）
summary: 性能与诊断——理解分代 GC 与工作站/服务器模式，减少堆分配、善用 Span/池化降低 GC 压力；AOT 下同样适用。
tags: [performance, gc, memory, allocation, span, arraypool]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/standard/garbage-collection/
updated: 2026-07-11
---

# GC 与内存（分配、代际、Span）

> **要点速览**
> - GC 分代（Gen0/1/2 + LOH）：多数对象朝生夕死，优化核心是**少制造垃圾**。
> - 热路径减少分配：`Span`/`stackalloc`、`ArrayPool` 复用缓冲、`StringBuilder`。
> - 别频繁 `GC.Collect()`（打乱自适应）；别频繁分配 ≥85KB 进 LOH。
> - `struct` 用于小而短命的值可省分配，但大结构体复制反而更贵。

## 概述

.NET 的垃圾回收器（GC）自动管理托管堆，但回收要暂停、要 CPU。GC 是**分代（generational）**的：新对象进 **Gen 0**，熬过回收的晋升到 Gen 1、Gen 2，大对象（≥85KB）进**大对象堆（LOH）**。绝大多数对象朝生夕死，所以 Gen 0 回收频繁且快，Gen 2/LOH 回收才昂贵。优化核心：**少制造垃圾**，尤其少制造会晋升到高代的中长寿命对象。

两种运行模式：**工作站 GC**（桌面/低延迟）与**服务器 GC**（多核吞吐，每 CPU 一个堆与回收线程，服务端默认）。net6+ 分层编译、net8+ DATAS（动态适配服务器 GC）让默认表现越来越好，多数情况无需手调。

## 分配优化选型

| 场景 | 用 | 理由 |
|------|----|------|
| 小临时缓冲（≤栈上限） | `stackalloc`/`Span<T>` | 零堆分配 |
| 大/可变缓冲、跨方法复用 | `ArrayPool<T>.Shared` | 避免反复进 LOH |
| 字符串拼接循环 | `StringBuilder` | 避免大量临时串 |
| 小而短命的值 | `struct`/`readonly struct` | 避免堆分配 |
| 大对象或需引用语义 | `class` | struct 复制更贵 |

## 正确做法

```csharp
// 栈上切片，零堆分配
Span<byte> buffer = stackalloc byte[128];

// 池化大缓冲，用完归还，避免反复分配到 LOH
byte[] rented = ArrayPool<byte>.Shared.Rent(4096);
try { Process(rented); }
finally { ArrayPool<byte>.Shared.Return(rented); }
```

`struct` 用于小而短命的值可避免堆分配，但别滥用（大结构体复制反而更贵）。

## 常见误区

❌ **热循环反复 `new` 临时对象/数组、字符串 `+` 拼接**，制造海量 Gen 0 垃圾拖高 GC 频率。用 `Span`/池化/`StringBuilder`。

❌ **手动频繁 `GC.Collect()`**。打乱 GC 自适应节奏，几乎总是让情况更糟。除极特殊场景外不要调用。

❌ **频繁分配 ≥85KB 大数组直接进 LOH**（回收昂贵且易碎片）。用 `ArrayPool` 复用。

❌ **把"用了 struct"当银弹**。大结构体按值传递复制开销超过省下的分配；大对象或需引用语义仍用 `class`，或用 `in`/`ref` 传递。

## 适用版本

GC 各版本通用；`Span`/`ArrayPool` netcore+；DATAS（服务器 GC 动态适配）net8+。

### Native AOT 兼容性

GC 与分配模型在 AOT 下**不变**——AOT 只改编译方式，不影响运行期 GC 行为。但 AOT 服务追求低延迟/小镜像，减少分配同样重要：优先 `Span`/`ArrayPool`；用源生成器（JSON/Logging/Regex）避免反射带来的隐式分配（见 [序列化](../dotnet/csharp/serialization.md)、[源生成器](../dotnet/csharp/source-generators.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。

## 参考资料

- [基准测试](benchmarking.md) · [Span 与 Memory](../dotnet/csharp/modern-csharp.md#span) · [诊断工具](diagnostics.md)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[.NET 垃圾回收](https://learn.microsoft.com/dotnet/standard/garbage-collection/)
