# GitHub Pages 部署指南

## 🚀 快速部署（5 分钟）

### 步骤 1：创建仓库
1. 登录 https://github.com
2. 点击右上角 **+** → **New repository**
3. 仓库名：`straw-lab`（或你喜欢的名字）
4. 可见性：**Public**（公开）
5. 点击 **Create repository**

### 步骤 2：上传文件
1. 在新页面点击 **uploading an existing file**
2. 把 `吸管搭建实验室.html` 拖进去
3. 重命名为 `index.html`（重要！）
4. Commit changes

### 步骤 3：启用 Pages
1. 点击仓库 **Settings**（设置）
2. 左侧菜单 **Pages**
3. Source 选择 **main** 分支
4. 点击 **Save**
5. 等待 1-2 分钟

### 步骤 4：获取链接
页面刷新后，顶部显示：
```
Your site is live at https://你的用户名.github.io/straw-lab/
```

---

## 📱 分享链接

复制链接发送到微信群/钉钉群，学生即可访问！

---

## ⚙️ 高级选项

### 自定义域名
在 Pages 设置中添加 Custom domain

### 私有仓库
如需私有，Pages 仍可公开（GitHub 免费计划支持）

---

## ❓ 常见问题

**Q: 页面显示 404？**
A: 确保文件名为 `index.html`，等待 2 分钟刷新

**Q: 更新后学生看不到新版本？**
A: 让学生硬刷新（Ctrl+F5 / Cmd+Shift+R）

**Q: 可以多人协作吗？**
A: 可以，添加协作者到仓库

---

**需要我帮你自动化部署吗？**
回复 "自动部署" 我帮你配置 GitHub Actions
