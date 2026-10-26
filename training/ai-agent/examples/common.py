"""共用配置模块：加载环境变量，按需创建并复用同步 OpenAI 客户端。"""

import os  # 标准库：读取当前进程的环境变量。
from functools import lru_cache  # 标准库：缓存函数的返回对象。

from dotenv import load_dotenv  # 第三方包 python-dotenv：读取 .env 文件。
from openai import OpenAI  # OpenAI SDK 的同步客户端类。

# 文件 → 环境变量；默认不覆盖终端或部署环境中已经存在的同名变量。
# 此调用不会自动创建 MODEL 等 Python 变量，也不会发送模型请求。
load_dotenv()

# 环境变量 → Python 变量；不存在或为空时使用教学默认模型。
# OPENAI_MODEL 是本项目约定，后面仍需通过 model=MODEL 传给每次请求。
MODEL = os.getenv("OPENAI_MODEL") or "gpt-5-mini"


@lru_cache(maxsize=1)
def get_client() -> OpenAI:
    """获取当前进程复用的客户端。

    参数：无。
    返回：OpenAI 同步客户端；顺序重复调用返回同一对象。
    副作用：首次调用时读取认证与地址配置，初始化 HTTP 客户端。
    异常：本课程的 API Key 认证配置缺失时，SDK 可在初始化时抛出错误。
    示例：client = get_client()；此时尚未调用模型。
    """
    return OpenAI(
        # 未显式传 api_key：SDK 自动读取 OPENAI_API_KEY。
        # 未显式传 base_url：SDK 读取 OPENAI_BASE_URL，否则用官方默认地址。
        timeout=30.0,  # HTTP 连接、读写等操作的超时配置，单位秒；非任务总时限。
        max_retries=2,  # 对可重试故障最多额外尝试两次；合计最多三次请求尝试。
    )
