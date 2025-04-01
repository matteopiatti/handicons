import fs from "fs";
import path from "path";
import svgtofont from "svgtofont";
import SVGFixer from "oslllo-svg-fixer";
import { optimize } from "svgo";
import pkg from "./package.json" with { type: "json" };

// Options
const FONT_NAME = "HandIcons";
const CLASS_NAME = "hand-icons";
const SVG_DIR = "./svg";
const SVG_FIX_DIR = "./svgfix";
const DIST_DIR = "./dist";

fs.mkdirSync(DIST_DIR, { recursive: true });
fs.mkdirSync(SVG_FIX_DIR, { recursive: true });

(async () => {
  // Fix SVGs (stroke to outline)
  await SVGFixer(SVG_DIR, SVG_FIX_DIR, { showProgrssBar: true }).fix();

  // Optimize SVGs
  const files = fs.readdirSync(SVG_FIX_DIR);
  for (const file of files) {
    const filePath = path.join(SVG_FIX_DIR, file);
    const content = fs.readFileSync(filePath, "utf8");
    const result = optimize(content, {
      multipass: true,
      floatPrecision: 3, // reduce jitter
      plugins: [
        "removeDimensions",
        "convertPathData",
        "mergePaths",
        "removeUselessStrokeAndFill",
      ],
    });
    fs.writeFileSync(filePath, result.data);
  }

  // Generate font and library
  await svgtofont({
    src: SVG_FIX_DIR,
    dist: DIST_DIR,
    fontName: FONT_NAME,
    generateInfoData: true,
    emptyDist: true,
    classNamePrefix: CLASS_NAME,
    css: {
      output: DIST_DIR,
      include: "\\.(css)$",
    },
    svgicons2svgfont: {
      normalize: true,
      fontHeight: 1000,
    },
    excludeFormat: ["eot", "svg", "symbol.svg"],
    useNameAsUnicode: true,
    website: {
      template: "index.njk",
      logo: "logo.svg",
      version: pkg.version,
      meta: {
        description: "Hand Drawn Icons Font",
        favicon: "logo.ico",
      },
    },
  });

  // generate JS that exports everything
  const indexContent = `
    export * as HandIcons from './${FONT_NAME}.css';
    export * as ${FONT_NAME}Ttf from './${FONT_NAME}.ttf';
    export * as ${FONT_NAME}Woff from './${FONT_NAME}.woff';
    export * as ${FONT_NAME}Woff2 from './${FONT_NAME}.woff2';
    export * as info from './info.json';
  `;
  fs.writeFileSync(path.join(DIST_DIR, 'index.js'), indexContent.trim());

  // Delete unwanted/unneeded files
  fs.unlinkSync(path.join(DIST_DIR, "unicode.html"));
  fs.unlinkSync(path.join(DIST_DIR, "symbol.html"));
  fs.readdirSync(SVG_FIX_DIR).forEach((file) => {
    fs.unlinkSync(path.join(SVG_FIX_DIR, file));
  });
  fs.rmdirSync(SVG_FIX_DIR, { recursive: true });
  
  console.log("Font and library built successfully!");
})();
