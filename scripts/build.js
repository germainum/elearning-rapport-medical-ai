/**
 * Génère le paquet SCORM :
 *   1. valide content/module.json
 *   2. copie src/ et content/ dans build/package/
 *   3. génère imsmanifest.xml (liste exhaustive des fichiers)
 *   4. produit dist/<id>-<version>-scorm12.zip, manifeste à la racine du zip
 *
 *   node scripts/build.js               → SCORM 1.2 (par défaut)
 *   node scripts/build.js --scorm=2004  → SCORM 2004 4e édition
 */

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { CONTENT_DIR, ROOT, checkModuleFile, printReport } from './validate.js';
import { createZip } from './lib/zip.js';

const SRC_DIR = join(ROOT, 'src');
const STAGE_DIR = join(ROOT, 'build', 'package');
const DIST_DIR = join(ROOT, 'dist');

// Fichiers parasites (Windows, OneDrive, macOS, éditeurs) exclus du paquet.
const IGNORED = /^(\..*|desktop\.ini|Thumbs\.db|~\$.*|.*\.tmp)$/i;

// --xapi : paquet pour un LRS (tincan.xml à la racine, sans manifeste SCORM) ; le paquet SCORM n'est pas modifié
const xapiPackage = process.argv.includes('--xapi');
const scormArg = process.argv.find((arg) => arg.startsWith('--scorm='));
const scormVersion = scormArg ? scormArg.split('=')[1] : '1.2';
if (!['1.2', '2004'].includes(scormVersion)) {
  console.error(`Version SCORM inconnue : « ${scormVersion} ». Utilisez --scorm=1.2 ou --scorm=2004.`);
  process.exit(1);
}

/* ---------- 1. Validation ---------- */

const report = checkModuleFile();
printReport(report);
if (report.errors.length) {
  console.error('\nBuild interrompu : corrigez les erreurs ci-dessus.');
  process.exit(1);
}
const module = report.module;

/* ---------- 2. Copie ---------- */

rmSync(STAGE_DIR, { recursive: true, force: true });
mkdirSync(STAGE_DIR, { recursive: true });

const copyFilter = (source) => !IGNORED.test(source.split(sep).pop());
cpSync(SRC_DIR, STAGE_DIR, { recursive: true, filter: copyFilter });
cpSync(CONTENT_DIR, join(STAGE_DIR, 'content'), { recursive: true, filter: copyFilter });

const indexPath = join(STAGE_DIR, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');
if (!indexHtml.includes('data-scorm-version="1.2"')) {
  console.error('src/index.html : attribut data-scorm-version="1.2" introuvable sur <html>.');
  process.exit(1);
}
writeFileSync(indexPath, indexHtml.replace('data-scorm-version="1.2"', `data-scorm-version="${scormVersion}"`));

/* ---------- 2 bis. Adresses versionnées ----------
 * Feuilles de style, scripts et imports portent « ?v=<version> » dans le paquet : un navigateur (ou un cache d'hébergeur) qui garde
 * l'ancien app.js ne le mélange plus avec la nouvelle page. Les noms de fichiers du paquet et du manifeste ne changent pas. */
const versionQuery = `?v=${module.version}`;
writeFileSync(
  indexPath,
  readFileSync(indexPath, 'utf8')
    .replace(/(href="css\/[^"?]+\.css)"/g, `$1${versionQuery}"`)
    .replace(/(src="js\/[^"?]+\.js)"/g, `$1${versionQuery}"`),
);
(function versionImports(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) versionImports(path);
    else if (entry.name.endsWith('.js')) {
      writeFileSync(path, readFileSync(path, 'utf8').replace(/(from\s+'\.{1,2}\/[^'?]+\.js)'/g, `$1${versionQuery}'`));
    }
  }
})(join(STAGE_DIR, 'js'));

/* ---------- 3. Manifeste ---------- */

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [relative(STAGE_DIR, path).split(sep).join('/')];
  });
}

const files = listFiles(STAGE_DIR).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));

const xml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

const ids = {
  manifest: `MANIFEST-${module.id}`,
  organization: `ORG-${module.id}`,
  item: `ITEM-${module.id}`,
  resource: `RES-${module.id}`,
};
const fileList = files.map((file) => `      <file href="${xml(file)}"/>`).join('\n');
const title = xml(module.title);

const manifests = {
  '1.2': `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${ids.manifest}" version="${xml(module.version)}"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${ids.organization}">
    <organization identifier="${ids.organization}">
      <title>${title}</title>
      <item identifier="${ids.item}" identifierref="${ids.resource}" isvisible="true">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${ids.resource}" type="webcontent" adlcp:scormtype="sco" href="index.html">
${fileList}
    </resource>
  </resources>
</manifest>
`,

  '2004': `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${ids.manifest}" version="${xml(module.version)}"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="${ids.organization}">
    <organization identifier="${ids.organization}">
      <title>${title}</title>
      <item identifier="${ids.item}" identifierref="${ids.resource}">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${ids.resource}" type="webcontent" adlcp:scormType="sco" href="index.html">
${fileList}
    </resource>
  </resources>
</manifest>
`,
};

const activityId = module.xapi?.activityId ?? `https://www.aivd.ch/xapi/${module.id}`;
const tincan = `<?xml version="1.0" encoding="UTF-8"?>
<tincan xmlns="http://projecttincan.com/tincan.xsd">
  <activities>
    <activity id="${xml(activityId)}" type="http://adlnet.gov/expapi/activities/course">
      <name lang="fr-CH">${title}</name>
      <description lang="fr-CH">${xml(module.description ?? module.title)}</description>
      <launch lang="fr-CH">index.html</launch>
    </activity>
  </activities>
</tincan>
`;

const descriptor = xapiPackage ? 'tincan.xml' : 'imsmanifest.xml';
writeFileSync(join(STAGE_DIR, descriptor), xapiPackage ? tincan : manifests[scormVersion]);

/* ---------- 4. Zip ---------- */

const entries = [descriptor, ...files].map((name) => ({
  name,
  data: readFileSync(join(STAGE_DIR, ...name.split('/'))),
}));
const zip = createZip(entries);

mkdirSync(DIST_DIR, { recursive: true });
const suffix = xapiPackage ? 'xapi' : scormVersion === '1.2' ? 'scorm12' : 'scorm2004';
const zipName = `${module.id}-${module.version}-${suffix}.zip`;
writeFileSync(join(DIST_DIR, zipName), zip);

console.log(`\nPaquet ${xapiPackage ? 'xAPI (tincan.xml)' : `SCORM ${scormVersion}`} : dist/${zipName}`);
console.log(`  ${entries.length} fichiers, ${(zip.length / 1024).toFixed(1)} Ko`);
console.log('  Aperçu local du paquet : npm run preview');
