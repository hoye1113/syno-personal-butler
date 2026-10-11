import fs from 'node:fs';
import path from 'node:path';

const root = 'D:\\workSpace\\hoye-skills-main\\skill-collection';
const categories = fs.readdirSync(root, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_'))
  .map(d => d.name);

const inventory = [];

for (const cat of categories) {
  const catPath = path.join(root, cat);
  const items = fs.readdirSync(catPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const item of items) {
    const itemPath = path.join(catPath, item);
    let desc = '';
    const skillFile = path.join(itemPath, 'SKILL.md');
    const readmeFile = path.join(itemPath, 'README.md');
    const hasSkill = fs.existsSync(skillFile);
    const hasReadme = fs.existsSync(readmeFile);
    const targetFile = hasSkill ? skillFile : (hasReadme ? readmeFile : null);
    
    if (targetFile) {
      try {
        const content = fs.readFileSync(targetFile, 'utf8');
        const match = content.match(/description:\s*([^\n\r]+)/i) || content.match(/description:\s*\|\s*\n\s*([^\n\r]+)/i);
        if (match) {
          desc = match[1].trim().replace(/^['"]|['"]$/g, '');
        } else {
          const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('---'));
          desc = lines[0] ? lines[0].slice(0, 100) : '';
        }
      } catch (e) {}
    }
    inventory.push({ category: cat, name: item, hasSkill, hasReadme, desc: desc.slice(0, 150) });
  }
}

const cats = {};
inventory.forEach(i => cats[i.category] = (cats[i.category] || 0) + 1);

const result = {
  total: inventory.length,
  categoriesCount: categories.length,
  categoryBreakdown: cats,
  inventory
};

fs.mkdirSync('ops/artifacts/candidates', { recursive: true });
fs.writeFileSync('ops/artifacts/candidates/full-skills-inventory.json', JSON.stringify(result, null, 2), 'utf8');
console.log(`Scanned ${inventory.length} skills across ${categories.length} categories.`);
console.log('Category breakdown:', cats);
