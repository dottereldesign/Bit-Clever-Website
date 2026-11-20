"""Summarize matched live Lighthouse runs into a standalone, local audit report."""
import json, statistics, html
from pathlib import Path
root = Path('.local')
categories = ['performance', 'accessibility', 'best-practices', 'seo']
metrics = ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift']
summary = {}
reports = {}
for stage in ['stable-before', 'stable-after']:
 for profile in ['mobile', 'desktop']:
  paths = sorted(root.glob(f'lighthouse-{stage}-{profile}-*.report.json'))
  if len(paths) != 3: raise RuntimeError(f'Expected three matched runs: {stage} {profile}')
  runs = [json.loads(p.read_text(encoding='utf-8')) for p in paths]
  reports[stage, profile] = runs
  summary[stage, profile] = {
   'scores': {c:[round(r['categories'][c]['score']*100) for r in runs] for c in categories},
   'metrics': {m:statistics.median(r['audits'][m]['numericValue'] for r in runs) for m in metrics},
   'transferred': statistics.median(r['audits']['total-byte-weight']['numericValue'] for r in runs),
  }
versions = {(r['lighthouseVersion'],r['environment']['hostUserAgent']) for runs in reports.values() for r in runs}
if len(versions) != 1: raise RuntimeError('Browser/Lighthouse versions differ between runs')
def score_row(profile, category):
 before=summary['stable-before',profile]['scores'][category];after=summary['stable-after',profile]['scores'][category]
 return f'<tr><td>{profile.title()}</td><td>{category.title()}</td><td>{statistics.median(before)} <small>({min(before)}–{max(before)})</small></td><td>{statistics.median(after)} <small>({min(after)}–{max(after)})</small></td></tr>'
rows=''.join(score_row(p,c) for p in ['mobile','desktop'] for c in categories)
metric_rows=''
for p in ['mobile','desktop']:
 for m in metrics:
  before=summary['stable-before',p]['metrics'][m];after=summary['stable-after',p]['metrics'][m]
  unit='' if m=='cumulative-layout-shift' else ' ms'
  metric_rows+=f'<tr><td>{p.title()}</td><td>{m}</td><td>{before:.1f}{unit}</td><td>{after:.1f}{unit}</td></tr>'
