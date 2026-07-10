---
title: AOT CI/CD 与交叉编译
summary: GitHub Actions / Azure Pipelines 两阶段构建、Docker 交叉编译、静态 PGO 集成、Chiseled 镜像、缺失依赖捕获。
tags: [deployment, native-aot, ci-cd, docker, cross-compilation, pgo]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/deploying/native-aot
updated: 2026-07-11
---

# AOT CI/CD 与交叉编译

> **要点速览**
> - **双模开发**：本地 `dotnet run` (JIT/热重载) → 发布 `dotnet publish -p:PublishAot=true` (AOT)。
> - **交叉编译限制**：Windows 不能直接产出 Linux AOT；必须用 Docker（官方 SDK 镜像）构建。
> - **两阶段构建**：Stage 1 SDK 构建 → Stage 2 Chiseled 镜像；静态 PGO 需两阶段（训练→发布）。
> - **Chiseled 镜像**：`mcr.microsoft.com/dotnet/runtime-deps:10.0-*-chiseled` 无 Shell/包管理器，最小攻击面。
> - **缺失依赖捕获**：`ldd` 检查原生依赖（ICU、OpenSSL、libgcc），缺失即构建失败。

## 概述

AOT 发布产出**原生可执行文件**，不依赖 .NET 运行时。这要求 CI/CD 流水线：
1. 在目标架构（linux-x64 / linux-arm64 / win-x64 / osx-x64 / osx-arm64）上构建
2. 使用原生链接器（`clang`/`lld`/`link.exe`），需对应平台工具链
3. 处理原生依赖（ICU、OpenSSL、glibc、libgcc）
4. 集成静态 PGO（可选，两阶段构建）

## 交叉编译限制

| 宿主 → 目标 | 可行性 | 方案 |
|-------------|--------|------|
| Linux → Linux (同架构) | ✅ 原生 | 直接 `dotnet publish -r linux-x64` |
| Windows → Linux | ❌ 不可行 | 无 Linux 链接器/glibc 头文件，**必须用 Docker** |
| macOS → Linux | ❌ 不可行 | 同理，**必须用 Docker** |
| Linux (x64) → Linux (arm64) | ⚠️ 需 QEMU/多架构镜像 | 推荐原生 Arm64 机器或 GitHub Actions `arm64` runner |
| Windows → Windows (x64/arm64) | ✅ 原生 | 安装对应 SDK + VS Build Tools |

> **最佳实践**：所有 Linux AOT 构建统一用 `mcr.microsoft.com/dotnet/sdk:10.0` 镜像，GitHub Actions 用 `ubuntu-latest` (x64) + `ubuntu-latest` + `arm64` matrix。

## CI/CD 流水线模板

### GitHub Actions（推荐）

```yaml
# .github/workflows/aot.yml
name: AOT Build & Release

on:
  push:
    tags: ['v*']
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        rid: [linux-x64, linux-arm64]
        include:
          - rid: linux-x64
            dockerfile: Dockerfile
          - rid: linux-arm64
            dockerfile: Dockerfile.arm64
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & Push AOT Image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ${{ matrix.dockerfile }}
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }}-${{ matrix.rid }}
          platforms: ${{ matrix.rid == 'linux-x64' && 'linux/amd64' || 'linux/arm64' }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Dockerfile（Chiseled 镜像，生产最佳实践）

```dockerfile
# ============================================================
# Stage 1: Build (SDK 镜像，含 AOT 工具链 + 原生链接器)
# ============================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 1. 还原依赖（利用层缓存）
COPY ["*.sln", "."]
COPY ["src/**/*.csproj", "src/"]
RUN dotnet restore

# 2. 发布 AOT（指定 RID 由构建参数传入）
ARG RID=linux-x64
ARG CONFIGURATION=Release

# 3. 复制源码并发布
COPY . .
RUN dotnet publish "src/MyApp/MyApp.csproj" \
    -c $CONFIGURATION \
    -r $RID \
    -p:PublishAot=true \
    -p:StripSymbols=true \
    -p:TrimMode=full \
    -p:InvariantGlobalization=true \
    -o /app/publish

# ============================================================
# Stage 2: Runtime (Chiseled 镜像，极简攻击面)
# ============================================================
FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled
WORKDIR /app

# 复制发布产物（原生可执行文件 + 依赖）
COPY --from=build /app/publish .

# 非 root 用户（chiseled 镜像自带 non-root）
USER app

