const fs = require('fs');
const filePath = 'Projects/MarkdownGraph/markdown/MarkdownGraph.md';

try {
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log('File length:', content.length);
  console.log('First 20 chars:', JSON.stringify(content.slice(0, 20)));
  console.log('Starts with ---:', content.startsWith('---'));

  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    console.log('End index:', end);
    if (end !== -1) {
      const yaml = content.slice(4, end);
      console.log('YAML block:', JSON.stringify(yaml));
      const m = yaml.match(/^title:\s*(.+)$/m);
      console.log('Match result:', m);
    } else {
      console.log('Closing --- not found with \\n---');
      // Try finding just ---
      const end2 = content.indexOf('---', 3);
      console.log('Next --- index:', end2);
      if (end2 !== -1) {
        console.log('Chars before next ---:', JSON.stringify(content.slice(end2 - 5, end2)));
      }
    }
  }
} catch (err) {
  console.error(err);
}