links=''.join(f'<li><a href="{p.name}">{p.name}</a></li>' for p in sorted(root.glob('lighthouse-stable-*.report.html')))
responsive=json.loads((root/'responsive-after.json').read_text(encoding='utf-8'))
viewports=', '.join(f"{r['width']}×{r['height']}" for r in responsive)
settings=reports['stable-after','mobile'][0]['configSettings']
desktop_settings=reports['stable-after','desktop'][0]['configSettings']
page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bit Clever performance audit</title>
<style>body{{font:16px/1.6 system-ui,sans-serif;color:#132c2a;background:#f6f8f7;max-width:1050px;margin:40px auto;padding:0 24px 60px}}h1,h2{{line-height:1.2}}h2{{margin-top:40px}}table{{width:100%;border-collapse:collapse;background:white;margin:20px 0}}th,td{{text-align:left;padding:10px 14px;border-bottom:1px solid #dbe5e0}}th{{background:#123433;color:white}}small{{color:#596963}}code,pre{{background:#e5ede9;padding:2px 5px}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;padding:16px}}a{{color:#12694d}}.lead{{font-size:20px}}li{{margin:8px 0}}</style>
<h1>Bit Clever: performance and code audit</h1><p>20 November 2026 · GitHub Pages · One-page site</p>
<p class="lead">A no-cost audit and optimization of the existing design. Animation paths, motion curves, durations, selected defaults and the placeholder CTAs are preserved.</p>
<p>Live URL: <a href="https://dottereldesign.github.io/Bit-Clever-Website/">Bit Clever Website</a></p>
<h2>Matched Lighthouse results</h2><p>Median of three fresh-profile, sequential runs per device profile, before and after deployment. Ranges appear in parentheses. These are lab measurements on this machine, not field Core Web Vitals or a guarantee for every visitor.</p>
<table><tr><th>Profile</th><th>Category</th><th>Before</th><th>After</th></tr>{rows}</table>
<table><tr><th>Profile</th><th>Metric</th><th>Before median</th><th>After median</th></tr>{metric_rows}</table>
<h2>Findings and completed fix plan</h2><ol>
<li><strong>High priority — main-thread background computation.</strong> The original renderer calculated up to four million gradient/noise pixels on the UI thread. It now runs in a module worker with transferable output. Resize and preset requests coalesce; unsupported workers use a fallback. Nine pixel comparisons across sizes, grain types and densities were byte-identical.</li>
<li><strong>High priority — redundant animation work.</strong> Unchanged handwriting frames were repainted during B’s fall and exit, including repeated blank canvas allocation. The controller now reuses the existing pixels. ResizeObserver replaces repeated geometry reads in the animation frame loop. The approved handwriting data and motion module are unchanged.</li>
<li><strong>Medium priority — redundant graphics and requests.</strong> SVG paint order now hides it beneath the opaque B without a second inverse luminance mask. Duplicate 80% logo files/downloads are removed. Existing handwriting JSON and the default SVG are discoverable earlier through preloads; there is no shortened animation or delayed workaround to inflate the score.</li>
<li><strong>Medium priority — metadata and errors.</strong> Added a real SVG favicon to remove the root favicon 404, a descriptive title and meta description, and an accessible page heading. No-JavaScript visitors see the static logo and message without empty controls.</li>
<li><strong>Cleanup.</strong> Removed three unreferenced older logo assets, two duplicate default logos, an unused noise field, an unused hostname variable, and the obsolete local save endpoint. Updated stale documentation. No framework, build dependency, tracking library, paid API, service worker or hosting migration was added.</li></ol>
<h2>Responsive and functional review</h2><p>Checked {viewports}. No horizontal overflow, header collision, clipped message or off-screen settings panel was found in these cases. CTA clicks leave the URL unchanged. Keyboard menu opening/closing, every default, saved choices, all 30 motion styles, high-density rendering, worker fallback, no-JavaScript rendering and reduced motion were checked.</p><p>Call Me and Request a Quote intentionally remain non-functional buttons. Navigation labels still point to placeholder sections; real destinations/content remain a future content task, not an optimization change. Lighthouse accessibility checks are automated; this is not a complete screen-reader or WCAG certification.</p>
<h2>Hosting limits and remaining plan</h2><ul><li><strong>Keep GitHub Pages.</strong> The live asset responses use GitHub’s approximately ten-minute cache policy. Response cache headers, CDN routing/TTFB, server compression and security response headers are hosting-managed; a static repository cannot configure a custom server. No paid CDN/proxy is proposed just to eliminate those warnings.</li><li><strong>Keep the reveal.</strong> Final logo/message visibility intentionally follows the animation. That can affect LCP/Speed Index; removing the reveal to chase 100 would conflict with the design.</li><li><strong>Future content.</strong> Add meaningful section destinations and CTA behavior only when requested. Re-run this audit when large images, fonts, video or new sections are added.</li></ul>
<h2>Methodology and caveats</h2><p>Tool/browser: {html.escape(str(next(iter(versions))))}. Standard Lighthouse mobile and desktop simulated throttling, fresh storage/profile for each run, headless CLI, no mouse or existing browser tabs controlled. All repeated final measurements use the same live URL and browser version.</p><p>The initial exploratory runs used bundled Chromium 151 and showed multi-second GPU stalls absent from the installed Chrome 157 trace. Those results are retained as diagnostics but excluded from the matched score table. A CPU-backed-canvas experiment did not improve the result and was reverted. Local diagnostic runs are also excluded.</p><p>As <a href="https://developer.chrome.com/docs/lighthouse/performance/performance-scoring">Chrome’s Lighthouse scoring documentation</a> explains, scores vary with machine and network conditions; repeated measurements are more useful than one best result. Hosting context: <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits">GitHub Pages limits</a>.</p>
<details><summary>Exact test configuration</summary><pre>{html.escape(json.dumps({'mobile':{'screen':settings['screenEmulation'],'throttling':settings['throttling']},'desktop':{'screen':desktop_settings['screenEmulation'],'throttling':desktop_settings['throttling']}},indent=2))}</pre></details>
<h2>Full Lighthouse reports</h2><ul>{links}</ul><p>JSON reports sit alongside the HTML reports. Reproduce with <code>tools/run-lighthouse.ps1</code>; layout audit with <code>tools/audit-responsive.cjs</code>.</p></html>'''
(root/'performance-audit.html').write_text(page,encoding='utf-8')
(root/'performance-summary.json').write_text(json.dumps({f'{s}/{p}':data for (s,p),data in summary.items()},indent=2),encoding='utf-8')
for (stage,profile),data in summary.items():print(stage,profile,{k:statistics.median(v) for k,v in data['scores'].items()},data['metrics'])
