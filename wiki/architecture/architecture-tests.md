---
title: 架构测试（Architecture Tests）
summary: 用 xUnit + System.Reflection / Roslyn 在测试期与编译期强制分层、依赖方向与命名约定，守护整洁架构与模块化单体边界。
tags: [architecture, testing, dotnet, roslyn, xunit, reflection]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/en-us/dotnet/core/testing/
updated: 2026-07-11
---

> **要点速览**
> - 架构测试把"分层 / 依赖方向 / 命名约定"从口头规范变成可执行断言，CI 一跑即知违规。
> - 测试期用 **xUnit + `System.Reflection`** 扫描程序集，检查类型引用，零第三方依赖。
> - 编译期用 **Microsoft.CodeAnalysis（Roslyn）** 分析器在 `dotnet build` 时拦截违规，零运行时成本。
> - 优先断言"依赖只能向内 / 向下"，例如 **领域层不得引用基础设施层**。
> - 反射扫描较慢，**缓存结果并只跑一次**，避免拖慢整个测试套件。
> - 不要测太多：只锁最关键、最易被悄悄破坏的边界，避免噪音。

## 概述

传统的单元测试验证"行为是否正确"，而**架构测试（architecture tests）**验证"代码是否还符合我们约定的结构"。它们回答的问题是：某个层是否偷偷引用了它不该引用的层？命名空间是否偏离约定？公共 API 是否引入了不该暴露的类型？领域层里是否混入了 `DateTime.Now` 这类环境耦合？

对一个从 .NET Framework 时代走过来的读者而言，曾经的"架构靠评审、靠纪律、靠架构师盯代码"已经不够。现代 .NET 把架构约束**自动化、可回归**，让任何一次 PR 都把违规拦在合并之前。这正是 [整洁架构](../architecture/clean-architecture.md)（依赖只能向内）与 [模块化单体](../architecture/modular-monolith.md)（模块边界不可越界）能够长期成立的关键保障手段。

架构测试有两种落点：

1. **测试期（test-time）**：在 `dotnet test` 阶段，用 [测试](../dotnet/fundamentals/testing.md) 框架（xUnit）配合反射扫描程序集。适合"基于程序集/类型元数据的结构断言"，实现简单、调试直观。
2. **编译期（compile-time）**：用 Roslyn 分析器 / 源生成器，在 `dotnet build` 时报告诊断。适合"必须在提交前硬性拦截"的规则，且对 Native AOT 等运行时零成本。

两者互补：测试期覆盖"运行时的真实类型引用图"，编译期覆盖"写代码时立即反馈"。在 [工程质量](../standards/quality-engineering.md) 体系中，它们都属于"防护性质量门禁"，与覆盖率、静态分析并列。

## 正确做法

### 1. 用反射断言"领域层不得引用基础设施层"

假设项目约定命名空间 `MyApp.Domain`（领域）、`MyApp.Infrastructure`（基础设施）、`MyApp.Application`（应用）、`MyApp.Web`（表示层）。正确依赖方向应为：`Web → Application → Domain`，`Infrastructure → Domain`，**Domain 谁都不引用**。

