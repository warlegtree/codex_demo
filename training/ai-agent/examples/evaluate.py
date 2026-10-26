"""Day 6：三个真实模型冒烟案例；运行本脚本会调用付费 API。"""

import json

from agent import run

# 每项包含 q(用户问题)、tool(必须调用的工具名)、contains(回答中应包含的片段)。
CASES = [
    {"q": "查询 T1001", "tool": "lookup_ticket", "contains": "处理中"},
    {"q": "VPN 无法连接怎么办？", "tool": "search_kb", "contains": "[vpn#1]"},
    {"q": "如何申请年假？", "tool": "search_kb", "contains": "[leave#1]"},
]


def main() -> None:
    """顺序执行案例，并报告每项结果与通过率。

    参数：无；案例固定来自模块变量 CASES。
    返回：None；终端输出 JSON 明细及 [0, 1] 区间内的冒烟通过率。
    副作用：每项 run() 可能产生多次模型请求；每个案例独立，不共享历史。
    边界：子串检查只是粗略代理指标，不足以证明语义正确或事实有依据。
    """
    results = []
    for case in CASES:
        result = run(case["q"])
        # 集合仅保留执行成功的工具名；同一个工具调用多次时去重。
        used = {item["tool"] for item in result["trace"] if item["ok"]}
        passed = (
            result["status"] == "completed"
            and case["tool"] in used
            and case["contains"] in result["answer"]
        )
        # **result 在字典中是展开键值，不是函数调用时的参数展开。
        results.append({"question": case["q"], "passed": passed, **result})

    print(json.dumps(results, ensure_ascii=False, indent=2))
    # bool 在求和时 True=1、False=0；CASES 固定非空。
    print("smoke pass rate:", sum(item["passed"] for item in results) / len(results))


if __name__ == "__main__":
    main()
