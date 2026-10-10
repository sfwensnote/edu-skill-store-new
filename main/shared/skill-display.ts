import type { SkillEntry } from './marketplace';

export function skillValidationLabel(entry: SkillEntry): string {
  return entry.demo || /预置|示例|待验证/.test(entry.validation) ? '待核对' : entry.validation;
}

export function skillCreatorLabel(entry: SkillEntry): string {
  return entry.creator === '预置教师示例' ? '教师' : entry.creator;
}

export function skillSourceText(entry: SkillEntry): string {
  // 只隐藏旧版本自动写入的说明，不改写教师资料或来源快照。
  return entry.source.replace(/(?:平台预置|教师方法示例|教师核对的预置方法)[\s\S]*$/, '')
    .replace(/(复制自“[^”]+”[（(][^（）()]*?)[，,]v\d+(?:\.\d+)*([）)])/g, '$1$2')
    .replace(/预置教师示例/g, '教师').trim();
}