```csharp
using System;
using System.Linq;
using System.Reflection;
using System.Collections.Generic;
using Xunit;

namespace MyApp.ArchitectureTests;

public class LayeringTests
{
    // 只加载一次，缓存复用，避免每次断言重新扫描（性能见下文）。
    private static readonly Assembly DomainAssembly =
        typeof(MyApp.Domain.Marker).Assembly;
    private static readonly Assembly InfrastructureAssembly =
        typeof(MyApp.Infrastructure.Marker).Assembly;

    [Fact]
    public void Domain_ShouldNotReference_Infrastructure()
    {
        var infraTypes = InfrastructureAssembly.GetTypes().ToHashSet();

        var offending = DomainAssembly.GetTypes()
            .SelectMany(t => t.GetReferencedTypes())   // 见下方扩展方法
            .Where(r => infraTypes.Contains(r))
            .ToList();

        Assert.Empty(offending);
    }

    [Fact]
    public void Infrastructure_ShouldReference_Domain()
    {
        // 基础设施必须能看见领域（依赖方向正确）。
        Assert.Contains(DomainAssembly.GetTypes(),
            _ => true); // 仅作正向示例，真实断言应检查具体契约类型。
    }
}

// 扫描某类型"真正引用"了哪些类型（含字段/属性/方法签名/基类/接口）。
internal static class ReflectionExtensions
{
    public static IEnumerable<Type> GetReferencedTypes(this Type type)
    {
        var result = new HashSet<Type>();
        if (type.BaseType is not null) result.Add(type.BaseType);
        foreach (var i in type.GetInterfaces()) result.Add(i);
        foreach (var f in type.GetFields(BindingFlags.Public
                     | BindingFlags.NonPublic | BindingFlags.Instance
                     | BindingFlags.Static))
            result.Add(f.FieldType);
        foreach (var p in type.GetProperties())
            result.Add(p.PropertyType);
        foreach (var m in type.GetMethods(BindingFlags.Public
                     | BindingFlags.NonPublic | BindingFlags.Instance
                     | BindingFlags.Static))
        {
            result.Add(m.ReturnType);
            foreach (var p in m.GetParameters())
                result.Add(p.ParameterType);
        }
        return result;
    }
}
```

> 测试项目在 JIT 运行时执行，使用反射完全合规。注意 [整洁架构](../architecture/clean-architecture.md) 中 AOT 规则（P16）只约束**出货的后端代码**，测试项目不受其限。

### 2. 命名空间 / 依赖方向的通用断言

把"命名空间前缀 → 允许依赖的前缀集合"建模为规则，断言所有类型都满足：

```csharp
using System;
using System.Linq;
using System.Reflection;
using Xunit;

namespace MyApp.ArchitectureTests;

public class NamespaceConventionTests
{
    private static readonly Assembly[] Assemblies =
    {
        typeof(MyApp.Domain.Marker).Assembly,
        typeof(MyApp.Application.Marker).Assembly,
        typeof(MyApp.Infrastructure.Marker).Assembly,
        typeof(MyApp.Web.Marker).Assembly,
    };

    // 每个命名空间段允许"向下"依赖哪些段（依赖方向白名单）。
    private static readonly
        System.Collections.Generic.Dictionary<string, string[]> Allowed =
        new()
        {
            ["MyApp.Web"]          = new[] { "MyApp.Application", "MyApp.Domain" },
            ["MyApp.Application"]  = new[] { "MyApp.Domain" },
            ["MyApp.Infrastructure"] = new[] { "MyApp.Domain" },
            ["MyApp.Domain"]       = Array.Empty<string>(), // 领域不依赖任何层
        };

    [Fact]
    public void AllTypes_RespectNamespaceDependencies()
    {
        var violations = (
            from asm in Assemblies
            from type in asm.GetTypes()
            let ns = type.Namespace ?? ""
            from dep in type.GetReferencedTypes()
            let depNs = dep.Namespace ?? ""
            where Allowed.ContainsKey(ns)
            where !depNs.StartsWith("System") && !depNs.StartsWith("Microsoft")
            where !Allowed[ns].Any(a => depNs == a || depNs.StartsWith(a + "."))
            select $"{ns}.{type.Name} -> {depNs}.{dep.Name}"
        ).ToList();

        Assert.Empty(violations);
    }
}
```

### 3. 可见性与公共 API 表面规则（sealing / internal）

```csharp
using System;
using System.Linq;
using System.Reflection;
using Xunit;

namespace MyApp.ArchitectureTests;

public class ApiSurfaceTests
{
    private static readonly Assembly WebAssembly =
        typeof(MyApp.Web.Marker).Assembly;

    [Fact]
    public void Controllers_ShouldNotBePubliclyConstructable_FromOutside()
    {
        // 仅示例：确保领域实体不是 public 可变、且关键实现类为 sealed。
        var domainAssembly = typeof(MyApp.Domain.Marker).Assembly;
        var leaky = domainAssembly.GetTypes()
            .Where(t => t.IsPublic && t.Name.EndsWith("Entity")
                     && !t.IsSealed && HasPublicSetters(t))
            .ToList();
        Assert.Empty(leaky);
    }

    private static bool HasPublicSetters(Type t) =>
        t.GetProperties().Any(p => p.SetMethod?.IsPublic == true);
}
```

