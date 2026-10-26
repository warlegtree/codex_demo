"""Day 5 独立实验：模型可生成草稿，提交确认只在可信终端入口发生。"""

import sqlite3
import uuid
from collections.abc import Iterator
from contextlib import contextmanager


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """为 with 语句提供一个自动提交/回滚并关闭的数据库连接。

    参数：无。数据库固定为当前工作目录的 tickets.db。
    产出：sqlite3.Connection，可使用 db.execute(sql, parameters) 执行语句。
    副作用：创建文件和不存在的表；正常退出提交，异常退出回滚，最终关闭连接。
    注意：函数含 yield，是上下文管理器；用 with connect() as db，而非直接当连接用。
    """
    db = sqlite3.connect("tickets.db")
    try:
        with db:  # sqlite3 连接自身的上下文管理器负责事务，不会自动关闭连接。
            db.execute("CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, body TEXT)")
            db.execute("CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, body TEXT)")
            yield db  # 暂停这里，执行外部 with 块；结束后恢复执行并关闭连接。
    finally:
        db.close()


def propose(body: str) -> dict[str, str]:
    """持久化一份不可编辑的演示工单草稿。

    参数：body，必填字符串；去空白后非空，原始长度 1–500 字符。
    返回：{'draft_id': '<32位随机十六进制字符串>', 'status': 'pending_approval'}。
    副作用：写 drafts 表；不会写 tickets 表。
    异常：输入无效抛出 ValueError；数据库异常向调用方传播。
    """
    if not isinstance(body, str) or not 1 <= len(body.strip()) <= 500:
        raise ValueError("草稿必须为 1–500 字符")
    draft_id = uuid.uuid4().hex  # 草稿 ID 同时用作后续写入的幂等键。
    with connect() as db:
        # ? 是参数占位符；参数由驱动绑定，不能用字符串拼接组装用户输入。
        db.execute("INSERT INTO drafts VALUES (?, ?)", (draft_id, body))
    return {"draft_id": draft_id, "status": "pending_approval"}


def approve_in_terminal(draft_id: str) -> dict[str, str]:
    """展示指定草稿，用户输入 APPROVE 后才写入本地工单表。

    参数：draft_id，必填，来自 propose() 的草稿 ID；不是 Day 3 的 T1001 格式。
    返回：取消时 {'status': 'cancelled'}；确认后 {'ticket_id': ..., 'status': 'created'}。
    副作用：终端交互；确认后写 tickets 表。对同一草稿重复确认不会新增第二条。
    异常：草稿不存在时抛出 ValueError。此函数不得注册为模型可调用工具。
    """
    with connect() as db:
        row = db.execute("SELECT body FROM drafts WHERE id=?", (draft_id,)).fetchone()
    if row is None:
        raise ValueError("草稿不存在")
    print("即将写入本地演示工单：", row[0])  # fetchone 返回元组；第 0 项是正文。
    if input("输入 APPROVE 确认，其他输入取消：") != "APPROVE":
        return {"status": "cancelled"}

    with connect() as db:
        # id 为主键；重复 ID 被忽略，使重放同一确认不会重复创建工单。
        db.execute("INSERT OR IGNORE INTO tickets VALUES (?, ?)", (draft_id, row[0]))
    return {"ticket_id": draft_id, "status": "created"}


if __name__ == "__main__":
    draft = propose("VPN 无法连接，重登后仍失败")
    print(draft)
    print(approve_in_terminal(draft["draft_id"]))
