# Open Test - 测试用例管理系统

一个现代化的测试用例管理平台，支持脚本市场、测试用例管理、目录组织和执行统计。

## 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **构建工具**: Vite 8
- **样式**: Tailwind CSS 4 + CSS 变量
- **UI 组件库**: shadcn/ui (Radix UI)
- **图标**: Lucide React

### 后端
- **框架**: FastAPI
- **ORM**: SQLAlchemy 2.0 (异步)
- **数据库**: SQLite (aiosqlite)

## 快速开始

### 前端

```bash
# 安装依赖
npm install

# 开发服务器（热重载）
npm run dev

# 生产构建
npm run build

# ESLint 检查
npm run lint
```

### 后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 初始化示例数据
python seed.py

# 启动服务
uvicorn main:app --reload --port 8000
```

## 项目结构

```
open-test/
├── src/                          # 前端源码
│   ├── components/               # React 组件
│   │   ├── ui/                   # shadcn/ui 基础组件
│   │   ├── Header.tsx             # 顶部导航栏
│   │   ├── CapsuleSidebar.tsx     # 胶囊侧边栏
│   │   ├── Console.tsx            # 控制台页面
│   │   ├── ScriptMarket.tsx       # 脚本市场
│   │   └── TestCaseMarket.tsx     # 测试用例市场
│   ├── services/
│   │   └── api.ts                 # API 调用服务
│   └── lib/
│       └── utils.ts               # 工具函数
│
├── backend/                      # 后端源码
│   ├── main.py                   # FastAPI 入口
│   ├── config.py                 # 配置
│   ├── database.py               # 数据库连接
│   ├── models.py                 # SQLAlchemy 模型（脚本、执行记录）
│   ├── models_test_case.py       # 测试用例模型
│   ├── models_directory.py       # 目录模型
│   ├── schemas.py                # Pydantic schemas
│   ├── crud.py                   # CRUD 操作
│   └── routers/                  # API 路由
│       ├── scripts.py            # 脚本 API
│       ├── test_cases.py         # 测试用例 API
│       ├── directories.py        # 目录 API
│       └── console.py            # 控制台 API
```

## 功能模块

### 脚本市场 (ScriptMarket)
- 浏览和管理测试脚本
- 按分类筛选
- 搜索功能
- 精选脚本推荐

### 测试用例市场 (TestCaseMarket)
- 测试用例的增删改查
- **目录管理**：支持最多2层目录结构
- 按目录、类型、优先级筛选
- 标签管理
- 执行统计（通过率、自动化率等）

### 控制台 (Console)
- 测试执行统计概览
- 执行趋势图表
- 历史执行记录

## API 端点

### 脚本
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/scripts` | 获取脚本列表 |
| GET | `/scripts/featured` | 获取精选脚本 |
| POST | `/scripts` | 创建脚本 |
| PUT | `/scripts/{id}` | 更新脚本 |
| DELETE | `/scripts/{id}` | 删除脚本 |

### 测试用例
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/test-cases` | 获取用例列表 |
| GET | `/test-cases/{id}` | 获取用例详情 |
| GET | `/test-cases/stats` | 获取用例统计 |
| POST | `/test-cases` | 创建用例 |
| PUT | `/test-cases/{id}` | 更新用例 |
| DELETE | `/test-cases/{id}` | 删除用例 |

### 目录
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/directories` | 获取目录列表 |
| GET | `/directories/{id}` | 获取目录详情 |
| POST | `/directories` | 创建目录 |
| PUT | `/directories/{id}` | 更新目录 |
| DELETE | `/directories/{id}` | 删除目录 |

### 控制台
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/console/stats` | 获取控制台统计 |
| GET | `/console/executions` | 获取执行记录 |
| POST | `/console/executions` | 创建执行记录 |

## 数据模型

### 目录 (Directory)
```
- id: 主键
- name: 目录名称
- description: 描述
- icon: 图标
- color: 颜色主题
- parent_id: 父目录ID（支持2层目录）
- sort_order: 排序
- case_count: 用例数量
- is_default: 是否默认目录
- created_at: 创建时间
- updated_at: 更新时间
```

### 测试用例 (TestCase)
```
- id: 主键
- name: 用例名称
- description: 描述
- case_type: 类型 (api/ui/e2e/unit/perf)
- priority: 优先级 (P0/P1/P2/P3)
- status: 状态 (active/deprecated/draft)
- module: 所属模块
- directory_id: 所属目录
- preconditions: 前置条件
- test_steps: 测试步骤
- expected_results: 预期结果
- author: 作者
- tags: 标签
- script_id: 关联脚本
- is_automated: 是否自动化
- is_parallel: 是否可并行
- total_runs: 总执行次数
- passed_runs: 通过次数
- failed_runs: 失败次数
- flaky: 是否不稳定
```

## 初始化数据

```bash
cd backend

# 初始化所有示例数据（脚本、用例、目录）
python seed.py

# 或单独初始化
python seed_scripts.py      # 脚本
python seed_directories.py   # 目录
python seed_test_cases.py    # 用例
```

## 代码规范

- 每个函数/类只做一件事
- 相似逻辑封装为函数或工具类
- 公共接口、复杂算法、非直观逻辑需附带注释
- 函数包含 docstring（Google/NumPy 风格）
- 缩进、命名、空格、换行格式统一
