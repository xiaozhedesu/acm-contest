import { JSDOM } from 'jsdom'
import { json } from 'stream/consumers';

export namespace Tool {
    /**
     * 向目标网址发送请求并将请求文本转换为dom
     * @param url 将要发送请求的目标网址
     * @returns 返回获取到的document
     */
    export async function getWebsiteDocument(url: string): Promise<Document> {
        const htmlText = await fetch(url).then(response => {
            if (response.ok) {
                return response.text()
            } else {
                throw new Error(`request error: ${url}`)
            }
        });
        const { document } = (new JSDOM(htmlText)).window;
        return document;
    }

    /**
     * 向目标网址发送请求并将请求文本转换为对象
     * @param url 将要发送请求的目标网址
     * @returns 返回获取到的JSON对象
     */
    export async function fetchJSON(url: string): Promise<Object> {
        const jsonText = await fetch(url).then(response => {
            if (response.ok) {
                return response.text()
            } else {
                throw new Error(`request error: ${url}`)
            }
        })
        return JSON.parse(jsonText);
    }
}