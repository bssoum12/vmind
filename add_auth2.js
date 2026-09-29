const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            if (content.includes("getAuthToken()") && !content.includes("function getAuthToken")) {
                const helper = `
function getAuthToken() {
  if (typeof window === 'undefined') return '';
  const mcpToken = localStorage.getItem('vmind_mcp_token');
  if (mcpToken) return mcpToken;
  try {
    const sessionStr = localStorage.getItem('vmind_session');
    if (!sessionStr) return '';
    if (sessionStr.startsWith('eyJ')) return sessionStr;
    const parsed = JSON.parse(sessionStr);
    return parsed?.token || parsed?.access_token || parsed?.user?.token || '';
  } catch(e) { return ''; }
}
`;
                content = content.replace(/("use client";(\r?\n)+)/, match => match + helper);
                if (!content.includes(helper.trim())) {
                  content = helper + '\n' + content;
                }
                
                fs.writeFileSync(fullPath, content);
                console.log(`Injected getAuthToken into ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'features/right_panel'));
