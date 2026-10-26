"""Day 5：用本地 JSON 文件保存最近六组文本对话。"""

import json
from pathlib import Path

from agent import run


def chat() -> None:
    """启动单用户终端会话，输入 exit 退出。

    参数：无。
    返回：None；通过 input/print 交互。
    副作用：调用 Agent；读写当前工作目录的 history.json，不是脚本所在目录。
    边界：文件必须是有效的消息数组；当前实验不处理损坏文件或多用户并发。
    """
    path = Path("history.json")
    history = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    while True:
        question = input("你（exit 退出）> ").strip()
        if question == "exit":
            break
        if not question:
            print("请输入问题。")
            continue  # 回到下一次输入，不发出空请求。

        # 每轮存 user/assistant 两条；[-12:] 是最多六组，按消息数而非 token 截断。
        result = run(question, history=history[-12:])
        print(result["answer"])
        if result["status"] == "completed":
            history.extend([
                {"role": "user", "content": question},
                {"role": "assistant", "content": result["answer"]},
            ])
            path.write_text(
                json.dumps(history[-12:], ensure_ascii=False),
                encoding="utf-8",
            )


if __name__ == "__main__":
    chat()
