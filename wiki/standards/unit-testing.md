---
title: 单元测试规范
summary: 测试方法命名 Method_Scenario_Expected，采用 AAA 结构，避免共享状态与测框架。
tags: [standard, testing]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 规则

- 测试方法命名为 `Method_Scenario_Expected`（方法_场景_预期结果），中文环境下可保留英文命名以便与测试框架兼容。
- 测试体使用 **AAA** 结构：Arrange（准备）、Act（执行）、Assert（断言），用注释分隔。
- 每个测试相互独立，**避免共享可变状态**；测试之间不应有执行顺序依赖。
- 用 `Theory` + `InlineData` 表达参数化用例，替代大量重复 `Fact`。
- **不要测试框架/运行时本身**（如 `Assert.True(1 + 1 == 2)`），只测自己的逻辑。
- 使用 `xUnit` 的构造函数或 `IClassFixture` 注入依赖，而非测试类静态字段。

## 正确做法

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

## 反例

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

## 理由

`Method_Scenario_Expected` 命名使失败时能直接读出哪个行为、哪种输入、何种预期出错。AAA 让测试易读易维护。独立无共享状态保证测试可并行、可重跑。不测框架节省时间并避免脆弱测试（fragile tests）。相关：[异步最佳实践](../standards/async-best-practices.md)。
