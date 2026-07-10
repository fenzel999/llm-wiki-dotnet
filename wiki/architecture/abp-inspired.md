---
title: 从 ABP 汲取的架构实践（厂商中立）
summary: 吸收 ABP 的企业架构思想，用微软/基金会内置 + 手写 + Minimal API 重写，不引 Volo.ABP.* 与付费模块。
tags: [architecture, abp, ddd, enterprise, vendor-neutral]
introduced-in: general
applies-to: [all]
status: stable
source: https://abp.io/docs/latest/framework/architecture/domain-driven-design
updated: 2026-07-10
---

# 从 ABP 汲取的架构实践

> **要点速览**
> - ABP 是优秀的企业架构范本，但按 [P10/P12](../governance/policy.md) **不引 `Volo.ABP.*` 包、不用付费模块**。
> - 按"只用 Minimal API 不用控制器"，也**不用** ABP 的 Auto API Controllers。
> - 我们只吸收其**思想**，用内置能力 + 手写重写；本页是导览，细节见各专页。

## 概述

ABP（Volosoft 的开源企业框架）把 DDD 分层、模块化、多租户、审计、权限等"企业级常见需求"做成了成体系的最佳实践，很值得学习。但它是**第三方框架**，且 ABP Commercial / 部分模块**需付费**；它的骨架又建立在**自动生成 API 控制器**与**重仓储 / 工作单元抽象**之上——这与本库的铁律（[P10](../governance/policy.md) 只用微软/基金会包、[P12](../governance/policy.md) 不用付费、以及"只用 Minimal API、不额外套仓储"）直接冲突。

因此本库的立场很明确：**吸收 ABP 的架构思想，拒绝其具体依赖与实现载体**，全部用微软/基金会内置能力 + 手写 + Minimal API 重新表达。

## 吸收什么（→ 对应页面）

| ABP 思想 | 我们的厂商中立实现 |
|----------|--------------------|
| 模块化、DDD 分层 | [模块化单体](modular-monolith.md) · [整洁架构](clean-architecture.md) · [DDD](ddd.md) |
| 领域服务 / 应用服务 / DTO | [领域服务与应用服务](domain-application-services.md)（手写映射，不用 AutoMapper） |
| 规约（Specification） | [规约模式](specification-pattern.md)（手写表达式树 + EF Core） |
| 多租户 | [多租户](multi-tenancy.md)（EF 全局查询筛选器 + 租户解析中间件） |
| 审计日志 / 软删除 / 数据过滤 | [审计与软删除](auditing-soft-delete.md)（EF `SaveChanges` 拦截器 + 全局筛选） |
| 分布式事件总线 | [事件驱动](event-driven.md)（领域事件手写发布器 + 发件箱） |
| CQRS | [CQRS](cqrs.md)（不用 MediatR，直接注入） |

## 拒绝什么（→ 用什么替代）

- ❌ **Auto API Controllers** → ✅ [Minimal API](../dotnet/aspnet-core/aspnet-core-10.md)（本库统一不用控制器）。
- ❌ **重仓储 / UnitOfWork 抽象** → ✅ 直接用 `DbContext`（它本身即仓储 + 工作单元，见 [EF 数据访问](../dotnet/ef-core/ef-data-access.md)）。
- ❌ **`Volo.ABP.*` NuGet 包 / 付费模块** → ✅ 微软/基金会内置 + 手写。
- ❌ **AutoMapper**（第三方且已商用）→ ✅ 手写 DTO 映射（几行投影，零依赖）。

## 常见误区

❌ 为了"照搬 ABP 最佳实践"直接 `dotnet add package Volo.ABP.*`，违反 P10/P12 并把控制器/重抽象带回来。学思想，不搬包。

❌ 把 ABP 的**所有**分层机械照抄到小项目，过度设计。分层强度应与复杂度匹配（简单项目 [模块化单体](modular-monolith.md) 足矣）。

## 适用版本

架构思想与版本无关；实现示例面向 net8+（Minimal API、EF Core 全局查询筛选器、`SaveChanges` 拦截器）。

## 参考资料

- [领域服务与应用服务](domain-application-services.md) · [规约模式](specification-pattern.md) · [多租户](multi-tenancy.md) · [审计与软删除](auditing-soft-delete.md)
- ABP 官方（思想来源）：[DDD 架构](https://abp.io/docs/latest/framework/architecture/domain-driven-design) · [模块化](https://abp.io/docs/latest/framework/architecture/modularity/basics) · [多租户](https://abp.io/docs/latest/framework/architecture/multi-tenancy)
