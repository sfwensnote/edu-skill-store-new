// 所有访问者共用的教师体验账号；仅保存校验摘要。
export const publicTeacherAccount = {
  "id": "public-teacher",
  "login": "test",
  "name": "李老师",
  "role": "teacher",
  "disabled": false,
  "salt": "be9fb6859707ac6d1185632e86f8e27c",
  "hash": "ebfca81b81be636b21be601c44ffb723b927631604f29a048a1721212913490c"
} as const;
