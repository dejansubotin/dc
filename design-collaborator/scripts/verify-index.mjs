import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const indexPath = path.join(projectRoot, 'index.html');
const entryPath = path.join(projectRoot, 'index.tsx');

const [indexHtml, entryTsx] = await Promise.all([
  fs.readFile(indexPath, 'utf8'),
  fs.readFile(entryPath, 'utf8'),
]);

const checks = [
  {
    name: 'DOCTYPE present',
    pass: /<!doctype html>/i.test(indexHtml),
  },
  {
    name: 'Root mount element',
    pass: /<div\s+id=["']root["']\s*><\/div>/i.test(indexHtml),
  },
  {
    name: 'Module script entry',
    pass: /<script\s+type=["']module["']\s+src=["']\/index\.tsx["']\s*>\s*<\/script>/i.test(indexHtml),
  },
  {
    name: 'React mount lookup',
    pass: /getElementById\(["']root["']\)/.test(entryTsx),
  },
];

const failures = checks.filter((check) => !check.pass);

if (failures.length > 0) {
  console.error('Index verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure.name}`);
  }
  process.exit(1);
}

console.log('Index verification passed.');
