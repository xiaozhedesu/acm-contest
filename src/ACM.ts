import { } from "koishi-plugin-puppeteer"
import { JSDOM } from 'jsdom'
import { CodeforcesAPI } from "codeforces-api-ts"
import { User } from 'codeforces-api-ts/dist/types';


// html转DOM元素进行操作的依赖
const { window } = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);

/**
 * 牛客相关函数
 */
export namespace Niuke {
    class UserProfile {
        userName: string;
        userID: string;
        rating: number;
        rank: string;
        contestNumberRated: number;
        contestNumberUnrated: number;
        passNumber: number;

        constructor(userName: string) {
            this.userName = userName;
        }

        toString() {
            let res: string = "";
            res += `昵称: ${this.userName}\n`;
            res += `rating: ${this.rating}\n`;
            res += `排名: ${this.rank}名\n`;
            res += `参与场次：Rated${this.contestNumberRated}场，Unrated${this.contestNumberUnrated}场\n`
            res += `已过题数：${this.passNumber}\n`
            return res;
        }
    }

    class Contest {
        contestName: string;
        countdown: string;

        toString() {
            return `${this.contestName}\n${this.countdown}`;
        }
    }

    /**
     * 查询牛客竞赛最近的竞赛名称及时间
     * @param index 下标，范围为0-2
     * @returns 查询后的字符串
     */
    export async function getContest(index: number) {
        let message = "";
        let contest = new Contest();
        const url = "https://ac.nowcoder.com";
        await fetch(url, { method: 'GET' })
            .then(response => {
                if (response.status === 200) {
                    return response.text()
                } else {
                    message = `HTTP:${response.status} error`;
                }
            })
            .then(htmlText => {
                // html文本转DOM
                const parser = new window.DOMParser();
                const doc: Document = parser.parseFromString(htmlText, 'text/html');

                const acmList = doc.getElementsByClassName('acm-list');
                const acmItems = acmList[0].getElementsByClassName('acm-item');
                contest.contestName = acmItems[index].getElementsByTagName('a')[0].innerHTML;
                contest.countdown = acmItems[index].getElementsByClassName('acm-item-time')[0].innerHTML.trim();
            }).catch(error => {
                console.error(error)
                message = error.toString();
            });
        message += contest.toString();
        return message;
    }

    /**
     * 通过用户名获取用户在牛客上的刷题/竞赛数据
     * @param user UserProfile对象，userName需要提前存入
     * @returns 异步程序的执行状态，无异常返回'OK'，否则返回错误信息
     */
    async function getProfileData(user: UserProfile) {
        let status: string = 'OK';
        // 通过用户名获取用户ID
        // 需要6个月内参加过一场牛客竞赛才能查到
        await fetch(`https://ac.nowcoder.com/acm/contest/rating-index?searchUserName=${user.userName}`)
            .then(response => {
                if (response.status === 200) {
                    return response.text()
                } else {
                    status = `HTTP:${response.status} error`;
                }
            })
            .then(htmlText => {
                if (status != 'OK') return status;
                // html文本转DOM
                const parser = new window.DOMParser();
                const doc: Document = parser.parseFromString(htmlText, 'text/html');

                const table = doc.getElementsByTagName('table')[0];
                if (table === undefined) {
                    status = '查无此人，请确认名称输入正确且6个月内参加过至少一场牛客竞赛';
                    return;
                }
                const td = table.getElementsByTagName('tr')[1].getElementsByTagName('td')[1];
                let profileURL = td.getElementsByTagName('a')[0].getAttribute('href').split('/');
                user.userID = profileURL[profileURL.length - 1];
            }).catch(error => {
                console.error(error)
                status = error.toString();
            });
        if (status != 'OK') return status;

        await fetch(`https://ac.nowcoder.com/acm/contest/profile/${user.userID}`)
            .then(response => {
                if (response.status === 200) {
                    return response.text()
                } else {
                    status = `HTTP:${response.status} error`;
                }
            })
            .then(htmlText => {
                // html文本转DOM
                const parser = new window.DOMParser();
                const doc: Document = parser.parseFromString(htmlText, 'text/html');

                const contestStateItems = doc.getElementsByClassName('my-state-main')[0].getElementsByClassName('my-state-item');
                const rating = contestStateItems[0].getElementsByTagName('div')[0].innerHTML;
                user.rating = parseInt(rating);
                user.rank = contestStateItems[1].getElementsByTagName('div')[0].innerHTML;
                user.contestNumberRated = parseInt(contestStateItems[2].getElementsByTagName('div')[0].innerHTML);
                user.contestNumberUnrated = parseInt(contestStateItems[3].getElementsByTagName('div')[0].innerHTML);
            }).catch(error => {
                console.error(error)
                status = error.toString();
            });
        if (status != 'OK') return status;

        await fetch(`https://ac.nowcoder.com/acm/contest/profile/${user.userID}/practice-coding`)
            .then(response => {
                if (response.status === 200) {
                    return response.text()
                } else {
                    status = `HTTP:${response.status} error`;
                }
            })
            .then(htmlText => {
                // html文本转DOM
                const parser = new window.DOMParser();
                const doc: Document = parser.parseFromString(htmlText, 'text/html');

                const stateItems = doc.getElementsByClassName('my-state-main')[0].getElementsByClassName('my-state-item');
                user.passNumber = parseInt(stateItems[1].getElementsByTagName('div')[0].innerHTML);
            }).catch(error => {
                console.error(error)
                status = error.toString();
            });
        return status;
    }

