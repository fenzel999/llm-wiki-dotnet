---
title: 容器化（Docker / 内置容器发布）
summary: 部署与编排——多阶段 Dockerfile 或 dotnet publish 内置容器发布产出精简镜像；chiseled + 非 root + AOT 更小更稳。
tags: [docker, container, publish, chiseled]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/docker/build-container
updated: 2026-07-11
---

# 容器化（Docker / 内置容器发布）

> **要点速览**
> - **定位**：容器化属于**部署与编排（Deployment）**层（见[三种架构不在同一层级](../architecture/solution-structure.md#arch-levels)），与代码分层/拆服务正交。
> - 两条路：写 **Dockerfile**（最通用）或 `dotnet publish /t:PublishContainer`（net7+，免 Dockerfile）。
> - 铁律：**多阶段构建**（SDK 编译、runtime 只放产物）+ **chiseled 镜像**（无 shell）+ **非 root**（`USER $APP_UID`）。
> - 启用 **Native AOT** 后连 runtime 都不需要，镜像更小、启动更快（见 [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)）。
> - 别把密钥烤进镜像、别 root 运行。

## 概述

容器把应用和它的运行环境打包成一个可移植镜像，"我机器上能跑"从此不再是问题。.NET 容器化有两条路：写 **Dockerfile**（最通用、最可控），或用 **`dotnet publish` 内置的容器发布**（net7+，无需 Dockerfile 也能直接产出 OCI 镜像）。

产镜像的两条铁律：**用多阶段构建**（build 阶段用 SDK 镜像编译、运行阶段只拷贝产物到精简的 runtime 镜像，别把整个 SDK 塞进最终镜像）；**用非 root 用户运行**并选精简基础镜像。微软官方 `mcr.microsoft.com/dotnet/*` 镜像中，**chiseled** 镜像去掉了 shell 和包管理器，体积更小、攻击面更少，是生产首选。

## 正确做法

### 1. 多阶段 Dockerfile：SDK 构建 + chiseled 运行 + 非 root

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled   # 精简、无 shell
WORKDIR /app
COPY --from=build /app .
USER $APP_UID                                              # 非 root 运行
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

### 2. 免 Dockerfile：内置容器发布

```bash
dotnet publish -c Release /t:PublishContainer
```

### 3. 两种方式怎么选？

| 方式 | 适用 | 说明 |
|------|------|------|
| Dockerfile | 需要自定义运行环境、多阶段优化、装额外依赖 | 最通用可控 |
| `PublishContainer` | 标准 .NET 服务、想省去维护 Dockerfile | net7+，零 Dockerfile 出镜像 |

### 4. AOT 服务：更小镜像

启用 Native AOT 后（见 [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)），产物是独立原生可执行文件，运行阶段可改用**无运行时**的基础镜像：

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -r linux-x64 -p:PublishAot=true -o /app

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
ENTRYPOINT ["./MyApp"]        # 原生可执行，无需 dotnet runtime
```

## 常见误区

❌ **单阶段构建**，把 SDK 和源码全打进最终镜像——镜像数 GB 且暴露构建工具。用多阶段，只留运行时 + 产物。

❌ **以 root 跑容器**，一旦被攻破权限过大。用 `USER $APP_UID` 非 root 运行。

❌ **基础镜像用完整发行版且从不更新**，攻击面大。用 chiseled/alpine 精简镜像并定期重建拉取安全更新。

❌ **把密钥硬编码进镜像层**。密钥通过环境变量/挂载在运行时注入，别烤进镜像（见 [配置与机密](../dotnet/fundamentals/configuration-options.md)）。

❌ **AOT 服务还用 `aspnet` 镜像却仍保留 dotnet runtime 依赖**。AOT 产物自带运行时，可换 `runtime-deps` 更小镜像。

## 适用版本

Dockerfile 全版本通用；`dotnet publish` 内置容器发布 net7+；chiseled 镜像 net8+；AOT 发布 net8+。

### Native AOT 兼容性

容器化与 AOT **正交且协同**：AOT 让运行镜像无需携带 .NET runtime，显著更小（见 [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)）。注意镜像内运行的是 AOT 发布产物，仍需满足后端 AOT 约束（Minimal API、显式 DI、JSON 源生成）。

## 参考资料

- [.NET Aspire（本地编排）](aspire.md) · [健康检查](health-checks.md) · [原生 AOT](../dotnet/aot/native-aot.md)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[将 .NET 应用容器化](https://learn.microsoft.com/dotnet/core/docker/build-container) · [dotnet publish 容器化](https://learn.microsoft.com/dotnet/core/containers/publish-configuration)
