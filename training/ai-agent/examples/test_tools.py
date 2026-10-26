"""Day 6：四项离线测试；不请求模型、不需要真实 API Key。"""

import pytest
from pydantic import ValidationError

from toolbox import TicketArgs, lookup_ticket, search_kb


def test_ticket_not_found() -> None:
    """参数：无。返回：None；不存在的工单必须返回 not_found，否则断言失败。"""
    assert lookup_ticket("T9999") == {"error": "not_found"}


def test_reject_extra_arguments() -> None:
    """参数：无。返回：None；多余字段必须触发 ValidationError。"""
    # pytest.raises：块内必须抛出指定异常；没有抛出时，测试反而失败。
    with pytest.raises(ValidationError):
        TicketArgs.model_validate({"ticket_id": "T1001", "admin": True})


def test_retrieval() -> None:
    """参数：无。返回：None；VPN 问题的首个检索结果必须指向正确来源。"""
    hits = search_kb("VPN 无法连接")["hits"]
    assert hits[0]["source"] == "vpn#1"


def test_no_relevant_document() -> None:
    """参数：无。返回：None；完全无词项重叠的问题应返回空命中列表。"""
    assert search_kb("火星种植土豆")["hits"] == []
