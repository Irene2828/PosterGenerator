const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tplKey, overrides } = req.body;
    const token = process.env.GITHUB_TOKEN;
    const repoOwner = 'Irene2828';
    const repoName = 'PosterGenerator';
    const filePath = 'public/overrides.json';
    
    if (token) {
      // 1. Get SHA of existing file from GitHub
      const getFileRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      let sha = '';
      let existingContent = {};
      if (getFileRes.ok) {
        const fileData = await getFileRes.json();
        sha = fileData.sha;
        const contentStr = Buffer.from(fileData.content, 'base64').toString('utf8');
        existingContent = JSON.parse(contentStr || '{}');
      }
      
      existingContent[tplKey] = overrides;
      const updatedContentBase64 = Buffer.from(JSON.stringify(existingContent, null, 2)).toString('base64');
      
      // 2. Update file in GitHub
      const putFileRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update overrides for ${tplKey} [skip ci]`,
          content: updatedContentBase64,
          sha
        })
      });
      
      if (!putFileRes.ok) {
        const errText = await putFileRes.text();
        throw new Error(`GitHub API error: ${errText}`);
      }
      
      return res.status(200).json({ success: true, method: 'github' });
    } else {
      // Fallback for local serverless running
      const overridesPath = path.join(process.cwd(), 'public', 'overrides.json');
      let existing = {};
      if (fs.existsSync(overridesPath)) {
        existing = JSON.parse(fs.readFileSync(overridesPath, 'utf8') || '{}');
      }
      existing[tplKey] = overrides;
      fs.writeFileSync(overridesPath, JSON.stringify(existing, null, 2), 'utf8');
      
      return res.status(200).json({ success: true, method: 'local' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
