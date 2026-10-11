// 已发布的存储键保持原值；改名会让教师已有资料无法读取。
export const ownersStorageKey = 'teaching-assistant.frontend-demo.v2';
export const marketWorkspaceKey = 'teaching-method.market-workspace.v1';
export const excludedSkillsKey = 'teaching-assistant.excluded-skills.v1';
export const companionsKey = 'teaching-method.companions.v1';
export type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
