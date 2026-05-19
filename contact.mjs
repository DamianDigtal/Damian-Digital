// Serverless function — Vercel auto-mounts this at /api/contact
// The Web3Forms access key stays server-side via process.env. It is
// never sent to or visible in the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Vercel parses JSON bodies automatically; fall back just in case.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const name = (body.name || '').toString().trim();
  const business = (body.business || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const message = (body.message || '').toString().trim();
  const looking_for = (body.looking_for || '').toString().trim();

  // Honeypot — bots tick this hidden field. Pretend success, send nothing.
  if (body.botcheck) {
    return res.status(200).json({ success: true });
  }

  // Required-field validation
  if (!name || !business || !email || !message) {
    return res.status(400).json({ success: false, message: 'Please fill in every required field.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'That email address looks invalid.' });
  }

  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    return res.status(500).json({ success: false, message: 'Form is not configured.' });
  }

  try {
    const upstream = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: 'New Free Design request — Damian Digital',
        from_name: 'Damian Digital — Website',
        name,
        business,
        email,
        message,
        looking_for: looking_for || 'Not specified',
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (upstream.ok && data.success) {
      return res.status(200).json({ success: true });
    }
    return res.status(502).json({ success: false, message: 'Could not deliver your message.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
}
