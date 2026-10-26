"""Day 7 选修：使用 Agents SDK 执行知识检索与回答的循环。"""

from typing import Any

from agents import Agent, Runner, function_tool, set_tracing_disabled

from common import MODEL  # 导入 common 时也会加载 .env。
from toolbox import search_kb

set_tracing_disabled(True)  # 本实验关闭 SDK 的远程 tracing；不影响主模型请求。


@function_tool
def search(query: str) -> dict[str, Any]:
    """检索演示公司知识库，返回带来源的片段。

    Args:
        query: 必填搜索文本，例如 VPN 无法连接；1–500 字符且不能只有空白。

    Returns:
        包含 hits 列表的字典；无命中时列表为空，输入无效时包含 error。

    包装函数本身不请求模型、不写数据；装饰器从类型和文档生成工具定义。
    """
    return search_kb(query)


bot = Agent(
    name="知识库助理",  # 调试和路由时使用的 Agent 名称，不是模型 ID。
    model=MODEL,
    instructions="必须先检索，依据片段回答，标注 [source]。无证据则说明。",
    tools=[search],  # 传包装后的工具对象；不要写成 search(...)。
)


def main() -> None:
    """参数：无。返回：None；调用模型并打印 Runner 返回的最终输出。"""
    result = Runner.run_sync(
        bot,  # starting_agent：从哪个 Agent 开始执行。
        "VPN 无法连接怎么办？",  # input：本次任务输入。
        max_turns=6,  # SDK 执行回合上限；不等于六次 HTTP 尝试或总时长限制。
    )
    print(result.final_output)  # Runner 的结果属性，与 Responses.output_text 不同。


if __name__ == "__main__":
    main()
