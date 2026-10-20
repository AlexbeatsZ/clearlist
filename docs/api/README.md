# 让 AI 操作简清

Windows 或 macOS 打开简清后，本机接口默认位于 `http://127.0.0.1:49721/api/v1`。实际地址和访问令牌可在设置的「AI 接口」中复制；端口被占用时会选择空闲端口。接口只监听本机，不对局域网开放。Android 当前通过界面操作和 JSON 导入导出使用同一数据格式，不运行 HTTP 服务。

完整机器可读文档为 [openapi.json](openapi.json)。运行中的 `/openapi.json` 也返回同一份文档，需要 Bearer 认证。

## 推荐：使用命令行客户端

在源码目录运行，客户端自动从当前用户的 `api.json` 读取地址和令牌，不会把令牌打印出来：

```sh
npm run ai -- GET /health
npm run ai -- GET "/tasks?view=today"
npm run ai -- GET /lists
npm run ai -- POST /tasks --body-file task.json
npm run ai -- PATCH /tasks/TASK_ID --body-file changes.json
npm run ai -- POST /tasks/TASK_ID/complete
npm run ai -- POST /tasks/TASK_ID/reopen
npm run ai -- DELETE /tasks/TASK_ID
npm run ai -- POST /tasks/TASK_ID/restore
npm run ai -- GET /stats
```

创建任务的 `task.json` 示例：

```json
{
  "title": "整理下周的实验计划",
  "notes": "先列出要验证的假设",
  "due": "2026-10-26",
  "priority": 2,
  "tags": ["实验"],
  "repeat": "none"
}
```

清单不指定时使用默认清单。标题必填，其他字段可省略；优先级 1 最高、4 无优先级。子任务使用 `{ "id": "唯一ID", "title": "步骤", "done": false }`。不要在普通 PATCH 中提交完成时间、创建时间或任务 ID，完成和恢复应调用专门动作。

## 直接 HTTP 调用

请求携带 `Authorization: Bearer <访问令牌>`；有 JSON 请求体时携带 `Content-Type: application/json`。

```http
POST /api/v1/tasks HTTP/1.1
Host: 127.0.0.1:49721
Authorization: Bearer <访问令牌>
Content-Type: application/json

{"title":"阅读一篇论文","priority":2}
```

成功响应格式：

```json
{
  "data": { "id": "任务ID", "title": "阅读一篇论文" },
  "revision": "当前状态版本"
}
```

任务列表返回 `data.items`、`total`、`offset`、`limit`，每页最多 500 项。`view` 可为 `all`、`today`、`upcoming`、`inbox`、`completed`、`trash`、`list:<清单ID>`、`tag:<标签>`，`q` 搜索标题、备注、子任务和标签。

读取响应的 `ETag` 可以用于下次写请求的 `If-Match`。若期间有其他修改，返回 409，请先读取最新数据再决定如何修改；不要自动用旧快照覆盖。

## 其他接口

| 方法与路径                                            | 操作                                                    |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `GET /tasks/{id}`                                     | 读取单个任务，含完成与回收站状态                        |
| `GET /lists`, `POST /lists`                           | 列出、创建清单                                          |
| `PATCH /lists/{id}`, `DELETE /lists/{id}`             | 修改或删除清单；删除后任务移到默认清单                  |
| `GET /settings`, `PATCH /settings`                    | 外观和专注偏好                                          |
| `GET /focus`                                          | 当前计时器及最近专注记录                                |
| `POST /focus/start`                                   | JSON：`{"taskId":"任务ID","minutes":25,"kind":"focus"}` |
| `POST /focus/pause`, `/focus/resume`, `/focus/cancel` | 暂停、继续或取消计时                                    |
| `GET /stats`                                          | 七天和累计统计                                          |
| `GET /export`                                         | 在 `data` 中导出完整 v1 JSON，不含令牌                  |
| `POST /import`                                        | 请求体为完整 v1 JSON，按更新时间合并                    |

应用运行时才提供接口。配置文件位于 Windows `%APPDATA%\Clearlist\api.json`、macOS `~/Library/Application Support/Clearlist/api.json`。可通过当前进程环境变量 `CLEARLIST_API_PORT` 指定端口，`CLEARLIST_API_DISABLE=1` 关闭接口。测试独立数据目录可向客户端传入 `--profile <目录>`。

令牌相当于本机任务的访问权限，交给需要操作简清的 AI 工具即可，不要放入公开提示词、仓库、截图或共享文档。
