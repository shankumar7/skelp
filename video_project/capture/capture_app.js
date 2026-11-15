// Captures the REAL Skelp! interface from the app's web build (served on localhost:8099):
// high-resolution stills of each screen plus a timestamped frame sequence of a live auction.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'assets');
const URL = process.env.SKELP_URL || 'http://localhost:8099/';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  const still = (name) => page.screenshot({ path: path.join(OUT, 'screenshots', name + '.png') });
  const tap = (text) => page.getByText(text, { exact: true }).first().click({ timeout: 15000 });

  await page.goto(URL);
  await page.getByText('WELCOME TO THE ARENA').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500); await still('welcome');

  // create a local profile
  await tap('WANT TO GET ACQUAINTED?');
  await page.getByPlaceholder('Your email address').fill('shan@example.com');
  await page.getByPlaceholder('Create username').fill('Shan');
  await page.getByPlaceholder('Password').fill('secret1');
  await tap('SIGN UP');
  await page.getByText('PLAYER SELECT').waitFor();
  await tap('CHAMP'); await page.waitForTimeout(400); await still('avatar');
  await tap('ENTER ARENA');
  await page.getByText('WELCOME BACK,').waitFor({ timeout: 10000 });
  await page.getByLabel('Mute sounds').click(); // silent capture; the film has its own soundtrack
  await page.waitForTimeout(1500); await still('dashboard');

  await tap('SCOUT THE PLAYER POOL');
  await page.getByText('137 OF 137 PLAYERS').waitFor(); await page.waitForTimeout(500); await still('pool');
  await page.getByLabel('Back').click();

  await tap('SOLO PRACTICE');
  await page.getByText('YOU VS BOTS').waitFor();
  await tap('QUICK'); await page.waitForTimeout(500); await still('lobby');
  await tap('START AUCTION');
  await page.getByText(/LIVE • LOT 1\/40/).waitFor();

  // ---- live auction: timestamped frames + interaction events ----
  const recDir = path.join(OUT, 'recording');
  for (const f of fs.readdirSync(recDir)) fs.unlinkSync(path.join(recDir, f));
  const frames = [], events = [];
  const t0 = Date.now();
  const now = () => (Date.now() - t0) / 1000;
  const bidAt = [1.3, 4.2, 7.0];
  let soldAt = null, i = 0;
  while (now() < 80 && (soldAt === null || now() < soldAt + 2.6)) {
    const t = now();
    const file = `f${String(i++).padStart(4, '0')}.jpg`;
    await page.screenshot({ path: path.join(recDir, file), type: 'jpeg', quality: 92 });
    frames.push({ t, file });
    if (bidAt.length && t >= bidAt[0]) {
      const btn = page.getByLabel(/^Bid ₹/);
      if (await btn.count()) { await btn.first().click().catch(() => {}); events.push({ t: now(), type: 'bid' }); bidAt.shift(); }
    }
    if (soldAt === null && (await page.getByText('SOLD!').count())) { soldAt = now(); events.push({ t: soldAt, type: 'sold' }); }
  }
  fs.writeFileSync(path.join(recDir, 'timeline.json'), JSON.stringify({ frames, events }, null, 1));
  console.log('recorded', frames.length, 'frames over', now().toFixed(1), 's; events:', JSON.stringify(events));

  // keep playing until we own a few players, for the squad / sold / results screens
  for (let k = 0; k < 500; k++) {
    const squad = parseInt((await page.getByText(/^\d+\/8$/).first().textContent().catch(() => '0/8')) || '0');
    if (squad >= 4) break;
    const btn = page.getByLabel(/^Bid ₹/);
    if (await btn.count()) await btn.first().click().catch(() => {});
    await page.waitForTimeout(220);
  }
  await page.getByText(/LIVE • LOT/).waitFor();
  await tap('SOLD'); await page.waitForTimeout(500); await still('sold');
  await tap('SQUADS'); await page.waitForTimeout(500); await still('squads');
  await tap('TEAMS'); await page.waitForTimeout(400); await still('teams');
  await tap('END AUCTION');
  await page.getByText('AUCTION COMPLETE').waitFor({ timeout: 10000 });
  await page.waitForTimeout(800); await still('results');
  await browser.close();
  console.log('stills:', fs.readdirSync(path.join(OUT, 'screenshots')).join(' '));
})().catch((e) => { console.error('CAPTURE FAILED', e.message); process.exit(1); });
