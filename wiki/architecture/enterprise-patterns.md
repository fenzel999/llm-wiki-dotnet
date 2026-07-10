---
title: 企业级架构模式（导览）
summary: 用微软内置 + 手写 + Minimal API 表达企业级常见需求：分层、领域/应用服务、规约、多租户、审计软删除、事件。
tags: [architecture, enterprise, ddd, vendor-neutral]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/
updated: 2026-07-10
---

# 企业级架构模式

> **要点速览**
> - 企业应用的共性需求（分层、领域建模、多租户、审计、事件）都可用**微软内置能力 + 手写**表达，无需重型框架。
> - 按 [P10/P12](../governance/policy.md)：只用 `Microsoft.*`/`System.*` 与基金会包，其余手写；不用付费/云绑定组件。
> - 本库统一**用 Minimal API 不用控制器**、**用 `DbContext` 不额外套仓储/工作单元**、**手写 DTO 映射不引映射库**。
> - 本页是导览，指向各专页。

## 概述

"企业级"应用往往需要一套成体系的做法：清晰的分层、可复用的领域逻辑、多租户隔离、审计与软删除、模块间用事件解耦……这些需求很容易让人去引一个大而全的第三方框架。但按本库约定（[P10](../governance/policy.md) 只用微软/基金会包、[P12](../governance/policy.md) 不用付费/云绑定组件），我们**吸收这些成熟的架构思想，用微软内置能力 + 手写重新表达**，既保留最佳实践，又不背上第三方依赖与厂商锁定。

三条贯穿全库的取舍：

- **只用 [Minimal API](../dotnet/aspnet-core/aspnet-core-10.md)，不用控制器**——端点直接调用应用服务。
- **直接用 `DbContext`，不额外套仓储/工作单元抽象**——它本身即仓储 + 工作单元（见 [EF 数据访问](../dotnet/ef-core/ef-data-access.md)）。
- **手写 DTO 映射，不引映射库**——几行投影既透明又零依赖。

## 各能力对应页面

| 企业需求 | 本库的厂商中立实现 |
|----------|--------------------|
| 模块化、分层 | [模块化单体](modular-monolith.md) · [整洁架构](clean-architecture.md) · [DDD](ddd.md) |
| 领域服务 / 应用服务 / DTO | [领域服务与应用服务](domain-application-services.md)（手写映射） |
| 可复用查询条件 | [规约模式](specification-pattern.md)（手写表达式树 + EF Core） |
| 多租户隔离 | [多租户](multi-tenancy.md)（EF 全局查询筛选器 + 租户解析中间件） |
| 审计 / 软删除 | [审计与软删除](auditing-soft-delete.md)（EF `SaveChanges` 拦截器 + 全局筛选） |
| 模块/服务解耦 | [事件驱动](event-driven.md)（领域事件手写发布器 + 发件箱） · [CQRS](cqrs.md) |

## 常见误区

❌ 为了"照搬企业最佳实践"直接引入重型全家桶框架，把控制器、重仓储抽象、映射库、付费模块一并带进来，违反 P10/P12。学思想，用内置 + 手写表达。

❌ 不分项目规模，把所有分层机械照搬到小项目，过度设计。分层强度应与复杂度匹配——简单项目 [模块化单体](modular-monolith.md) 足矣。

## 适用版本

架构思想与版本无关；实现示例面向 net8+（Minimal API、EF Core 全局查询筛选器、`SaveChanges` 拦截器）。

## 参考资料

- [领域服务与应用服务](domain-application-services.md) · [规约模式](specification-pattern.md) · [多租户](multi-tenancy.md) · [审计与软删除](auditing-soft-delete.md)
- 官方文档：[.NET 微服务：DDD/CQRS 模式](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/) · [常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)
