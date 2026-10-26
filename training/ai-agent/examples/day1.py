"""Day 1：从一次模型请求理解输入、输出、响应状态和 token 用量。"""

from common import MODEL, get_client


def main() -> None:
    """执行一次付费 API 实验。

    参数：无。
    返回：None；响应内容打印到终端。
    副作用：向配置的 API 地址发出一次逻辑请求，SDK 可能自动重试。
    """
    client = get_client()  # 取得客户端；真正的模型请求发生在下一行。
    response = client.responses.create(
        model=MODEL,  # 模型 ID，例如 .env 中的 OPENAI_MODEL。
        instructions="用中文解释 IT 问题；没有依据时明确说明。",  # 本次行为要求。
        input="用户说 VPN 连不上。请给出三个澄清问题。",  # 本次用户输入。
        max_output_tokens=3000,  # 输出 token 上限，推理模型还会用它容纳推理 token。
        store=False,  # 不将本响应保存为可通过 Responses 接口继续读取的存储响应。
    )
    print("status:", response.status)  # completed / incomplete 等执行状态。
    print(response.output_text)  # SDK 汇总的文本输出；不包含完整的工具调用结构。
    print(response.usage)  # 输入、输出及总 token 用量；没有请求成功就未必有此对象。


# 直接运行 python day1.py 才执行 main；其他模块 import 它不会请求模型。
if __name__ == "__main__":
    main()
