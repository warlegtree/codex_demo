"""教学工具注册表；Day 3 只查询虚构工单，Day 4 再追加知识库工具。"""

import re  # 标准库：用正则表达式检查工单编号。
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# 公开的虚构数据；这些演示工单不属于任何真实用户。
TICKETS = {
    "T1001": {"status": "处理中", "summary": "VPN 无法连接"},
    "T1002": {"status": "已解决", "summary": "密码重置"},
}


class TicketArgs(BaseModel):
    """查询工具的参数结构：只接受一个字符串 ticket_id。"""

    # extra=forbid 禁止多余参数；strict=True 禁止自动把错误类型转成正确类型。
    model_config = ConfigDict(extra="forbid", strict=True)
    ticket_id: str = Field(description="工单编号，格式为 T 加四位数字，例如 T1001")


def lookup_ticket(ticket_id: str) -> dict[str, Any]:
    """查询一个虚构工单；此函数不调用模型、不修改数据。

    参数：ticket_id，必填字符串，例如 'T1001'，大小写敏感。
    返回：成功时 {'status': '处理中', 'summary': 'VPN 无法连接'}。
          格式错误时 {'error': 'invalid_ticket_id'}；不存在时 {'error': 'not_found'}。
    前提：Agent 已使用 TicketArgs 校验类型；直接调用者应自行传入字符串。
    """
    # fullmatch 要求整个字符串都匹配；r 前缀使反斜杠作为正则语法保留。
    if not re.fullmatch(r"T\d{4}", ticket_id):
        return {"error": "invalid_ticket_id"}
    # dict.get(key, default) 在键不存在时返回默认结果，避免抛出 KeyError。
    return TICKETS.get(ticket_id, {"error": "not_found"})


# 工具名 → (参数模型类, 真正执行的 Python 函数, 提供给模型的工具说明)。
# 这里存的是函数对象 lookup_ticket，而不是执行 lookup_ticket(...) 后的结果。
REGISTRY = {
    "lookup_ticket": (
        TicketArgs,
        lookup_ticket,
        "查询演示工单；编号格式为 T 加四位数字。",
    ),
}


# 以下部分在 Day 4 追加到 toolbox.py 末尾，复用上面的 re、Field 等导入。
DOCS = {
    "vpn#1": "VPN 无法连接：先检查网络，再重新登录客户端；仍失败则提交 IT 工单。",
    "password#1": "密码重置：使用公司自助门户。不要向他人提供密码或验证码。",
    "leave#1": "年假申请：在 HR 系统提交，经直属主管批准后生效。",
}


class SearchArgs(BaseModel):
    """知识库工具的参数结构：query 是搜索词或自然语言问题。"""

    model_config = ConfigDict(extra="forbid", strict=True)
    query: str = Field(description="需要检索的故障、流程或问题，例如 VPN 无法连接")


def terms(text: str) -> set[str]:
    """把文本转换成用于比较的词项集合；不执行向量化。

    参数：text，必填字符串，例如 'VPN 无法连接'。
    返回：去重后的 set[str]，该例为 {'vpn', '无法', '法连', '连接'}，集合没有固定顺序。
    边界：单个汉字不会产生双字词项；这是教学基线的局限。
    """
    words = re.findall(r"[a-z0-9]+", text.lower())  # 英文小写化，提取英文/数字片段。
    for part in re.findall(r"[\u4e00-\u9fff]+", text):  # 提取连续的中文片段。
        # 相邻两字滑动切分；如“无法连接” → “无法”“法连”“连接”。
        words.extend(part[i:i + 2] for i in range(len(part) - 1))
    return set(words)  # 集合去重，便于求交集与并集。


def search_kb(query: str) -> dict[str, Any]:
    """用词项集合相似度检索知识库，最多返回两个命中片段。

    参数：query，必填字符串；去空白后不能为空，原始长度不超过 500 字符。
    返回：{'hits': [{'source': 'vpn#1', 'text': '...', 'score': 0.5}, ...]}。
          无命中返回 {'hits': []}；输入无效返回 {'error': 'invalid_query'}。
    说明：score 是 Jaccard 词面相似度，不是答案正确的概率。
    """
    if not query.strip() or len(query) > 500:
        return {"error": "invalid_query"}
    query_terms = terms(query)
    scored = []
    for source, body in DOCS.items():
        document_terms = terms(body)
        # & 是交集，| 是并集；max(1, ...) 避免空集合导致除以零。
        score = len(query_terms & document_terms) / max(1, len(query_terms | document_terms))
        if score > 0:
            scored.append({"source": source, "text": body, "score": score})

    # key 指定排序字段，reverse=True 降序，[:2] 只保留前两个命中。
    ranked = sorted(scored, key=lambda item: item["score"], reverse=True)
    return {"hits": ranked[:2]}


REGISTRY["search_kb"] = (
    SearchArgs,
    search_kb,
    "检索演示公司知识库；返回带 source 的片段。",
)
