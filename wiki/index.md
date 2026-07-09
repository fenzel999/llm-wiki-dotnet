---
title: 索引
summary: 全库内容目录，按主题分组，每条一句摘要 + 链接。
tags: [index]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# 索引 index

> 全库页面目录。每条 = 一句话摘要 + 链接。新页面必须在此登记（POLICY P9）。

## .NET 10

- [.NET 总览](dotnet/overview.md) — .NET 10 / C# 14 关键主题地图
- [文件型应用](dotnet/file-based-apps.md) — .NET 10 单文件 `global using` 风格控制台应用
- [原生 AOT](dotnet/native-aot.md) — 提前编译、 trimming 与受限反射
- [C# 扩展成员](dotnet/csharp/extension-members.md) — `extension` 块统一扩展方法/属性/运算符
- [field 关键字](dotnet/csharp/field-keyword.md) — 自动属性中引用支持字段
- [空条件赋值](dotnet/csharp/null-conditional-assignment.md) — `?.=` 简化空守卫
- [nameof 非绑定泛型](dotnet/csharp/nameof-unbound-generics.md) — `nameof(List<>)` 新写法
- [隐式 Span 转换](dotnet/csharp/implicit-span-conversions.md) — 数组/字符串到 Span 的隐式转换
- [lambda 参数修饰符](dotnet/csharp/lambda-parameter-modifiers.md) — lambda 参数上的 `ref`/`in`/`out`
- [最小 API 验证](dotnet/aspnet-core/minimal-api-validation.md) — .NET 10 内置验证与自动 400
- [OpenAPI 3.1](dotnet/aspnet-core/openapi-3-1.md) — ASP.NET Core 原生 OpenAPI 3.1 文档
- [EF Core 复杂类型与 JSON](dotnet/ef-core/complex-types-json.md) — 值对象映射与 JSON 列
- [EF Core 命名查询筛选](dotnet/ef-core/named-query-filters.md) — 命名查询与全局筛选
- [EF Core 数据访问](dotnet/ef-core/ef-data-access.md) — 直接用 DbContext，不引入仓储/工作单元
- [运行时 JIT 优化](dotnet/runtime/jit-optimizations.md) — .NET 10 JIT 性能改进
- [Blazor JS 改进](dotnet/blazor/javascript-improvements.md) — Blazor 与 JS 互操作增强

## 语言与规范

### 语言概念
- [可空引用类型](concepts/nullable-reference-types.md) — NRT 与静态流分析
- [记录 record](concepts/records.md) — 值语义与不可变数据
- [模式匹配](concepts/pattern-matching.md) — 现代 C# 解构与匹配
- [Span 与 Memory](concepts/span-memory.md) — 栈上/堆上连续内存零拷贝
- [依赖注入](concepts/dependency-injection.md) — DI 容器与生命周期
- [异步编程](concepts/async-await.md) — Task 模型与同步上下文
- [泛型](concepts/generics.md) — 类型参数与约束
- [ValueTask](concepts/value-task.md) — 热路径异步零分配
  - [源生成器](concepts/source-generators.md) — 编译期代码生成


### 工程规范
- [命名](standards/naming.md) — 类型/成员/变量命名约定
- [异常处理](standards/exception-handling.md) — 抛/捕/包装的正确姿势
- [日志](standards/logging.md) — 结构化日志与级别
- [配置](standards/configuration.md) — Options 绑定与校验
- [单元测试](standards/unit-testing.md) — 可维护测试结构
- [API 设计](standards/api-design.md) — 公共 API 的健壮与演进
- [异步最佳实践](standards/async-best-practices.md) — 避免常见异步陷阱
- [空处理](standards/null-handling.md) — null 与 NRT 的防御

## 实践

### 模式
- [Options 模式](patterns/options-pattern.md) — 强类型配置
- [管道行为](patterns/pipeline-behavior.md) — 横切关注点（MediatR 风格）
- [泛型主机](patterns/generic-host.md) — 后台服务宿主
- [最小 API 组织](patterns/minimal-api-organization.md) — 分组/模块化 endpoint
- [释放与 using](patterns/disposable-using.md) — IDisposable 与 using 声明

### 反模式
- [吞掉异常](anti-patterns/swallowing-exceptions.md) — 空 catch 吞错
- [async void](anti-patterns/async-void.md) — 无法等待的火灾
- [魔法数字](anti-patterns/magic-numbers.md) — 无含义字面量
- [上帝方法](anti-patterns/god-methods.md) — 过长过胖的函数
- [服务定位器](anti-patterns/service-locator.md) — 隐藏依赖
- [过度可变](anti-patterns/excessive-mutability.md) — 默认可变带来的 bug
- [阻塞异步](anti-patterns/blocking-async.md) — `.Result`/`.Wait()` 死锁
- [过早优化](anti-patterns/premature-optimization.md) — 未度量先优化

### 对比
- [record vs class](comparisons/record-vs-class.md) — 值语义与引用语义取舍
- [List vs ImmutableArray](comparisons/list-vs-immutablearray.md) — 可变与不可变集合
- [RAG vs LLM Wiki](comparisons/rag-vs-llm-wiki.md) — 两种知识供给范式
- [.NET 版本演进](comparisons/net-evolution.md) — 关键版本时间线与 LTS

## 治理
- [质量准则 QA](QA.md) · [持久约定 POLICY](POLICY.md) · [质量报告](QA-REPORT.md)
- [如何反馈](如何反馈.md) · [资料索引](sources/README.md)
- [思维导图](思维导图.md)