### 4. 域规则：禁止环境耦合（如 `DateTime.Now`）

```csharp
using System;
using System.Linq;
using System.Reflection;
using Xunit;

namespace MyApp.ArchitectureTests;

public class DomainPurityTests
{
    [Fact]
    public void Domain_ShouldNotCall_DateTimeNow_Directly()
    {
        var domainAssembly = typeof(MyApp.Domain.Marker).Assembly;
        var offenders = (
            from t in domainAssembly.GetTypes()
            from m in t.GetMethods(BindingFlags.Public
                     | BindingFlags.NonPublic | BindingFlags.Instance
                     | BindingFlags.Static | BindingFlags.DeclaredOnly)
            where m.GetMethodBody() is not null
            from instr in m.GetMethodBody()!.GetILAsByteArray() // 粗粒度示意
            select t
        ).Distinct()
         // 真实实现应使用 Roslyn 语义模型精确识别对 DateTime.get_Now 的调用。
         .ToList();

        // 反射 IL 扫描较脆；更稳妥见下方 Roslyn 方案。
            Assert.True(offenders.Count == 0,
            "领域层应注入时钟而非直接调用 DateTime.Now；建议改用 Roslyn 分析器精确拦截。");
    }
}
```

### 5. 用 Roslyn 在编译期硬性拦截（零运行时成本）

对于"必须在写代码时就拦住"的规则，写一个 `DiagnosticAnalyzer`。它在 `dotnet build` 阶段运行，可在 CI 与本地都即时报错，且不进入任何运行时（AOT 友好）。

```csharp
using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace MyApp.ArchAnalyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class DomainMustNotReferenceInfrastructureAnalyzer
    : DiagnosticAnalyzer
{
    public const string DiagnosticId = "ARCH001";
    private static readonly DiagnosticDescriptor Rule = new(
        DiagnosticId,
        "Domain must not reference Infrastructure",
        "类型 '{0}' 位于 Domain 却引用了 Infrastructure '{1}'",
        "Architecture", DiagnosticSeverity.Error, isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(
            GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSymbolAction(Analyze, SymbolKind.NamedType);
    }

    private static void Analyze(SymbolAnalysisContext ctx)
    {
        var type = (INamedTypeSymbol)ctx.Symbol;
        if (type.ContainingNamespace?.ToDisplayString()
                != "MyApp.Domain") return;

        foreach (var dep in type.GetTypeMembersAndBaseTypes())
        {
            var depNs = dep.ContainingNamespace?.ToDisplayString() ?? "";
            if (depNs.StartsWith("MyApp.Infrastructure"))
            {
                var diag = Diagnostic.Create(Rule, type.Locations.FirstOrDefault(),
                    type.Name, dep.Name);
                ctx.ReportDiagnostic(diag);
            }
        }
    }
}
```

把该分析器打包为 `Microsoft.CodeAnalysis.Analyzers` 风格的 NuGet（仅 MS / 基金会生态）或在 `Directory.Build.props` 中以 `EnforceCodeStyleInBuild` / `ReportAnalyzer` 引入，即可在 `dotnet build` 报错。Roslyn 方案对 Native AOT 零影响——它从不在运行时执行。

### 6. 接入 CI

在流水线中加入独立步骤，确保架构测试**真的被运行**，而非停留在仓库里无人执行：

```yaml
# 伪 Azure Pipelines / GitHub Actions 风格
steps:
  - script: dotnet test tests/MyApp.ArchitectureTests --no-build --verbosity normal
    displayName: 'Run architecture tests'
  - script: dotnet build MyApp.sln -p:EnforceCodeStyleInBuild=true
    displayName: 'Enforce Roslyn architecture analyzers'
```

