import { Logging } from 'homebridge';
import { chromium } from 'playwright-core';
import { runStepsBeforeCheck } from './runStepsBeforeCheck';
import { ChangeCheck } from './types/optionTypes';

require('dotenv').config();

type getValueFromPageProps = {
    browserPath: string;
    changeCheck: ChangeCheck;
    waitForSelectorTimeout?: number;
    log: Logging;
    verboseLogging?: boolean;
    debugMode?: boolean;
};

export const getValueFromPage = async (props: getValueFromPageProps) => {
    let foundValue: string | undefined = undefined;
    const browser = await chromium.launch({
        executablePath: props.browserPath
    });

    try {
        if (props.verboseLogging) { props.log('Initialize browser'); }

        const page = await browser.newPage();

        if (process.env.NODE_ENV === 'test') {
            page.setDefaultTimeout(2000);
        }

        if (props.verboseLogging) { props.log('Browser initialized'); }

        await page.goto(props.changeCheck.url, { waitUntil: 'domcontentloaded', timeout: 10000 });

        if (props.debugMode) {
            await page.screenshot({ path: 'src/__tests__/screenshots/localDebugger-step-start.jpg', fullPage: true });
        }

        // Execute steps before actual check
        if (props.changeCheck.stepsBeforeCheck) {
            await runStepsBeforeCheck(page, props.changeCheck.stepsBeforeCheck, props.debugMode);
        }

        if (props.debugMode) {
            await page.screenshot({ path: 'src/__tests__/screenshots/localDebugger-step-final.jpg', fullPage: true });
        }

        const text = await page.innerText(props.changeCheck.selector, {
            timeout: props.waitForSelectorTimeout || 30000 // 30 seconds
        });

        if (props.verboseLogging) { props.log('Selector loaded'); }

        if (text) {
            foundValue = text.replace(/(?:\r\n|\r|\n)/g, '').replace(/\s+/g, ' ').trim();
        }
    } catch (e) {
        props.log.warn(e.toString());

        foundValue = undefined;
    } finally {
        await browser.close();

        return foundValue;
    }
}