    /**
     * 查询牛客竞赛用户的个人信息
     * @param userName 用户名
     * @returns 查询后的字符串
     */
    export async function getProfile(userName: string) {
        let message = "Niuke Profile:\n"
        let user: UserProfile = new UserProfile(userName);
        let status = await getProfileData(user);
        if (status !== 'OK') {
            return status;
        }
        message += user.toString();
        return message;
    }
}

/**
 * Atcoder相关函数
 */
export namespace Atcoder {
    class UserProfile {
        userName: string
        nowRating: number
        maxRating: number
        rank: string
        contestNumber: number

        constructor(userName: string) {
            this.userName = userName;
        }

        toString() {
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
    }

    class Contest {
        contestName: string;
        time: Date;

        toString() {
            let res: string = '';
            res += `${this.contestName}\n`
            const now: Date = new Date();
            const diff: Date = new Date(this.time.getTime() - now.getTime());
            res += `${(diff.getDate() === 1) ? "今天" : (diff.getDate() - 1 + "天后")}     ${String(this.time.getHours()).padStart(2, '0')}:${String(this.time.getMinutes()).padStart(2, '0')}`;
            return res;
        }
    }

    /**
     * 查询Atcoder竞赛最近的竞赛名称及时间
     * @param index 下标，范围为0-12
     * @returns 查询后的字符串
     */
    export async function getContest(index: number) {
        let message = "";
        let contest: Contest = new Contest();
        await fetch('https://atcoder.jp/home?lang=ja')
            .then(response => {
                if (response.status === 200) {
                    return response.text()
                } else {
                    message = `HTTP:${response.status} error`;
                }
            })
            .then(htmlText => {
                // html文本转DOM
                const parser = new window.DOMParser();
                const doc: Document = parser.parseFromString(htmlText, 'text/html');

                const contestUpcoming = doc.getElementById('contest-table-upcoming');
                const contestUpcomingTable = contestUpcoming.getElementsByTagName('table')[0];
                const contests = contestUpcomingTable.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                contest.contestName = contests[index].getElementsByTagName('a')[1].innerHTML;
                const contestTime = contests[index].getElementsByTagName('a')[0].getElementsByTagName('time')[0];
                contest.time = new Date(contestTime.innerHTML);
            }).catch(error => {
                console.error(error)
                message = error.toString();
            });
        message += contest.toString();
        return message;
    }

    /**
     * 通过用户名获取用户在Atcoder上的竞赛数据
     * @param user UserProfile对象，userName需要提前存入
     * @returns 异步程序的执行状态，无异常返回'OK'，否则返回错误信息
     */
    async function getProfileData(user: UserProfile) {
        let status = 'OK'
        await fetch(`https://atcoder.jp/users/${user.userName}`)
            .then(response => {
                if (response.status === 200) {
                    return response.text()
                } else {
                    status = `HTTP:${response.status} error`;
                }
            })
            .then(htmlText => {
                if (status != 'OK') return status;
                // html文本转DOM
                const parser = new window.DOMParser();
                const doc: Document = parser.parseFromString(htmlText, 'text/html');

                const main = doc.getElementById('main-container');
                const mainDiv = main.getElementsByTagName('div')[0];
                const content = mainDiv.getElementsByTagName('div')[2].getElementsByTagName('table')[0];
                // 匹配用户存在但是没有rating信息的情况
                if (content === undefined) {
                    user.nowRating = 0;
                    user.maxRating = 0;
                    user.rank = 'NaN';
                    user.contestNumber = 0;
                    return;
                }
                const tds = content.getElementsByTagName('td');
                user.nowRating = parseInt(tds[1].getElementsByTagName('span')[0].innerHTML);
                user.maxRating = parseInt(tds[2].getElementsByTagName('span')[0].innerHTML);
                user.rank = tds[0].innerHTML;
                user.contestNumber = parseInt(tds[3].innerHTML);
            }).catch(error => {
                console.error(error)
                status = error.toString();
            });
        return status;
    }

