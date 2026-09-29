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
            
            // Search for fetch(`${baseUrl}/api/tools/...`, { headers: { ... } })
            // We want to add Authorization header.
            
            // A simple regex approach to inject the header if it's not already there.
            if (content.includes("fetch(") && content.includes("/api/tools/") && !content.includes("Authorization")) {
                // Add a helper function at the top if not present to get the token
                if (!content.includes("getAuthToken")) {
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
                    content = content.replace(/(import .* from '.*';\n)+/, match => match + helper);
                }

                // Inject Authorization into headers
                content = content.replace(/'Content-Type': 'application\/json',?/g, `'Content-Type': 'application/json',
          'Authorization': \`Bearer \${getAuthToken()}\`,`);
                content = content.replace(/"Content-Type": "application\/json",?/g, `"Content-Type": "application/json",
          "Authorization": \`Bearer \${getAuthToken()}\`,`);
                
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'features/right_panel'));
