<p align="center"><img src="docs/images/daily-ink-banner.jpg" alt="Daily Ink：包含日记、词汇卡片与私有 AI 反馈工作区的专注写作桌面" width="100%"></p>

<div align="center">

# Daily Ink

**一款注重隐私的英语写作日记，将每日练习转化为可执行反馈和可长期记忆的词汇。**

[English](README.md) · [简体中文](README.zh-CN.md)

![Node.js 22.22+](https://img.shields.io/badge/Node.js-22.22%2B-43853d?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)
![Local first](https://img.shields.io/badge/data-local--first-2f6457?style=flat-square)
![AI providers](https://img.shields.io/badge/AI-OpenAI%20%7C%20Anthropic-6b5b95?style=flat-square)
[![CI](https://github.com/yruichen/daily-ink/actions/workflows/ci.yml/badge.svg)](https://github.com/yruichen/daily-ink/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-e9b949?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/yruichen/daily-ink?style=flat-square)](https://github.com/yruichen/daily-ink/stargazers)

</div>

Daily Ink 是面向 IELTS 学习者及英语写作爱好者的本地优先写作平台。用户可以用自己的语言记录每天的生活，获得 IELTS 风格能力估分，对比 AI 改写，从原文或改写中收藏有价值的表达，并通过 FSRS 间隔复习建立长期记忆。

> [!IMPORTANT]
> Daily Ink 仍处于早期开发阶段。自由写作评分属于 **IELTS 风格能力估分**，不是正式 IELTS 成绩。首个稳定版本发布前，数据库结构和 API 仍可能调整。

## 产品截图

<table>
  <tr>
    <td width="70%">
      <img src="docs/images/daily-ink-desktop.png" alt="Daily Ink 桌面端写作工作区">
    </td>
    <td width="30%">
      <img src="docs/images/daily-ink-mobile.png" alt="Daily Ink 移动端词库">
    </td>
  </tr>
  <tr>
    <td align="center"><strong>专注的桌面写作工作区</strong></td>
    <td align="center"><strong>响应式移动端词库</strong></td>
  </tr>
</table>

## 功能

- **每日写作工作区**：富文本编辑、自动保存和按日期查看历史日记。
- **IELTS 风格反馈**：内容与展开、连贯与衔接、词汇资源、语法范围与准确性四个维度。
- **保留原意的 AI 改写**：支持自然英语和指定目标 Band 两种模式。
- **用户自备模型**：支持 OpenAI-compatible、Anthropic-compatible，以及 Ollama、LM Studio 等本地端点。
- **语境词库**：从用户原文或 AI 改写中收藏单词和短语。
- **雅思内置词书**：雅思核心、10,000 词扩展词书与 AWL 学术词汇，离线浏览并按需加入学习。
- **FSRS 间隔复习**：为每个词条生成理解卡和语境产出卡。
- **本地优先隐私**：日记数据和加密后的模型凭据保存在运行服务的本机。
- **中英文界面**：首次启动根据浏览器语言选择，也可随时手动切换。
- **代码外提示词版本管理**：记录提示词 ID、语义版本、Schema 和内容哈希。

## 技术栈

| 范围 | 技术                                                   |
| ---- | ------------------------------------------------------ |
| Web  | React 19、Vite、TanStack Query、Tiptap、i18next        |
| API  | Node.js、Fastify、Zod                                  |
| 数据 | SQLite、Drizzle Schema、Repository Adapter             |
| AI   | OpenAI Chat Completions、Anthropic Messages 兼容适配器 |
| 记忆 | `ts-fsrs`                                              |
| 质量 | TypeScript strict mode、ESLint、Vitest                 |
| 交付 | npm workspaces、Docker、生产 API Bundle                |

## 快速开始

### 环境要求

- Node.js 22.22 或更新版本
- npm 11 或更新版本
- 只有估分、改写和词汇补全需要 AI 端点；日记与复习可以在没有模型的情况下使用。

### 开发模式

```bash
npm install
npm run dev
```

访问 <http://127.0.0.1:4318>，开发 API 地址为 `http://127.0.0.1:4317`。

### 本地生产构建

```bash
npm run build
npm start
```

访问 <http://127.0.0.1:4317>。API 会从同一域名提供构建后的 Web 应用。

### Docker

```bash
docker compose up --build
```

访问 <http://127.0.0.1:4317>。

应用运行在 Docker 中时，`127.0.0.1` 指向容器自身。本地模型需要填写容器能够访问的宿主机地址，例如 Docker Desktop 中的 `host.docker.internal`。

## 模型配置

打开 **设置 → 新建连接**，选择预设并测试保存后的连接。

| 提供方    | 默认 Base URL               | 协议                           |
| --------- | --------------------------- | ------------------------------ |
| OpenAI    | `https://api.openai.com/v1` | OpenAI compatible              |
| Anthropic | `https://api.anthropic.com` | Anthropic compatible           |
| Ollama    | `http://127.0.0.1:11434/v1` | OpenAI compatible              |
| LM Studio | `http://127.0.0.1:1234/v1`  | OpenAI compatible              |
| 自定义    | 用户填写                    | OpenAI 或 Anthropic compatible |

如果模型端点不支持原生 Schema 约束，请关闭**结构化输出**。Daily Ink 会通过外置提示词提供对应的 JSON Schema，并在保存前校验模型输出。

Provider API Key 写入 SQLite 前会使用 AES-256-GCM 加密。本地加密密钥单独保存在 `data/app.key`。

## 提示词版本管理

提示词以文件形式存在，不作为字符串常量写在 TypeScript 代码中：

```text
prompts/<capability>/<semver>/
├── manifest.yaml
├── system.md
├── user.md
├── unstructured.md
└── schema.json
```

Manifest 声明提示词 ID、版本、能力、变量和变更说明。每个 AI 结果都会记录提示词版本、内容哈希和模型快照，提示词升级后仍能追溯历史结果。

## 数据与隐私

运行数据保存在 `data/` 中，并且不会被 Git 跟踪：

```text
data/
├── ielts-diary.sqlite
├── ielts-diary.sqlite-shm
├── ielts-diary.sqlite-wal
└── app.key
```

备份时必须同时保存数据库和 `app.key`。解密已保存的模型凭据需要该密钥，禁止公开这两类文件。

服务默认只绑定 `127.0.0.1`，不包含遥测。日记正文只会发送到用户自己配置的模型端点。

## 项目结构

```text
apps/
├── web/                    # React 应用与前端业务模块
└── api/                    # Fastify 组合入口与 HTTP 模块
packages/
├── contracts/              # 共享 Zod Schema 与 API 类型
├── database/               # SQLite 连接、迁移和 Repository
├── domain/                 # 不依赖框架的业务规则
├── llm-core/               # 模型协议适配器
├── prompt-engine/          # 提示词加载、渲染和校验
└── review-engine/          # FSRS 调度
prompts/                    # 评分、改写和词汇补全提示词
docs/
├── architecture/           # 架构文档
└── decisions/              # 架构决策记录
```

项目采用模块化单体。业务模块通过公开接口协作，数据库、模型协议和任务执行属于可替换基础设施。详见 [架构概览](docs/architecture/overview.md) 和 [ADR 0001](docs/decisions/0001-modular-monolith.md)。

## 常用命令

| 命令                   | 用途                        |
| ---------------------- | --------------------------- |
| `npm run dev`          | 启动 Web 与 API 开发进程    |
| `npm run build`        | 构建 Web 和生产 API Bundle  |
| `npm start`            | 启动本地生产服务            |
| `npm run typecheck`    | 检查所有 workspace 的类型   |
| `npm run lint`         | 执行 ESLint                 |
| `npm test`             | 执行单元测试和 API 集成测试 |
| `npm run format:check` | 检查格式但不改写文件        |

提交 Pull Request 前执行：

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## 参与贡献

项目早期阶段欢迎提交 Bug 报告和范围明确的 Pull Request。涉及重要产品行为或架构调整时，请先创建 Issue，确认行为与模块归属后再实现。

领域逻辑不得依赖 React、Fastify、SQLite 或具体模型 SDK。新增提示词必须作为新版本放入 `prompts/`，禁止将提示词正文写入应用源代码。

开发流程和 Pull Request 检查项详见 [CONTRIBUTING.md](CONTRIBUTING.md)。参与项目即表示同意遵守[行为准则](CODE_OF_CONDUCT.md)。安全问题请按照 [SECURITY.md](SECURITY.md) 私下报告。

## Roadmap

- 正式 IELTS Writing Task 1 与 Task 2 练习模式
- 导入导出和引导式本地备份
- 可选的多设备同步
- 桌面安装包
- 用于提示词和模型回归的校准评测集

## 许可证

Daily Ink 基于 [MIT License](LICENSE) 开源。
