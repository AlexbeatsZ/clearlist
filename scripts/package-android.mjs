import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile, open } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';

const root = process.cwd();
const windows = process.platform === 'win32';
const debug = process.argv.includes('--debug');
const sdk =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  (windows
    ? path.join(process.env.LOCALAPPDATA, 'Android/Sdk')
    : path.join(os.homedir(), 'Library/Android/sdk'));
const studioJava = windows
  ? 'C:/Program Files/Android/Android Studio/jbr'
  : '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
const java =
  process.env.CLEARLIST_JAVA_HOME ?? (existsSync(studioJava) ? studioJava : process.env.JAVA_HOME);
const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  GRADLE_USER_HOME: process.env.GRADLE_USER_HOME ?? path.join(root, '.local/gradle'),
  ...(java ? { JAVA_HOME: java } : {}),
};
const proxy = env.HTTPS_PROXY ?? env.HTTP_PROXY;
if (proxy) {
  const url = new URL(proxy);
  if (!url.username && !url.password)
    env.GRADLE_OPTS = `${env.GRADLE_OPTS ?? ''} -Dhttps.proxyHost=${url.hostname} -Dhttps.proxyPort=${url.port || 80} -Dhttp.proxyHost=${url.hostname} -Dhttp.proxyPort=${url.port || 80}`;
}
async function run(command, args, cwd = root, customEnv = env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: customEnv,
      stdio: 'inherit',
      windowsHide: true,
      ...(windows && command.endsWith('.bat') ? { shell: true } : {}),
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(command)} failed (${code})`)),
    );
  });
}
await writeFile(
  path.join(root, 'android/local.properties'),
  `sdk.dir=${sdk.replace(/\\/g, '/').replace(/:/g, '\\:')}\n`,
);
if (!debug) {
  const directory = path.join(root, '.local/android-signing');
  await mkdir(directory, { recursive: true });
  const credentialPath = path.join(directory, 'credentials.json'),
    keystore = path.join(directory, 'clearlist-release.jks');
  let credentials;
  if (existsSync(credentialPath)) credentials = JSON.parse(await readFile(credentialPath, 'utf8'));
  else {
    if (existsSync(keystore))
      throw new Error(
        'Signing key exists without credentials; preserve it and restore credentials.',
      );
    credentials = { password: randomBytes(24).toString('hex') };
    const file = await open(credentialPath, 'wx', 0o600);
    try {
      await file.writeFile(JSON.stringify(credentials));
      await file.sync();
    } finally {
      await file.close();
    }
    if (JSON.parse(await readFile(credentialPath, 'utf8')).password !== credentials.password)
      throw new Error('Signing credentials did not persist; no key generated.');
  }
  if (!existsSync(keystore)) {
    const keytool = java ? path.join(java, `bin/keytool${windows ? '.exe' : ''}`) : 'keytool';
    await run(
      keytool,
      [
        '-genkeypair',
        '-noprompt',
        '-keystore',
        keystore,
        '-storetype',
        'PKCS12',
        '-alias',
        'clearlist',
        '-keyalg',
        'RSA',
        '-keysize',
        '3072',
        '-validity',
        '10000',
        '-dname',
        'CN=Clearlist, O=Clearlist contributors, C=CN',
        '-storepass:env',
        'CLEARLIST_KEY_PASSWORD',
        '-keypass:env',
        'CLEARLIST_KEY_PASSWORD',
      ],
      root,
      { ...env, CLEARLIST_KEY_PASSWORD: credentials.password },
    );
  }
  env.CLEARLIST_KEYSTORE = keystore;
  env.CLEARLIST_KEY_PASSWORD = credentials.password;
}
await run(
  windows ? 'gradlew.bat' : './gradlew',
  ['--no-daemon', debug ? ':app:assembleDebug' : ':app:assembleRelease', ':app:lintDebug'],
  path.join(root, 'android'),
);
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir('release', { recursive: true });
const target = `release/Clearlist-${version}-Android${debug ? '-debug' : ''}.apk`;
await copyFile(
  `android/app/build/outputs/apk/${debug ? 'debug/app-debug' : 'release/app-release'}.apk`,
  target,
);
console.log(`Created ${target}. Signing material remains in ignored .local/ only.`);
