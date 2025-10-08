const fs = require('fs');
const content = fs.readFileSync('pace-calculator-mobile.html', 'utf8');

// Extract all script content between <script> tags
const scriptMatches = content.match(/<script>([\s\S]*?)<\/script>/g);

if (scriptMatches) {
  scriptMatches.forEach((match, index) => {
    const scriptContent = match.replace(/<script>|<\/script>/g, '');
    
    // Skip external script tags
    if (scriptContent.trim().length === 0) return;
    
    try {
      new Function(scriptContent);
      console.log(`Script block ${index + 1}: OK`);
    } catch (e) {
      console.log(`Script block ${index + 1}: ERROR`);
      console.log(`  Error: ${e.message}`);
      
      // Try to find the approximate line
      const lines = scriptContent.split('\n');
      lines.forEach((line, lineIndex) => {
        if (line.includes('function function') || line.includes('} }') || line.includes('} else }')) {
          console.log(`  Suspicious line ${lineIndex + 1}: ${line.trim()}`);
        }
      });
    }
  });
}