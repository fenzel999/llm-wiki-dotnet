---
title: GC 与内存（分配、代际、Span）
summary: 理解分代 GC 与工作站/服务器模式，减少堆分配、善用 Span/池化降低 GC 压力。
tags: [performance, gc, memory, allocation, span, arraypool]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/garbage-collection/
updated: 2026-07-10
---

## 概述

.NET 的垃圾回收器（GC）自动管理托管堆，但它不是免费的——回收要暂停、要付出 CPU。理解它才能写出低压力的代码。GC 是**分代（generational）**的：新对象进 **Gen 0**，熬过回收的晋升到 Gen 1、Gen 2，大对象（≥85KB）进**大对象堆（LOH）**。绝大多数对象朝生夕死，所以 Gen 0 回收又快又频繁，Gen 2/LOH 回收才昂贵。优化的核心思路因此是：**少制造垃圾**，尤其少制造会晋升到高代的中长寿命对象。

还有两种运行模式：**工作站 GC**（桌面/低延迟）与**服务器 GC**（多核吞吐，每 CPU 一个堆和回收线程，服务端默认）。此外 net6+ 的分层编译、net8+ 的 DATAS（动态适配服务器 GC）等让默认表现越来越好，多数情况无需手调。

## 正确做法

在热路径减少分配：用 `Span<T>`/`stackalloc` 避免临时数组、用 `ArrayPool<T>` 复用缓冲、用 `StringBuilder` 避免字符串拼接风暴：

```csharp
// 栈上切片，零堆分配
Span<byte> buffer = stackalloc byte[128];

// 池化大缓冲，用完归还，避免反复分配到 LOH
byte[] rented = ArrayPool<byte>.Shared.Rent(4096);
try { Process(rented); }
finally { ArrayPool<byte>.Shared.Return(rented); }
```

结构体（`struct`）用于小而短命的值可避免堆分配，但别滥用（大结构体复制反而更贵）。

## 常见误区

❌ 在热循环里反复 `new` 临时对象/数组、字符串 `+` 拼接，制造海量 Gen 0 垃圾拖高 GC 频率。用 `Span`/池化/`StringBuilder`。

❌ 手动频繁 `GC.Collect()`。它打乱 GC 的自适应节奏，几乎总是让情况更糟。除极特殊场景外不要调用。

❌ 频繁分配 ≥85KB 的大数组直接进 LOH（回收昂贵且易碎片）。用 `ArrayPool` 复用。

❌ 把"用了 struct"当银弹：大结构体到处按值传递，复制开销超过省下的分配。大对象或需引用语义时仍用 class，或用 `in`/`ref` 传递。

## 适用版本

GC 各版本通用；`Span`/`ArrayPool` netcore+；DATAS（服务器 GC 动态适配）net8+。

## 参考资料

- [基准测试](benchmarking.md)
- [Span 与 Memory](../dotnet/csharp/modern-csharp.md#span)
- [诊断工具](diagnostics.md)
- 官方文档：[.NET 垃圾回收](https://learn.microsoft.com/dotnet/standard/garbage-collection/)
