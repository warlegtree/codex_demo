# 雨宿り · Rainy Corner

使用 HTML、Three.js 制作的雨夜便利店微缩三维场景。无人物和界面元素，可拖拽旋转、滚轮或双指缩放。

场景包含方形底座、便利店陈设、贩卖机、自行车、路灯、电线和街角设施，以及降雨、积水波纹、滴水、自动门和灯光变化。

## 本地运行

安装 Python 3，在项目目录运行：

```sh
python3 -m http.server 3000
```

Windows 可使用 `python -m http.server 3000`。浏览器打开 `http://localhost:3000`。请通过 HTTP 服务打开，直接双击 HTML 会受到浏览器模块加载限制。

如已安装 Node.js，也可运行 `npm run start`。不需要安装 npm 依赖，Three.js r160 和 OrbitControls 已随项目提供。

## 检查

```sh
npm run check
```

JavaScript 语法和 HTTP 资源加载已检查；尚未完成浏览器视觉验证。

## 第三方许可

`vendor/` 中的 Three.js 与 OrbitControls 使用 MIT 许可证，详见 `vendor/LICENSE`。