# 入口点即为原生可执行文件
ENTRYPOINT ["./MyApp"]
```

### 静态 PGO（实验性，两阶段构建）

```yaml
# .github/workflows/aot-pgo.yml
jobs:
  pgo-train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build with PGO instrumentation
        run: |
          dotnet publish -c Release -r linux-x64 -p:PublishAot=true \
            -p:OptimizationPreference=Speed \
            -p:TieredPGO=true \
            -o ./app-pgo-train
      - name: Run training workload
        run: |
          # 运行代表性负载（压测/集成测试）生成 MIB
          ./app-pgo-train/MyApp --benchmark-mode &
          sleep 30
          pkill MyApp
      - name: Upload MIB artifact
        uses: actions/upload-artifact@v4
        with:
          name: mib-data
          path: ./app-pgo-train/*.mib

  pgo-publish:
    needs: pgo-train
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: mib-data
          path: ./mib
      - name: Build final AOT with PGO feedback
        run: |
          dotnet publish -c Release -r linux-x64 -p:PublishAot=true \
            -p:OptimizationPreference=Speed \
            -p:TieredPGO=true \
            -p:PgoDataPath=./mib \
            -o ./app-final
      - name: Push final image
        # 同前
```

### Dockerfile（双架构 ARM64 专用）

```dockerfile
# Dockerfile.arm64
FROM --platform=linux/arm64 mcr.microsoft.com/dotnet/sdk:10.0 AS build
# ... 同 x64 Dockerfile ...

FROM --platform=linux/arm64 mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled
# ... 同 x64
```

> **注意**：`FROM --platform=` 仅在 BuildKit 启用时生效（`DOCKER_BUILDKIT=1` 或 `docker buildx`）。

## Chiseled 镜像优势

| 特性 | 标准 `aspnet` 镜像 | `chiseled` 镜像 |
|------|-------------------|-----------------|
| Shell (bash/sh) | ✅ | ❌ 无 |
| 包管理器 | apt/dnf | ❌ 无 |
| 体积 | ~100MB | **~20MB** |
| 攻击面 | 大 | **极小（无 Shell/包管理器）** |
| 共享库 | 完整 glibc | 仅 glibc + openssl + libgcc |

> **生产强制**：AOT 容器镜像**必须**用 `*-chiseled` 基础镜像。

## 缺失原生依赖捕获

构建阶段自动检查：

```dockerfile
# 在 Stage 1 末尾添加
RUN ldd /app/publish/MyApp | grep "not found" && exit 1 || true
```

常见缺失依赖：

| 库 | 作用 | 缺失后果 |
|------|------|----------|
| `libicuuc.so` / `libicui18n.so` | ICU 全球化 | 崩溃/乱码 |
| `libssl.so` / `libcrypto.so` | OpenSSL (HTTPS/Kestrel) | TLS 失败 |
| `libgcc_s.so.1` / `libstdc++.so.6` | GCC 运行时 | 启动崩溃 |
| `libc.so.6` | glibc | 无法启动 |

> Chiseled 镜像已包含 `libgcc`、`libstdc++`、`libc`；ICU/OpenSSL 需基础镜像自带或手动安装（避免安装，改用 `InvariantGlobalization`）。

## 验证清单

| 步骤 | 命令 | 通过标准 |
|------|------|----------|
| 本地 AOT 发布 | `dotnet publish -c Release -r linux-x64 -p:PublishAot=true` | 无 IL2xxx/IL3xxx 警告 |
| 容器构建 | `docker build -t myapp .` | 镜像 < 50MB (chiseled) |
| 启动 | `docker run --rm myapp` | < 100ms 启动，无异常 |
| 首请求 | `curl /health` | 200 OK，JSON 正常 |
| 端点遍历 | 逐个端点 `curl` | 全部 200/预期码，JSON 正常 |
| 负载 | `wrk -t4 -c100 -d30s` | 无崩溃、内存稳定、RPS 达标 |

## 参考资料

- [Native AOT 部署概述](https://learn.microsoft.com/dotnet/core/deploying/native-aot)
- [Docker 官方 .NET 镜像](https://github.com/dotnet/dotnet-docker)
- [Chiseled 容器镜像](https://github.com/dotnet/dotnet-docker/blob/main/documentation/chiseled-containers.md)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md) · [AOT 调试实战](../dotnet/aot/native-aot.md) · [AOT 性能工程](../performance/aot-performance.md)