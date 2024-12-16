import { CodeforcesAPI } from "codeforces-api-ts"
import { logger } from "./index"
import { Tool } from './Tool';

/**
 * 牛客相关函数
 */
export namespace Niuke {
    const USER_NOT_FOUND: string = '查无此人，请确认名称输入正确且6个月内参加过至少一场牛客竞赛';
    export interface UserProfile {
        userName: string;
        userID: string;
        rating: number;
        rank: string;
        contestNumberRated: number;
        contestNumberUnrated: number;
        passNumber: number;
    }

    export class UserProfile {
        constructor(userName: string) {
            this.userName = userName;
        }

        /**
         * 生成文字版个人信息
         * @returns 返回转换后的文字
         */
        toMessage(): string {
            let res: string = "";
            res += `昵称: ${this.userName}\n`;
            res += `rating: ${this.rating}\n`;
            res += `排名: ${this.rank}名\n`;
            res += `参与场次：Rated${this.contestNumberRated}场，Unrated${this.contestNumberUnrated}场\n`
            res += `已过题数：${this.passNumber}\n`
            return res;
        }

        toString(): string { return JSON.stringify(this, null, 4); }

        /**
         * 根据用户名找对应的userID
         * @returns 无异常返回'OK'，否则返回错误信息
         */
        async getUserID(): Promise<string> {
            const url = `https://ac.nowcoder.com/acm/contest/rating-index?searchUserName=${this.userName}`;
            const document = await Tool.getWebsiteDocument(url);

            const table = document.getElementsByTagName('table')[0];
            if (table === undefined) {
                return USER_NOT_FOUND;
            }
            const td = table.getElementsByTagName('tr')[1].getElementsByTagName('td')[1];
            const name = td.getElementsByTagName('span')[0].innerHTML;
            if (name !== this.userName) {
                return USER_NOT_FOUND;
            }
            let profileURL = td.getElementsByTagName('a')[0].getAttribute('href').split('/');
            this.userID = profileURL[profileURL.length - 1];

            return 'OK';
        }

        /**
         * 通过用户名获取用户在牛客上的刷题/竞赛数据
         * @returns 无异常返回'OK'，否则返回错误信息
         */
        async getProfileData(): Promise<string> {
            let status = await this.getUserID();
            if (status !== 'OK') {
                return status;
            }

            {   // 用户主页
                const url = `https://ac.nowcoder.com/acm/contest/profile/${this.userID}`;
                const document = await Tool.getWebsiteDocument(url);

                const contestStateItems = document.getElementsByClassName('my-state-main')[0].getElementsByClassName('my-state-item');
                const rating = contestStateItems[0].getElementsByTagName('div')[0].innerHTML;
                this.rating = parseInt(rating);
                this.rank = contestStateItems[1].getElementsByTagName('div')[0].innerHTML;
                this.contestNumberRated = parseInt(contestStateItems[2].getElementsByTagName('div')[0].innerHTML);
                this.contestNumberUnrated = parseInt(contestStateItems[3].getElementsByTagName('div')[0].innerHTML);
            }

            {   // 用户练习页面
                const url = `https://ac.nowcoder.com/acm/contest/profile/${this.userID}/practice-coding`;
                const document = await Tool.getWebsiteDocument(url);

                const stateItems = document.getElementsByClassName('my-state-main')[0].getElementsByClassName('my-state-item');
                this.passNumber = parseInt(stateItems[1].getElementsByTagName('div')[0].innerHTML);
            }

            return status;
        }
    }

    interface Contest {
        contestName: string;
        countdown: string;
    }

    class Contest {
        toMessage(): string { return `${this.contestName}\n${this.countdown}`; }

        toString(): string { return JSON.stringify(this, null, 4); }
    }

    /**
     * 查询牛客竞赛最近的竞赛名称及时间
     * @param index 下标，范围为0-2
     * @returns 查询后的字符串
     */
    export async function getContest(index: number): Promise<string> {
        let contest = new Contest();
        const url = "https://ac.nowcoder.com";
        try {
            const document = await Tool.getWebsiteDocument(url);
            const acmList = document.getElementsByClassName('acm-list');
            const acmItems = acmList[0].getElementsByClassName('acm-item');
            contest.contestName = acmItems[index].getElementsByTagName('a')[0].innerHTML;
            contest.countdown = acmItems[index].getElementsByClassName('acm-item-time')[0].innerHTML.trim();

            return contest.toMessage();
        } catch (e) {
            logger.error(e);
            return e.message;
        }
    }