    /**
     * 查询Atcoder用户的个人信息
     * @param userName Atcoder中的用户名
     * @returns 查询后的字符串
     */
    export async function getProfile(userName: string) {
        let message = "Atcoder Profile:\n";
        let user = new UserProfile(userName);
        let status = await getProfileData(user);
        if (status !== 'OK') {
            return status;
        }
        message += user.toString();
        return message;
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

    class UserProfile {
        userName: string;
        nowRating: number;
        maxRating: number;
        rank: string;
        maxRank: string;
        iconUrl: string;

        constructor(userName: string) {
            this.userName = userName;
        }

        setValueByUser(user: User): void {
            this.userName = user.handle;
            this.nowRating = (user.rating === undefined) ? 0 : user.rating;
            this.maxRating = (user.maxRating === undefined) ? 0 : user.maxRating;
            this.rank = (user.rank === undefined) ? "Unrated" : user.rank;
            this.maxRank = (user.maxRank === undefined) ? "Unrated" : user.maxRank;
            this.iconUrl = user.titlePhoto;
        }

        toString() {
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
    }

    /**
     * 查询Codeforces竞赛最近的竞赛名称及时间
     * @param index 查询即将到来的竞赛的下标
     * @returns 查询后的字符串
     */
    export async function getContest(index: number) {
        let message = "";

        await CodeforcesAPI.call("contest.list", {})
            .then(response => {
                if (response.status == "OK") {
                    const contests = response.result;
                    let begin: number = 0;
                    while (contests[begin + 1].phase !== 'FINISHED') {
                        begin++;
                    }

                    let name: string = contests[begin - index].name;
                    for (let i: number = 0; i < name.length - 1; i++) {
                        if (name[i] === '.' && name[i + 1] !== ' ') {
                            // 此举是为了防止竞赛名含有url被qq识别然后被ban
                            name = name.slice(0, i + 1) + ' ' + name.slice(i + 1);
                        }
                    }

                    message += `${name}\n`;
                    const date: Date = new Date(contests[begin - index].startTimeSeconds * 1000);
                    const diff = new Date(Math.abs(contests[begin - index].relativeTimeSeconds * 1000));
                    message += `${(diff.getDate() === 1) ? "今天" : (diff.getDate() - 1 + "天后")}     ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                } else {
                    message = response.comment;
                }
            }).catch(error => {
                console.error(error)
                message = error.toString();
            });
        return message;
    }

    /**
     * 通过用户名获取用户在Codeforces上的竞赛数据
     * @param user UserProfile对象，userName需要提前存入
     * @returns 异步程序的执行状态，无异常返回'OK'，否则返回错误信息
     */
    async function getProfileData(userProfile: UserProfile) {
        let status = "OK";
        await CodeforcesAPI.call("user.info", { handles: userProfile.userName }).then(response => {
            if (response.status === "OK") {
                const user: User = response.result[0];
                userProfile.setValueByUser(user);
            } else {
                if (response.comment === "apiKey: Incorrect signature") {
                    status = "配置项的secret不正确"
                } else if (response.comment === "apiKey: Incorrect API key") {
                    status = "配置项的key不正确"
                } else if (response.comment === `handles: User with handle ${userProfile.userName} not found`) {
                    status = `此用户不存在`
                } else {
                    status = response.comment;
                }
            }
        }).catch(error => {
            console.error(error);
            status = error.toString();
        });
        return status;
    }

    /**
     * 查询CodeForces用户的个人信息
     * @param userName 用户名
     * @returns 查询后的字符串
     */
    export async function getProfile(userName: string) {
        let message = "CodeForces Profile:\n";
        let user: UserProfile = new UserProfile(userName);
        let status = await getProfileData(user);
        if (status !== 'OK') {
            return status;
        }
        message += user.toString();
        return message;
    }
}