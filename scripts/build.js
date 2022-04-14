import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import css from "css";

const paths = {
  propsRepo: "/raw.githubusercontent.com/argyleink/open-props/main",
  propsUnpkg: "https://unpkg.com/open-props",
  myRepo: process.cwd(),
};

const propsPackageJsonResponse = await fetch(
  "https:/" + path.posix.join(paths.propsRepo, "package.json")
);
const propsPackageJson = await propsPackageJsonResponse.json();

const myPackageJsonBuffer = fs.readFileSync(
  path.join(paths.myRepo, "package.json")
);
const myPackageJson = JSON.parse(myPackageJsonBuffer);

myPackageJson.version = propsPackageJson.version;
myPackageJson.keywords = propsPackageJson.keywords;
myPackageJson.keywords.push("sass");
myPackageJson.keywords.push("scss");

fs.writeFileSync("package.json", JSON.stringify(myPackageJson, null, 2) + "\n");

/** @type {Array<string>} */
const sassSB = new Array();

const propsUnpkgResponse = await fetch(paths.propsUnpkg);
const propsUnpkg = await propsUnpkgResponse.text();

const propsUnpkgScss = propsUnpkg.replace(
  /var\(--[\w\n]+\)/gi,
  (x) => "#{$" + x.substring(4, x.length - 1) + "}"
);

const propsStyleSheet = css.parse(propsUnpkgScss, {
  silent: true,
});

const rules = [...propsStyleSheet.stylesheet.rules];

while (rules.length !== 0) {
  const rule = rules.shift();
  switch (rule.type) {
    case "rule":
      if (rule.declarations) {
        rules.push(...rule.declarations);
      }
      break;
    case "declaration":
      if (rule.property && rule.property.startsWith("--")) {
        sassSB.push(
          "$" + rule.property.substring(2) + ": " + rule.value.split(";--")[0]
        );
      }
      break;
    case "keyframes":
      let kfs = "@keyframes " + rule.name;
      for (const keyframe of rule.keyframes) {
        kfs += "\n  " + keyframe.values.join(", ");
        for (const declaration of keyframe.declarations) {
          kfs += "\n    " + declaration.property + ": " + declaration.value;
        }
      }
      sassSB.push(kfs);
      break;
    default:
      // console.debug(rule);
      break;
  }
}

fs.writeFileSync("./open-props.sass", sassSB.join("\n") + "\n");