    /**
     * 根据用户名获取数据后返回一个UserProfile对象
     * @param userName 用户名
     * @returns 获取完数据的UserProfile对象
     */
    export async function initUserProfile(userName: string): Promise<UserProfile> {
        let userProfile: UserProfile = new UserProfile(userName);
        const status = await userProfile.getProfileData();
        if (status !== 'OK') {
            throw new Error(status);
        } else {
            return userProfile;
        }
    }

    /**
     * 查询牛客竞赛用户的个人信息
     * @param userName 用户名
     * @returns 查询后的字符串
     */
    export async function getProfile(userName: string): Promise<string> {
        try {
            let userProfile: UserProfile = await initUserProfile(userName);
            return `Niuke Profile:\n${userProfile.toMessage()}`;
        } catch (e) {
            return e.message;
        }
    }
}

/**
 * Atcoder相关函数
 */
export namespace Atcoder {
    export interface UserProfile {
        userName: string
        nowRating: number
        maxRating: number
        rank: string
        contestNumber: number
    }

    export class UserProfile {
        constructor(userName: string) {
            this.userName = userName;
            this.nowRating = 0;
            this.maxRating = 0;
            this.rank = 'NaN';
            this.contestNumber = 0;
        }

        /**
         * 生成文字版个人信息
         * @returns 返回转换后的文字
         */
        toMessage(): string {
            let res: string = `用户名：${this.userName}\n`
            res += `当前rating：${this.nowRating}\n`
            res += `最高rating：${this.maxRating}\n`
            res += `排名：${this.rank}\n`
            res += `参与场次：Rated${this.contestNumber}场`
            if (this.nowRating >= 2000) {
                res += '大神啊！\n';
            }
            return res;
        }

        toString(): string { return JSON.stringify(this, null, 4); }

        /**
         * 通过用户名获取用户在Atcoder上的竞赛数据
         * @returns 无异常返回'OK'，否则返回错误信息
         */
        async getProfileData(): Promise<string> {
            const url = `https://atcoder.jp/users/${this.userName}`;
            try {
                const document = await Tool.getWebsiteDocument(url);

                const main = document.getElementById('main-container');
                const mainDiv = main.getElementsByTagName('div')[0];
                const content = mainDiv.getElementsByTagName('div')[2].getElementsByTagName('table')[0];
                // 匹配用户存在但是没有rating信息的情况
                if (content === undefined) {
                    return;
                }
                const tds = content.getElementsByTagName('td');
                this.nowRating = parseInt(tds[1].getElementsByTagName('span')[0].innerHTML);
                this.maxRating = parseInt(tds[2].getElementsByTagName('span')[0].innerHTML);
                this.rank = tds[0].innerHTML;
                this.contestNumber = parseInt(tds[3].innerHTML);
                return 'OK'
            } catch (e) {
                logger.error(e);
                return e.message;
            }
        }
    }

    interface Contest {
        contestName: string;
        time: Date;
    }

    class Contest {
        toMessage(): string {
            let res: string = '';
            res += `${this.contestName}\n`
            const now: Date = new Date();
            const diff: Date = new Date(this.time.getTime() - now.getTime());
            res += `${(diff.getDate() === 1) ? "今天" : (diff.getDate() - 1 + "天后")}     ${String(this.time.getHours()).padStart(2, '0')}:${String(this.time.getMinutes()).padStart(2, '0')}`;
            return res;
        }

        toString(): string { return JSON.stringify(this, null, 4); }
    }

    /**
     * 查询Atcoder竞赛最近的竞赛名称及时间
     * @param index 下标，范围为0-12
     * @returns 查询后的字符串
     */
    export async function getContest(index: number): Promise<string> {
        let contest: Contest = new Contest();
        const url = 'https://atcoder.jp/home?lang=ja';
        try {
            const document = await Tool.getWebsiteDocument(url);

            const contestUpcoming = document.getElementById('contest-table-upcoming');
            const contestUpcomingTable = contestUpcoming.getElementsByTagName('table')[0];
            const contests = contestUpcomingTable.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
            contest.contestName = contests[index].getElementsByTagName('a')[1].innerHTML;
            const contestTime = contests[index].getElementsByTagName('a')[0].getElementsByTagName('time')[0];
            contest.time = new Date(contestTime.innerHTML);
            return contest.toMessage();
        } catch (e) {
            logger.error(e);
            return e.message;
        }
    }

    /**
     * 根据用户名获取数据后返回一个UserProfile对象
     * @param userName 用户名
     * @returns 获取完数据的UserProfile对象
     */
    export async function initUserProfile(userName: string): Promise<UserProfile> {
        let userProfile: UserProfile = new UserProfile(userName);
        const status = await userProfile.getProfileData();
        if (status !== 'OK') {
            throw new Error(status);
        } else {
            return userProfile;
        }
    }

