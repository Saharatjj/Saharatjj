// Draw a contribution snake and a year button for each of the last N calendar years.
// Files are named by how many years back they are (year-0 = this year), so the
// README never changes: on Jan 1 every button and snake rolls over by itself.
// generate-snake-animation always asks GitHub for the last 12 months, so this
// adds a from/to date range to its contributions query before it is sent.
// Usage: GITHUB_TOKEN=... node scripts/snake-years.mjs <user> <years> <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { generateSnakeAnimation } from "generate-snake-animation";

const [user, years, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

let range = null;
const realFetch = globalThis.fetch;
globalThis.fetch = (url, init) => {
  if (range && String(url).endsWith("/graphql") && init?.body) {
    const body = JSON.parse(init.body);
    body.query = body.query.replace(
      "contributionsCollection {",
      `contributionsCollection(from: "${range.from}", to: "${range.to}") {`,
    );
    init = { ...init, body: JSON.stringify(body) };
  }
  return realFetch(url, init);
};

const dots = (c) => ({ 1: c[1], 2: c[2], 3: c[3], 4: c[4] });
// Same colors as the main snake in .github/workflows/snake.yml
const themes = {
  light: { snake: "#0d9488", dots: ["#ebedf0", "#99f6e4", "#2dd4bf", "#14b8a6", "#0f766e"] },
  dark: { snake: "#ffffff", dots: ["#161b22", "#134e4a", "#0f766e", "#14b8a6", "#2dd4bf"] },
};
const output = (t) => ({
  format: "svg",
  drawOptions: {
    colorDots: dots(t.dots), colorEmpty: t.dots[0], colorDotBorder: "#1b1f230a", colorSnake: t.snake,
    sizeCell: 16, sizeDot: 12, sizeDotBorderRadius: 2,
  },
  animationOptions: { stepDurationMs: 100, frameByStep: 1 },
});

// Round button, grey at 25% opacity; the label reads in light and dark mode.
const button = (year) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="30" viewBox="0 0 72 30" role="img" aria-label="${year}">` +
  `<style>text{fill:#24292f}@media (prefers-color-scheme:dark){text{fill:#e6edf3}}</style>` +
  `<rect width="72" height="30" rx="15" fill="#6e7681" fill-opacity="0.25"/>` +
  `<text x="36" y="20" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="13" font-weight="600">${year}</text></svg>`;

const now = new Date();
for (let back = 0; back < Number(years); back++) {
  const year = now.getUTCFullYear() - back;
  range = { from: `${year}-01-01T00:00:00Z`, to: back === 0 ? now.toISOString() : `${year}-12-31T23:59:59Z` };
  const [light, dark] = await generateSnakeAnimation(
    { platform: "github", username: user, githubToken: process.env.GITHUB_TOKEN },
    [output(themes.light), output(themes.dark)],
  );
  writeFileSync(`${outDir}/year-${back}.svg`, light);
  writeFileSync(`${outDir}/year-${back}-dark.svg`, dark);
  writeFileSync(`${outDir}/year-${back}-button.svg`, button(year));
  console.log(`year-${back} (${year}) done`);
}
