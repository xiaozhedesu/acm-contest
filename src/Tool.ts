import { JSDOM } from 'jsdom'

export namespace Tool {
    /**
     * 向目标网址发送请求并将请求文本转换为dom
     * @param url 将要发送请求的目标网址
     * @returns 返回获取到的document的querySelector方法
     */
    export async function getWebsiteDocument(url: string) {
        const htmlText = await fetch(url)
            .then(response => response.ok ? response.text() : 'Error');
        if (htmlText === 'Error') {
            throw new Error(`request error: ${url}`)
        }
        const { document } = (new JSDOM(htmlText)).window;
        return (param) => document.querySelector(param);
    }
}