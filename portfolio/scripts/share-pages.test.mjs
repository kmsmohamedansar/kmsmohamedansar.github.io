import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const slugs = ['agent-flight-recorder', 'storyera', 'site-recon', 'authorized-web-exposure-audit', 'reptrack', 'jarvis'];

test('share pages have their own URLs, case-study links and existing images', async () => {
  const sitemap = await readFile('public/sitemap.xml', 'utf8');
  for (const slug of slugs) {
    const html = await readFile(`public/p/${slug}/index.html`, 'utf8');
    assert.ok(sitemap.includes(`https://ansarbuilds.dev/p/${slug}/`), `${slug} missing from sitemap`);
    assert.ok(html.includes(`href="/#project/${slug}"`), `${slug} missing case study link`);
    assert.ok(html.includes(`rel="canonical" href="https://ansarbuilds.dev/p/${slug}/"`));
    const image = html.match(/property="og:image" content="https:\/\/ansarbuilds\.dev(\/[^"]+)"/);
    assert.ok(image, `${slug} missing image`);
    await access(resolve('public', `.${image[1]}`));
  }
});