    /**
     * 查询Atcoder用户的个人信息
     * @param userName Atcoder中的用户名
     * @returns 查询后的字符串
     */
    export async function getProfile(userName: string): Promise<string> {
        try {
            let userProfile: UserProfile = await initUserProfile(userName);
            return `Atcoder Profile:\n${userProfile.toMessage()}`;
        } catch (e) {
            return e.message;
        }
    }
}

/**
 * Codeforces相关函数
 */
export namespace Codeforces {
    /**
     * 为API设置key和secret，否则无法正常使用Codeforces的官方API
     * @param key 使用API需要的key
     * @param secret 使用API需要的secret
     */
    export function setCredentials(key: string, secret: string) {
        CodeforcesAPI.setCredentials({
            API_KEY: key,
            API_SECRET: secret,
        });
    }

    export interface UserProfile {
        userName: string;
        nowRating: number;
        maxRating: number;
        rank: string;
        maxRank: string;
        iconUrl: string;
    }

    export class UserProfile {
        constructor(userName: string) {
            this.userName = userName;
        }

        setValueByUser(user): void {
            this.userName = user.handle;
            this.nowRating = (user.rating === undefined) ? 0 : user.rating;
            this.maxRating = (user.maxRating === undefined) ? 0 : user.maxRating;
            this.rank = (user.rank === undefined) ? "Unrated" : user.rank;
            this.maxRank = (user.maxRank === undefined) ? "Unrated" : user.maxRank;
            this.iconUrl = user.titlePhoto;
        }

        /**
         * 生成文字版个人信息
         * @returns 返回转换后的文字
         */
        toMessage(): string {
            let res: string = "";
            res += `昵称: ${this.userName}\n`
            res += `rating: ${this.nowRating}\n`
            res += `等级: ${this.rank}\n`
            res += `最高rating: ${this.maxRating}\n`
            res += `最高等级: ${this.maxRank}\n`
            if (this.nowRating >= 2600) {
                res += '大神啊！\n'
            }
            return res;
        }

        toString(): string { return JSON.stringify(this, null, 4); }

        /**
         * 通过用户名获取用户在Codeforces上的刷题/竞赛数据
         * @returns 无异常返回'OK'，否则返回错误信息
         */
        async getProfileData(): Promise<string> {
            try {
                const response = await CodeforcesAPI.call("user.info", { handles: this.userName })
                if (response.status !== "OK") {
                    throw new Error(response.comment)
                }
                const user = response.result[0];
                if (user.handle !== this.userName) {
                    return '此用户不存在'
                }
                this.setValueByUser(user);
                return 'OK';
            } catch (e) {
                logger.error(e);
                return e.message;
            }
        }
    }

    /**
     * 查询Codeforces竞赛最近的竞赛名称及时间
     * @param index 查询即将到来的竞赛的下标
     * @returns 查询后的字符串
     */
    export async function getContest(index: number): Promise<string> {
        let message = "";
        try {
            const response = await CodeforcesAPI.call("contest.list", {})
            if (response.status !== "OK") {
                throw new Error(response.comment)
            }
            const contests = response.result;
            let begin: number = 0;
            while (contests[begin + 1].phase !== 'FINISHED') {
                begin++;
            }

            let name: string = contests[begin - index].name;
            // 此举是为了防止竞赛名含有url被qq识别然后被ban
            for (let i: number = 0; i < name.length - 1; i++) {
                if (name[i] === '.' && name[i + 1] !== ' ') {
                    name = name.slice(0, i + 1) + ' ' + name.slice(i + 1);
                }
            }

            message += `${name}\n`;
            const date: Date = new Date(contests[begin - index].startTimeSeconds * 1000);
            const diff = new Date(Math.abs(contests[begin - index].relativeTimeSeconds * 1000));
            message += `${(diff.getDate() === 1) ? "今天" : (diff.getDate() - 1 + "天后")}     ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            return message;
        } catch (e) {
            logger.error(e)
            return e.message
        }
    }

    /**
     * 根据用户名获取数据后返回一个UserProfile对象
     * @param userName 用户名
     * @returns 获取完数据的UserProfile对象
     */
    export async function initUserProfile(userName: string): Promise<UserProfile> {
        let userProfile: UserProfile = new UserProfile(userName);
        const status = await userProfile.getProfileData();
        if (status !== 'OK') {
            throw new Error(status);
        } else {
            return userProfile;
        }
    }

    /**
     * 查询Atcoder用户的个人信息
     * @param userName Atcoder中的用户名
     * @returns 查询后的字符串
     */
    export async function getProfile(userName: string): Promise<string> {
        try {
            let userProfile: UserProfile = await initUserProfile(userName);
            return `Codeforces Profile:\n${userProfile.toMessage()}`;
        } catch (e) {
            return e.message;
        }
    }
}