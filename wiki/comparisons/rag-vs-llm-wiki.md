---
title: RAG 与 LLM Wiki 对比
summary: RAG 在查询时检索外部语料，LLM Wiki 在摄入时编译为结构化知识；本仓库采用 LLM Wiki 策略。
tags: [comparison, rag, llm-wiki, retrieval, 知识库]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 对比维度

| 维度 | RAG（检索增强生成） | LLM Wiki（摄入时编译知识库） |
|------|---------------------|------------------------------|
| 检索时机 | 查询时实时检索(retrieval at query time) | 摄入时预先编译(compile at ingest time)为结构化页面 |
| 延迟 | 每次查询需向量召回+重排，额外延迟 | 知识已在页内，定位快、可直接链接 |
| 一致性 | 依赖检索质量，可能召回过时/无关片段 | 知识经人工/审核沉淀，版本化、可审计 |
| 可维护性 | 语料与索引分离，需维护向量库 | 纯 Markdown，Git 版本控制、差异可读 |
| 可解释性 | 检索结果黑盒、难追溯 | 每页有 `source` 来源 cite，链路透明 |
| 成本 | 运行时检索+嵌入推理持续开销 | 摄入期一次性整理，运行期零检索成本 |
| 适用 | 海量/常变动态语料、开放问答 | 稳定领域知识、需要确定性与可维护性的工程库 |

## 何时选哪个

- 选 **RAG**：语料规模巨大且持续变化、无法预先整理、需要覆盖长尾未知问题。
- 选 **LLM Wiki**：知识相对稳定、要求一致性/可维护/可审计、希望零运行期检索开销，并能用相对链接形成知识图谱（符合 [POLICY](../governance/policy.md) 的 P8 相对路径约定）。
- 本仓库（`.NET / C# LLM Wiki`）采用 **LLM Wiki**：把 .NET 惯用法、反模式、标准在摄入时编译为带 `source` 引用的 Markdown，既避免检索漂移，又可直接被工具链与 Agent 引用。

## 代码示例

```csharp
// RAG：查询时检索（示意）
var hits = await vectorStore.Search(embeddingOf(query), topK: 5);
var context = string.Join("\n", hits.Select(h => h.Text));
var answer = await llm.Complete($"上下文:\n{context}\n\n问题:{query}");

// LLM Wiki：摄入时编译为结构化页，运行期直接定位
// 页面本身即知识，Agent 通过相对链接读取：
//   [record 值语义](../concepts/records.md)
//   [RAG vs LLM Wiki](comparisons/rag-vs-llm-wiki.md)
// 无运行期检索成本，一致性由 POLICY 审核保证。
```

## 相关

- [record 与 class 对比](record-vs-class.md)
- [List 与 ImmutableArray 对比](list-vs-immutablearray.md)
- [持久约定 POLICY](../governance/policy.md)
- [.NET 版本演进](net-evolution.md)
