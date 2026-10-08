const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  content = content.replace(/bg-\[#590317\]/g, 'bg-brand');
  content = content.replace(/text-\[#590317\]/g, 'text-brand');
  content = content.replace(/border-\[#590317\]/g, 'border-brand');
  content = content.replace(/ring-\[#590317\]/g, 'ring-brand');
  content = content.replace(/fill-\[#590317\]/g, 'fill-brand');
  content = content.replace(/accent-\[#590317\]/g, 'accent-brand');
  
  content = content.replace(/bg-\[#73041e\]/g, 'bg-brand-hover');
  content = content.replace(/text-\[#73041e\]/g, 'text-brand-hover');
  content = content.replace(/border-\[#73041e\]/g, 'border-brand-hover');
  content = content.replace(/hover:bg-\[#73041e\]/g, 'hover:bg-brand-hover');
  content = content.replace(/hover:text-\[#73041e\]/g, 'hover:text-brand-hover');
  
  content = content.replace(/bg-\[#400210\]/g, 'bg-brand-active');
  content = content.replace(/active:bg-\[#400210\]/g, 'active:bg-brand-active');
  content = content.replace(/from-\[#590317\]/g, 'from-brand');
  content = content.replace(/via-\[#73041e\]/g, 'via-brand-hover');
  content = content.replace(/to-\[#400210\]/g, 'to-brand-active');

  content = content.replace(/focus:ring-\[#590317\]/g, 'focus:ring-brand');
  content = content.replace(/focus:border-\[#590317\]/g, 'focus:border-brand');
  content = content.replace(/focus-visible:ring-\[#590317\]/g, 'focus-visible:ring-brand');
  content = content.replace(/group-hover:text-\[#590317\]/g, 'group-hover:text-brand');
  content = content.replace(/selection:bg-\[#590317\]/g, 'selection:bg-brand');
  
  content = content.replace(/ring-\[#590317\]\/20/g, 'ring-brand/20');
  content = content.replace(/bg-\[#590317\]\/20/g, 'bg-brand/20');
  content = content.replace(/text-\[#590317\]\/80/g, 'text-brand/80');

  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated', filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walk('src');
