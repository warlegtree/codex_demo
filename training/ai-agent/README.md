# Python AI Agent 七天实战训练

更新日期：2026 年 10 月 26 日 · v2 注释与参数详解版

- [完整学习指南（Markdown）](AI-Agent-Python-7-Day-Training.md)
- [Word 教材](AI-Agent-Python-7-Day-Training.docx)（打开后点击 GitHub 的 Download raw file 下载）
- [可运行的中文注释示例](examples/README.md)

本课程通过企业 IT 与知识库助理，逐步学习模型调用、结构化输出、工具循环、RAG、会话与确认、评测以及 HTTP 服务。建议 Python 基础学习者每天投入 4–6 小时，共约 35 小时。

v2 为每个模块补充了中文注释、函数参数和返回值说明、SDK 参数表、执行过程及常见误解，也加入 .env、MODEL、API Key、Base URL、缓存、超时和重试的解释。所有内容保留在现有 `docs/ai-agent-training` 分支的 `training/ai-agent/` 下。

## 先阅读，再运行

按指南逐日学习时，使用各天提供的最小代码与追加步骤。`examples/` 保存的是包含 Day 4 工具的参考版本，适合直接运行或逐行对照；不应把参考版本已具备的能力误认为某个练习已经完成。

```bash
cd training/ai-agent/examples
python -m venv .venv
# macOS/Linux 激活；Windows 使用 .venv\Scripts\Activate.ps1
source .venv/bin/activate
python -m pip install -r requirements.txt
```

先运行无模型测试：

```bash
python -m pytest -q test_tools.py
```

需要调用真实模型时，将 `.env.example` 复制为 `.env`，在本地填写密钥和可用模型，再按 [示例说明](examples/README.md) 操作。

Markdown 与 Word 均包含完整教学代码；examples 与指南的代码由同一批注释源码生成并校验。离线测试不代表已验证真实模型成功率，真实模型评测按 Day 6 完成。
