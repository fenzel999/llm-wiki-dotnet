---
title: RAG 与 LLM Wiki 对比
summary: RAG 在查询时检索外部语料，LLM Wiki 在摄入时编译为结构化知识；本仓库采用 LLM Wiki 策略——稳定领域知识、确定性优先。
tags: [comparison, rag, llm-wiki, retrieval]
introduced-in: general
applies-to: [all]
status: stable
source: https://github.com/karpathy/llm-wiki
updated: 2026-07-11
---

# RAG 与 LLM Wiki 对比

> **要点速览**
> - **RAG**：查询时检索外部资料拼进提示词；**LLM Wiki**：摄入时把资料消化成带出处引用的结构化 Markdown。
> - 本仓库选 **LLM Wiki**：知识随贡献累积、互相链接、可可视化、可自校正（见 [policy P14/P17](../governance/policy.md)）。
> - 选择标准：**知识是否稳定、是否要求确定性与可审计**——稳定领域选 LLM Wiki，海量常变语料选 RAG。
> - 二者可互补，但本库以"摄入即编译"为核心范式。

## 概述

想让大模型"懂点训练时没见过的东西"，基本两条路。**RAG（检索增强生成）**：模型记不住的，在用户提问那一刻去外面检索——语料切片、向量化，提问时召回到最相关几段拼进提示词再作答。**LLM Wiki（摄入时编译知识库）**：你/Agent 在资料进来时就消化、提炼、整理成带 `source` 引用的结构化 Markdown，要用时知识已在那儿，顺着链接读即可。

二者不是"谁更先进"，而是解决不同问题：**RAG 把复杂度留到查询时刻**，适合"资料多到理不完且天天变"；**LLM Wiki 把复杂度前置到摄入时刻**，适合"知识稳定、容不得胡说、还要查得到每句话出处"的工程库。一句话：**RAG 是提问时临时翻书，LLM Wiki 是你先把书读薄写成笔记，以后随时翻。**

## 取舍对比

| 维度 | RAG（检索增强生成） | LLM Wiki（摄入时编译知识库） |
|------|---------------------|------------------------------|
| 检索时机 | 查询时实时检索 | 摄入时预编译为结构化页面 |
| 延迟 | 每次需向量召回+重排+嵌入推理 | 知识已在页内，定位快、可链接 |
| 一致性 | 依赖检索质量，可能召回过时/无关片段 | 经审核沉淀，版本化、可审计 |
| 可维护性 | 语料与索引分离，需维护向量库 | 纯 Markdown，Git 版本控制、差异可读 |
| 可解释性 | 检索黑盒、难追溯 | 每页 `source` 引用，链路透明 |
| 成本 | 运行时检索+嵌入持续开销 | 摄入期一次性整理，运行期零检索 |
| 适用 | 海量/常变动态语料、开放问答 | 稳定领域知识、需确定性与可维护性的工程库 |

## 正确做法

### 1. 按"知识会不会一直变"选型

| 你的处境 | 选 | 理由 |
|----------|----|------|
| 领域知识稳定（语言标准写法、框架最佳实践） | LLM Wiki | 确定性、可审计、可链接 |
| 语料海量且持续变化、长尾问题无法归纳 | RAG | 只能运行时检索最新片段 |
| 既要稳定基线、又要接最新动态文档 | 混合：Wiki 存基线 + RAG 补动态 | 互补（见下） |

### 2. 两种范式的代码形态

```csharp
// RAG：查询时检索（示意）
var hits = await vectorStore.Search(embeddingOf(query), topK: 5);
var context = string.Join("\n", hits.Select(h => h.Text));
var answer = await llm.Complete($"上下文:\n{context}\n\n问题:{query}");

// LLM Wiki：摄入时编译为结构化页，运行期直接定位（无检索成本）
// 页面本身即知识，Agent 通过相对链接读取：
//   [record 值语义](../dotnet/csharp/modern-csharp.md#records)
// 一致性由 POLICY 审核保证，无运行期向量库开销。
```

RAG 每次调用都要付"向量召回 + 重排 + 嵌入推理"；LLM Wiki 运行期只是文件读取 + 链接跳转，成本近零。

### 3. 混合用法（互补）

LLM Wiki 不必排斥 RAG：把**稳定基线知识**沉淀为结构化页面（本库做法），对**频繁变动的动态文档**（如每日发布的内部公告）另接 RAG 检索。两者输出可合并进同一提示词。本仓库当前以 LLM Wiki 为主，因为 .NET/C# 正确用法是稳定的工程知识。

## 常见误区

❌ **以为"RAG 永远更先进"**。对稳定工程知识，RAG 的检索偶发抽风、召回过时片段，反而不如预先编译的确定性页面可靠。

❌ **为稳定知识库硬上向量库**。维护向量库、嵌入模型、召回质量都是持续成本；纯 Markdown + Git 差异更可读、更可审计。

❌ **LLM Wiki 页面无 `source` 编造事实**。本库铁律：每页必须 cite 来源（见 [policy P14/P17](../governance/policy.md)），禁止无来源编造。

❌ **把不同主题平铺、不互链**。LLM Wiki 的价值在于知识成网；务必用相对链接串起相关页（见 [policy](../governance/policy.md) 路径约定）。

## 适用场景

- LLM Wiki：本仓库（.NET/C# 正确用法的沉淀）、团队规范库、API 用法基线。
- RAG：客服知识库（文档天天更新）、企业内跨系统长尾问答、实时资讯问答。

### 与本库约束的关系

LLM Wiki 天然契合本库治理：页面进 Git、可 `mkdocs build --strict` 校验死链、可用 [AOT 矩阵](../dotnet/aot/aot-compatibility.md) 等互相链接。无运行期第三方依赖，符合 [P10](../governance/policy.md) 的厂商中立原则。

## 参考资料

- [record 与 class 对比](record-vs-class.md) · [List 与 ImmutableArray 对比](list-vs-immutablearray.md)
- [持久约定 POLICY](../governance/policy.md) · [.NET 版本演进](net-evolution.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 参考：[Andrej Karpathy 的 llm-wiki 思路](https://github.com/karpathy/llm-wiki)
