---
title: 单元测试规范
summary: 测试方法命名 Method_Scenario_Expected，采用 AAA 结构，避免共享状态与测框架。
tags: [standard, testing]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/testing/
updated: 2026-07-10
---

## 概述

单元测试规范定义了一套让测试可读、独立且聚焦的写法，目标是让失败信息能直接指向问题所在。当测试方法以 `Method_Scenario_Expected` 命名、测试体遵循 AAA 结构、且彼此之间不共享可变状态时，测试既易于维护，也能安全地并行与重跑。把测试范围限定在自己的逻辑上、而不是去验证框架或运行时本身，可以避免脆弱测试并节省时间。

## 正确做法

测试方法应命名为 `Method_Scenario_Expected`（方法_场景_预期结果），中文环境下可保留英文命名以便与测试框架兼容。测试体用 AAA 结构组织：Arrange（准备数据）、Act（执行被测行为）、Assert（断言结果），并用注释分隔三段。每个测试必须相互独立，避免共享可变状态，更不能依赖执行顺序。用 `Theory` 配合 `InlineData` 表达参数化用例，替代大量重复的 `Fact`；依赖通过 xUnit 的构造函数或 `IClassFixture` 注入，而不是测试类的静态字段。

下面的 `CalculatorTests` 用 `Add_TwoPositiveNumbers_ReturnsSum` 展示标准 AAA 三段式，并用 `Theory` 把多组输入合并到一个用例中，包括溢出回绕这一边界情况：

```csharp
public class CalculatorTests
{
    [Fact]
    public void Add_TwoPositiveNumbers_ReturnsSum()
    {
        // Arrange
        var calc = new Calculator();

        // Act
        var result = calc.Add(2, 3);

        // Assert
        Assert.Equal(5, result);
    }

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(-1, 1, 0)]
    [InlineData(int.MaxValue, 1, int.MinValue)] // 溢出回绕
    public void Add_VariousInputs_ReturnsExpected(int a, int b, int expected)
    {
        var calc = new Calculator();
        Assert.Equal(expected, calc.Add(a, b));
    }
}
```

## 反例（常见错误）

❌ 以下三类错误展示了无信息量命名、共享静态可变状态导致污染、以及测试框架本身的无意义用例：

```csharp
// 错误1：命名无信息量
[Fact]
public void Test1() { ... }

// 错误2：共享静态可变状态，测试间相互污染
public class BadTests
{
    private static int _counter; // 一个测试改了，另一个就挂
    [Fact] public void A() { _counter++; }
    [Fact] public void B() { Assert.Equal(0, _counter); }
}

// 错误3：测框架
[Fact]
public void List_Add_Works() => Assert.True(new List<int>().Count == 0);
```

其他常见错误：

- 一个测试里断言太多不相关的行为，失败时难以定位具体错误。
- 测试依赖文件、数据库或网络等外部状态，导致在 CI 上不稳定（flaky）。
- 用测试执行顺序来传递状态，重排或并行后结果随机失败。

## 适用版本

这些规范通用，本节省略（不写任何版本选项卡）。

## 参考资料

- 相关：[异步最佳实践](../standards/async-best-practices.md)
- 官方文档：[Unit testing in .NET](https://learn.microsoft.com/dotnet/core/testing/)
