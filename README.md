# 魂斗罗 - 网页版游戏

一个基于HTML5 Canvas和JavaScript开发的经典魂斗罗游戏网页版。

## 🎮 游戏特色

- **经典横版射击**：重温经典魂斗罗游戏体验
- **流畅操作**：支持键盘和鼠标操作
- **多种武器**：激光束、散弹枪等特殊武器
- **关卡系统**：多个关卡，最终Boss战
- **音效系统**：完整的射击音效
- **响应式设计**：适配不同屏幕尺寸

## 🎯 操作说明

- **W** - 跳跃/二段跳
- **A/D** - 左右移动
- **空格键/鼠标点击** - 射击
- **S 或 ↓** - 主动掉落平台
- **R** - 重新开始游戏
- **鼠标移动** - 瞄准

## 🚀 快速开始

### 在线游玩
直接访问 [GitHub Pages](https://your-username.github.io/hun/) 即可开始游戏

### 本地运行
1. 克隆仓库
```bash
git clone https://github.com/your-username/hun.git
cd hun
```

2. 使用本地服务器运行（推荐）
```bash
# 使用Python
python -m http.server 8000

# 或使用Node.js
npx http-server

# 或使用Live Server (VS Code扩展)
```

3. 在浏览器中打开 `http://localhost:8000`

## 🛠️ 开发工具

### 音频处理
项目包含音频处理脚本：
- `trim_audio.py` - 音频剪辑工具
- `remove_background.py` - 背景移除工具

### 依赖安装
```bash
pip install -r requirements.txt
```

## 📁 项目结构

```
hun/
├── index.html          # 主页面
├── game.js            # 游戏逻辑
├── assets/            # 游戏资源
│   ├── *.png         # 图片资源
│   └── *.wav         # 音频资源
├── trim_audio.py      # 音频处理脚本
├── remove_background.py # 图片处理脚本
└── requirements.txt   # Python依赖
```

## 🎨 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **游戏引擎**: 原生Canvas API
- **音频处理**: librosa, soundfile
- **图像处理**: Pillow, rembg

## 🎮 游戏机制

- **生命值系统**: 玩家有100点生命值
- **武器系统**: 收集道具获得特殊武器
- **敌人AI**: 智能敌人行为
- **关卡进度**: 分数和关卡显示
- **碰撞检测**: 精确的物理碰撞

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！ 