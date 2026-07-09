# llm-wiki-dotnet

一个面向 **.NET / C# 编程规范、最佳实践与语法演进** 的 **LLM Wiki** 知识库。

> 基于 Andrej Karpathy 提出的 *LLM Wiki* 模式：知识在「摄入时」被编译为结构化 Markdown，
> 而非在「查询时」做 RAG 检索。知识随每次贡献持续累积、互相链接、自动可视化。

## 这是什么

- **人类视图**：通过 [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) + GitHub Pages 渲染的网页，
  含中文界面、暗色主题、**可导航思维导图**。
- **Agent 视图**：仓库根的 `AGENTS.md`（opencode）/ `CLAUDE.md`（Claude Code）是同一份 Schema，
  告诉 LLM 如何 Ingest / Query / Lint / Audit / Correct 知识。
- **质量自校正**：内置 `wiki/governance/qa.md` 质量准则与 `wiki/governance/policy.md` 持久约定，Agent 会主动判对错、自修并报告。

## 快速开始（本地预览）

```bash
pip install mkdocs-material mkdocs-markmap mkdocs-static-i18n
mkdocs build
mkdocs serve      # 打开 http://127.0.0.1:8000
```

## 目录结构

```
llm-wiki-dotnet/
├── AGENTS.md ≡ CLAUDE.md        # Agent Schema（内容一致）
├── mkdocs.yml                   # 站点配置
├── .github/workflows/pages.yml  # push main → 自动部署 Pages
├── raw/                         # 不可变原始资料（文章/论文/素材）
└── wiki/                        # LLM 全权维护的知识层
    ├── index.md log.md overview.md 思维导图.md
    ├── governance/   # 质量准则/约定/报告/反馈（qa.md, policy.md, qa-report.md, feedback.md）
    ├── dotnet/ concepts/ standards/ patterns/ anti-patterns/ comparisons/ sources/
```

## 如何贡献知识

1. 读网页，发现错误 → 看 [`wiki/governance/feedback.md`](wiki/governance/feedback.md) 或直接提 GitHub Issue。
2. 有最新资料 → 丢进 `raw/`，由 Agent 执行 Ingest 编译进 `wiki/`。

详见 [AGENTS.md](AGENTS.md)。
