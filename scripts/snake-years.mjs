// Draw a contribution snake (light and dark) for every calendar year from <firstYear>
// to now, named snake-<year>.svg and snake-<year>-dark.svg. Past years never change;
// the current year is redrawn on every run.
// generate-snake-animation always asks GitHub for the last 12 months, so this
// adds a from/to date range to its contributions query before it is sent.
// Usage: GITHUB_TOKEN=... node scripts/snake-years.mjs <user> <firstYear> <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { generateSnakeAnimation } from "generate-snake-animation";

const [user, firstYear, outDir] = process.argv.slice(2);
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

const now = new Date();
for (let year = Number(firstYear); year <= now.getUTCFullYear(); year++) {
  const current = year === now.getUTCFullYear();
  range = { from: `${year}-01-01T00:00:00Z`, to: current ? now.toISOString() : `${year}-12-31T23:59:59Z` };
  const [light, dark] = await generateSnakeAnimation(
    { platform: "github", username: user, githubToken: process.env.GITHUB_TOKEN },
    [output(themes.light), output(themes.dark)],
  );
  writeFileSync(`${outDir}/snake-${year}.svg`, light);
  writeFileSync(`${outDir}/snake-${year}-dark.svg`, dark);
  console.log(`snake-${year} done`);
}
