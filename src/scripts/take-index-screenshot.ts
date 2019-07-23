import { spawn } from 'child_process';
import readline from 'readline';

import puppeteer from 'puppeteer';
import commander from "commander";

const screenshot_name = 'README/screenshot.png';

const parser = commander
  .option("-p, --port <port>", "change port", "3001")
  .option("-d, --resource <resource>", "change resource directory", "resource")
  .parse(process.argv);

const port = parser.port;
const resource = parser.resource;

const proc = spawn("npm", ["start", "--", "-p", port, "-d", resource]);

const started_message = `revealjs-markdown-server listening on port ${port}`;

const stdout_if = readline.createInterface(proc.stdout);

proc.stdout.setEncoding('utf8');
stdout_if.on('line', (line: string) => {
  const founded = line.indexOf(started_message);
  if (founded !== -1) {
    take()
      .catch(e => console.error(e))
      .then(() => {
        proc.kill('SIGINT');
        console.log('kill', proc.killed);
      });
  };
});

proc.on('close', (code) => {
  console.info(`child_process exit with ${code}.`);
});

stdout_if.on('close', () => {
  console.error("child_process stdout closed.");
});

async function take() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox']});
  console.log('puppeteer.launch()');
  try {
    const page = await browser.newPage();
    console.log('browser.newPage()');
    await page.setViewport({ width: 1300, height: 960});
    await page.goto(`http://localhost:${port}`, {
      waitUntil: 'networkidle0'
    });
    console.log('page.goto()');
    await page.screenshot({path: screenshot_name});
    console.log('page.screenshot()');
  } catch (e) {}
  await browser.close();
  console.log('browser.close()');
  return;
}
