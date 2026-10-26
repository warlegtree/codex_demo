"""Day 2：用 Pydantic 明确模型输出的字段及其类型。"""

from typing import Literal

from pydantic import BaseModel, Field

from common import MODEL, get_client


class TicketIntent(BaseModel):
    """意图识别结果；字段必须存在，ticket_id 的值可以是 None。"""

    intent: Literal["lookup", "howto", "other"] = Field(
        description="lookup=查询工单；howto=操作方法；other=其他意图"
    )
    ticket_id: str | None = Field(description="原文提供的工单编号；未提供则为 null")
    needs_clarification: bool = Field(description="查询工单但缺少编号时为 true")


def main() -> None:
    """识别一条请求并打印类型化结果。

    参数：无。
    返回：None；打印意图对象的字典表示，或响应未完成的说明。
    副作用：调用模型。解析方法也可能因截断或解析失败而抛出异常。
    """
    response = get_client().responses.parse(
        model=MODEL,
        instructions=(
            "识别用户意图。没有提供工单号时 ticket_id 为 null，不要猜测。"
            "查询工单但缺少编号时 needs_clarification 为 true。"
        ),
        input="帮我看看 T1001 处理好了没有。",
        text_format=TicketIntent,  # 传类，不是 TicketIntent()；SDK 从类生成 JSON Schema。
        max_output_tokens=3000,
        store=False,
    )
    # output_parsed 是 TicketIntent 实例或 None；文本拒绝不一定符合我们要求的结构。
    if response.status == "completed" and response.output_parsed is not None:
        result = response.output_parsed
        print(result.model_dump())  # Pydantic 实例 → Python 字典，尚不是 JSON 字符串。
        if result.needs_clarification:
            print("请提供工单编号。")
    else:
        print("未取得有效结构化结果；检查拒绝或响应截断。", response.status)


if __name__ == "__main__":
    main()
