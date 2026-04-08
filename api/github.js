/**
 * Vercel serverless proxy for GitHub cert-store API.
 * Token lives only in the GITHUB_TOKEN environment variable — never in client code.
 *
 * Usage from browser:
 *   GET  /api/github?path=certs/certificates.json
 *   PUT  /api/github?path=certs/certificates.json   (body = GitHub Contents API PUT payload)
 *   GET  /api/github?path=submissions/submissions.json
 *   PUT  /api/github?path=submissions/submissions.json
 */
export default async function handler(req, res) {
  // CORS – same-origin only (fobexams.vercel.app calls itself)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN env var not set on Vercel' });
  }

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'path query param required' });

  // Only allow access to the cert-store repo paths
  const allowed = ['certs/certificates.json', 'submissions/submissions.json', 'access-codes/codes.json'];
  if (!allowed.includes(path)) {
    return res.status(403).json({ error: 'path not allowed' });
  }

  const ghUrl = `https://api.github.com/repos/fullonbaan/fob-cert-store/contents/${path}`;
  const ghHeaders = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'fobexams-vercel-proxy'
  };

  try {
    const options = { method: req.method, headers: ghHeaders };
    if (req.method === 'PUT') {
      options.body = JSON.stringify(req.body);
    }

    const ghRes = await fetch(ghUrl, options);
    const data = await ghRes.json();
    return res.status(ghRes.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
