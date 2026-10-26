# 已注释的参考代码

这些文件与 v2 指南对应，提供中文注释和函数 docstring。`toolbox.py`、`agent.py` 是 Day 4 完成后的参考版；Day 3 从零搭建请按指南使用查询工具的最小版本。SQLite 创建工单的独立实验尚未接入字典查询工具，贯通创建与查询仍属于毕业练习。

## 安装

Python 3.11 或以上；本次离线验证使用 Python 3.12。进入本目录建立并激活虚拟环境，再执行：

```bash
python -m pip install -r requirements.txt
```

将 `.env.example` 复制为 `.env`，在本地填入 API Key。`OPENAI_MODEL` 必须换成自己账户可用且支持 Responses、函数调用和结构化输出的模型。`OPENAI_BASE_URL` 只在需要自定义 API 地址时设置。

API Key 和 Base URL 由 SDK 读取；模型名称由 common.py 读取，并通过每次请求的 model 参数传入。修改 .env 后重启程序；SDK 不会自动把文件变化应用到已有的缓存客户端。真实 .env 已列入 .gitignore。

## 逐日运行

| 日期/脚本 | 命令 | 预期观察 |
|---|---|---|
| Day 1 | `python day1.py` | 文本、响应状态、token 用量 |
| Day 2 | `python day2.py` | intent / ticket_id / needs_clarification 字段 |
| Day 3–4 | `python agent.py "查询 T1001，并给出下一步建议。"` | answer / status / trace / tokens / seconds |
| Day 5 会话 | `python chat.py` | 连续对话，输入 exit 退出 |
| Day 5 确认 | `python approval.py` | 展示草稿，输入 APPROVE 才写本地工单 |
| Day 6 离线 | `python -m pytest -q test_tools.py` | 四项通过，无需密钥 |
| Day 6 模型评测 | `python evaluate.py` | 三条真实模型冒烟案例及通过率 |
| Day 7 API | `uvicorn server:app --host 127.0.0.1 --port 8000` | 本地 `/docs` 交互文档、`/health`、`/ask` |

Day 1、2、Agent、chat、evaluate 以及 API 的 /ask 会调用模型并产生用量；approval、test_tools 与 API 的 /health 不调用模型。脚本中的 main 入口确保 import 模块本身不会自动发模型请求。

运行 chat 和 approval 前先进入本目录：history.json 与 tickets.db 按当前工作目录读写。这两个文件和 .env 都不应提交。

## 选修：Agents SDK

基础 requirements 不包括选修框架。要运行选修，安装本次验证的版本：

```bash
python -m pip install openai-agents==0.24.0
python sdk_demo.py
```

## 如何读参数说明

每个自定义函数都注明了参数、返回/产出和副作用。查看源码，也可以使用 Python 内置帮助：

```bash
python -c "from agent import run; help(run)"
python -c "from toolbox import search_kb; help(search_kb)"
```

`run(question, history=None, client=None)` 返回任务结果字典；`history` 是消息列表，`client` 是可替换的客户端。参数类型提示不自动等于运行时校验；Pydantic 参数模型、HTTP 请求体校验和函数内业务检查各司其职。

软件离线测试验证程序逻辑；模型回答是否正确、是否有依据，需要真实案例评测。单条成功、HTTP 200 或 status=completed 都不足以单独证明任务正确完成。
