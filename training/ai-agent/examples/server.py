"""Day 7：本地 HTTP 接口。启动命令：uvicorn server:app --host 127.0.0.1。"""

from typing import Any

from fastapi import FastAPI, HTTPException
from openai import APIError
from pydantic import BaseModel, Field

from agent import run

app = FastAPI()  # ASGI 应用对象；uvicorn 的 server:app 指向它。


class Request(BaseModel):
    """POST /ask 的 JSON 请求体；question 必须为长度 1–2000 的字符串。"""

    question: str = Field(min_length=1, max_length=2000, description="要交给 Agent 的问题")


@app.get("/health")
def health() -> dict[str, str]:
    """参数：无。返回：{'status': 'ok'}；仅检查应用存活，不检测模型连通性。"""
    return {"status": "ok"}


@app.post("/ask")
def ask(body: Request) -> dict[str, Any]:
    """处理一条 Agent 请求；FastAPI 自动将 JSON 转换并验证为 Request。

    参数：body，请求体对象，例如 Request(question='查询 T1001')。
    返回：run() 的统一结果字典；FastAPI 自动序列化成 JSON 响应。
    副作用：调用模型和工具。示例不在 HTTP 请求之间共享历史。
    异常：业务输入错误映射 HTTP 422；SDK APIError 映射 HTTP 502。
    注意：任务 status 不等于 HTTP 状态；HTTP 200 也可能携带 budget_exceeded。
    """
    try:
        return run(body.question)  # 同步 def 路由由框架放在线程池执行。
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except APIError as error:
        # 给调用者稳定错误信息，不直接返回内部认证或网络错误详情。
        raise HTTPException(status_code=502, detail="模型服务暂时不可用") from error
