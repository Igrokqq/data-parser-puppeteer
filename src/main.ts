import puppeteer, { Page } from 'puppeteer';
import { program as commander } from 'commander';
import UserAgent from 'user-agents';

const logger = console;

type ParsedResourceData = Readonly<{
  result: string;
  score: number;
  sign: string;
}>;
type CommandLineInput = Readonly<{
  url: string;
}>

function parseCommandLineInput(input: NodeJS.Process['argv']): CommandLineInput {
  const parsedData = commander
    .option('-u, --url <url>', 'Specify URL')
    .parse(input)
    .opts();

  if (!parsedData.url) {
    throw new Error('Please specify URL using --url option.');
  }

  return parsedData as CommandLineInput;
}

async function configurePuppeteerMiddleware(page: Page): Promise<void> {
  await page.setViewport({
    width: 1920 + Math.floor(Math.random() * 100),
    height: 3000 + Math.floor(Math.random() * 100),
    deviceScaleFactor: 1,
    hasTouch: false,
    isLandscape: false,
    isMobile: false,
  });
  await page.setUserAgent(new UserAgent().random().toString());
  await page.setJavaScriptEnabled(true);
  await page.setDefaultNavigationTimeout(0);

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  await page.evaluateOnNewDocument(() => {
    (window as any).chrome = {
      runtime: {},
    };
  });
}

async function parseDataFromResource(url: string, contentSelector = '#data'): Promise<ParsedResourceData> {
  const browser = await puppeteer.launch({ headless: false, ignoreHTTPSErrors: true });
  const page = await browser.newPage();

  await configurePuppeteerMiddleware(page);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
  await page.waitForSelector(contentSelector, { visible: true });

  const content = await page.$eval(contentSelector, (element) => element.textContent);

  await browser.close();

  return JSON.parse(content || '{}');
}

async function main(): Promise<void> {
  const parsedInput = parseCommandLineInput(process.argv);
  const result = await parseDataFromResource(parsedInput.url);

  logger.log(result);
}

main().catch(logger.error);
