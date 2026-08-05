import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

const openapiPath = join(process.cwd(), 'docs/openapi.yaml');

router.get('/openapi.yaml', (_req, res) => {
  res.type('application/yaml').send(readFileSync(openapiPath, 'utf8'));
});

router.get('/docs', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>FPL API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/openapi.yaml',
      dom_id: '#swagger-ui',
    });
  </script>
</body>
</html>`);
});

export default router;