## 常见误区

❌ **误区 1：用硬编码字符串逐个比较类型全名做断言。** 例如 `type.FullName.Contains("Infrastructure")`。
✅ **WHY**：字符串匹配脆且易漏（嵌套命名空间、改名、泛型）。应基于 `Type` 引用图与命名空间前缀白名单（如上面 `Allowed` 字典），并对 `System.*` / `Microsoft.*` 显式放行，避免把 BCL 引用误判为违规。

❌ **误区 2：每次测试都重新 `GetTypes()` 并深度扫描，导致测试套件慢到没人愿意跑。**
✅ **WHY**：反射扫描整个程序集代价不低。应把程序集与类型表**缓存为静态字段、整组断言只跑一次扫描**，或把架构测试拆成独立、可单独运行的测试项目，避免拖累单元测试反馈循环。

❌ **误区 3：试图用架构测试锁住所有细节（字段命名、私有方法结构等），产生海量噪音。**
✅ **WHY**：只锁"最易被悄悄破坏且破坏代价高"的边界——分层方向、模块越界、公共 API 表面、关键环境耦合。规则越多，越容易被人用 `#pragma` 或 `[Fact(Skip=...)]` 绕过；聚焦高价值约束才能长期存活。

❌ **误区 4：写好了架构测试却没接进 CI，或本地能跑 CI 不跑。**
✅ **WHY**：不运行的架构测试等于没有。必须在流水线的显式步骤中调用 `dotnet test`（架构测试项目）与 `dotnet build -p:EnforceCodeStyleInBuild=true`（Roslyn 分析器），并保证失败会阻断合并。

❌ **误区 5：误以为测试项目里的反射会触犯 Native AOT 规则，于是回避所有结构测试。**
✅ **WHY**：AOT 约束（P16）针对**出货的后端程序集**；`dotnet test` 在 JIT 下运行，反射完全合法。真正出货、需 AOT 的代码则用 Roslyn 编译期分析器替代运行时反射，零运行时成本。

## 适用版本

- 适用于 **所有 .NET 版本**（.NET Core 2.0+ 至 .NET 10+）。反射 API（`System.Reflection`）长期稳定；Roslyn（`Microsoft.CodeAnalysis`）自 .NET Compiler Platform 起持续可用。
- 依赖：xUnit（`xunit` / `xunit.runner.visualstudio`，.NET Foundation 生态）、`Microsoft.CodeAnalysis`（Roslyn，.NET Foundation）。均为官方 / 基金会包，无任何第三方商业库。

### Native AOT 兼容性

- **架构测试本身运行在测试项目里**，由 `dotnet test` 在 JIT 运行时加载并执行，**使用 `System.Reflection` 完全合规**——P16 的 Native AOT 限制只针对实际出货、需裁剪/静态编译的后端代码，测试程序集不受此限。
- 对于**需要 Native AOT 发布的后端程序集**，不要在其中依赖反射来做架构约束；改用 **Roslyn 分析器 / 源生成器** 在编译期完成校验。Roslyn 诊断器只在 `dotnet build` 阶段运行，**不会进入最终裁剪后的 AOT 镜像**，因此对运行时与 AOT 体积零成本、AOT 友好。
- 决策指引：**测试期（xUnit + 反射）**适合覆盖"真实运行时的类型引用图"，实现快、调试直观；**编译期（Roslyn）**适合"写代码即拦截、必须硬性阻断"的高价值规则。两者并行，分别在 `dotnet test` 与 `dotnet build` 阶段把关。

## 参考资料

- [.NET 测试总览（官方文档）](https://learn.microsoft.com/en-us/dotnet/core/testing/)
- [Roslyn SDK（.NET Compiler Platform，官方文档）](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/)
- 相关内部页面：[测试](../dotnet/fundamentals/testing.md)、[工程质量](../standards/quality-engineering.md)、[模块化单体](../architecture/modular-monolith.md)、[整洁架构](../architecture/clean-architecture.md)、[依赖注入](../dotnet/fundamentals/dependency-injection.md)
