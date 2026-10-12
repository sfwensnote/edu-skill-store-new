import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// 类型引用、再导出及样式导入都计入依赖，避免误删数据兼容和测试夹具。
const root = fileURLToPath(new URL('../', import.meta.url));
// TypeScript 在 Windows 返回正斜线路径，node:fs 返回反斜线路径；统一成绝对规范路径后再作为图键。
const toKey = file => path.resolve(file);
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
if (parsed.errors.length) throw new Error(parsed.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
const graph = new Map();
function collect(file) {
  file = toKey(file);
  if (graph.has(file)) return;
  const dependencies = new Set();
  graph.set(file, dependencies);
  const source = fs.readFileSync(file, 'utf8');
  function add(specifier) {
    const resolved = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;
    const dependency = resolved && !resolved.isExternalLibraryImport ? resolved.resolvedFileName
      : specifier.startsWith('.') && specifier.endsWith('.css') ? path.resolve(path.dirname(file), specifier) : undefined;
    if (dependency && fs.existsSync(dependency)) { const key = toKey(dependency); dependencies.add(key); collect(key); }
  }
  if (file.endsWith('.css')) {
    for (const match of source.matchAll(/@import\s+['"]([^'"]+)['"]/g)) add(match[1]);
    return;
  }
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) add(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) add(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const roots = ['src/main.tsx', 'server/index.ts', 'vite.config.ts', 'playwright.config.ts'].map(file => toKey(path.join(root, file)));
const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
for (const command of Object.values(scripts)) {
  const entry = String(command).match(/\btsx\s+([^\s]+\.ts)\b/)?.[1];
  if (entry) roots.push(toKey(path.join(root, entry)));
}
roots.push(...parsed.fileNames.filter(file => /\.(?:test|spec)\.tsx?$/.test(file)).map(toKey));
roots.forEach(collect);
const reachable = new Set();
function follow(file) {
  file = toKey(file);
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const dependency of graph.get(file) || []) follow(dependency);
}
roots.forEach(follow);
const unused = [];
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (/\.(tsx?|css)$/.test(file) && !reachable.has(toKey(file))) unused.push(path.relative(root, file));
  }
}
for (const directory of ['src', 'shared', 'server']) inspect(path.join(root, directory));
if (unused.length) {
  console.error(`以下源码没有入口或测试引用，请清理或补上真实调用：\n${unused.sort().join('\n')}`);
  process.exitCode = 1;
} else console.log('源码依赖检查通过：未发现无引用模块或样式文件。');
