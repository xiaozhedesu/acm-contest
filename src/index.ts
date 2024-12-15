import { Context, Schema, Logger, segment } from 'koishi'
import { } from "koishi-plugin-puppeteer"
import { Niuke, Codeforces, Atcoder } from './ACM'

export const name = 'acm-contest'

export const logger = new Logger("acm-contest");

// 定义Config
export interface Config {
  key: string
  secret: string
}

// 给binding表添加字段
declare module 'koishi' {
  interface Binding {
    niukeName: string,
    atcName: string,
    cfName: string
  }
}

// 参数
export const Config: Schema<Config> = Schema.object({
  key: Schema.string().role('secret')
    .description('从Codeforces上获取的使用官方api使用的key'),
  secret: Schema.string().role('secret')
    .description('从Codeforces上获取的使用官方api使用的secret')
}).description('Codeforces访问设置');


/**
 * 算法竞赛插件主体
 * @param ctx 
 * @param config 配置参数
 */
export function apply(ctx: Context, config: Config) {
  ctx.model.extend('binding', {
    niukeName: 'string',
    atcName: 'string',
    cfName: 'string'
  })

  if (config.key === "" || config.secret === "") {
    logger.warn("Codeforces key或secret为空，相关功能可能无法正常使用。");
  } else {
    Codeforces.setCredentials(config.key, config.secret);
  }

  // 算法竞赛总指令，方便统一查看指令，以及让help菜单不那么臃肿
  ctx.command('算法竞赛', '算法竞赛总指令，功能由子指令实现')
    .action(({ session }) => {
      session.execute('help 算法竞赛')
      // return '使用"help 算法竞赛"查看更多指令';
    })

  ctx.command('算法竞赛')
    .subcommand('最近竞赛', '查看最近竞赛').alias('acm')
    .usage('目前支持查询的竞赛oj：牛客、Atcoder、CodeForces')
    .usage('总查询只会查各个oj的最近一场竞赛，想看更多请单独查找')
    .action(async ({ session }) => {
      return `最近的竞赛：\n牛客： \n${await Niuke.getContest(0)}\n\nAtcoder： \n${await Atcoder.getContest(0)}\n\nCodeforces：\n${await Codeforces.getContest(0)}`;
    })

  ctx.command('算法竞赛')
    .subcommand('牛客竞赛', '查看牛客最近竞赛').alias('niuke')
    .usage('查询牛客竞赛的最近三场比赛')
    .action(async ({ session }) => {
      try {
        let page = await ctx.puppeteer.page();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto('https://ac.nowcoder.com/')
        await page.waitForNetworkIdle();
        const contestBox = await page.$('.home-match-item');
        return segment.image(await contestBox.screenshot(), "image/png");
      } catch (e) {
        logger.error(e);
      }
    });

  ctx.command('算法竞赛')
    .subcommand('牛客绑定 <userName:string>', '绑定牛客昵称').alias('niukebind')
    .usage('绑定成功后可以通过"/牛客个人信息"指令不传入参数查到对应信息')
    .action(async ({ session }, userName) => {
      if (userName == undefined) return `给个名字吧朋友，不然我查谁呢`
      let userId: string = session.event.user.id;
      await ctx.database.set('binding', { pid: userId }, { niukeName: userName })
      return "绑定成功";
    })

  ctx.command('算法竞赛')
    .subcommand('牛客个人信息 <userName:string>', '查询牛客上指定用户的信息').alias('niukeProfile')
    .action(async ({ session }, userName) => {
      if (userName === undefined) {
        let userId: string = session.event.user.id;
        let userData = await ctx.database.get('binding', { pid: userId })
        if (userData.length === 0 || userData[0].niukeName === undefined || userData[0].niukeName === '') {
          return `给个名字吧朋友，不然我查谁呢`;
        }
        userName = userData[0].niukeName;
      }
      return await Niuke.getProfile(userName);
    })

  ctx.command('算法竞赛')
    .subcommand('牛客竞赛日历', '查看牛客的竞赛日历').alias('niukeCalendar')
    .action(async ({ session }) => {
      try {
        let page = await ctx.puppeteer.page();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto('https://ac.nowcoder.com/acm/contest/calendar')
        await page.waitForNetworkIdle();
        const contestBox = await page.$('.date-table');
        return segment.image(await contestBox.screenshot(), "image/png");
      } catch (e) {
        logger.error(e);
      }
    });

  ctx.command('算法竞赛')
    .subcommand('Atcoder竞赛', '查看Atcoder最近竞赛').alias('atc')
    .usage('查询Atcoder的最近十场比赛')
    .action(async ({ session }) => {
      try {
        let page = await ctx.puppeteer.page();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto('https://atcoder.jp/contests?lang=ja')
        await page.waitForNetworkIdle();
        const contestBox = await page.$('#contest-table-upcoming');
        return segment.image(await contestBox.screenshot(), "image/png");
      } catch (e) {
        logger.error(e);
      }
    })

  ctx.command('算法竞赛')
    .subcommand('Atcoder绑定 <userName:string>', '绑定Atcoder昵称').alias('atcbind')
    .usage('绑定成功后可以通过"/Atcoder个人信息"指令不传入参数查到对应信息')
    .action(async ({ session }, userName) => {
      if (userName == undefined) return `给个名字吧朋友，不然我查谁呢`
      let userId: string = session.event.user.id;
      await ctx.database.set('binding', { pid: userId }, { atcName: userName })
      return "绑定成功";
    })

  ctx.command('算法竞赛')
    .subcommand('Atcoder个人信息 <userName:string>', '查询Atcoder上指定用户的信息').alias('atcprofile')
    .action(async ({ session }, userName: string) => {
      if (userName === undefined || userName === '') {
        let userId: string = session.event.user.id;
        let userData = await ctx.database.get('binding', { pid: userId })
        if (userData.length === 0 || userData[0].atcName === undefined || userData[0].atcName === '') {
          return `给个名字吧朋友，不然我查谁呢`;
        }
        userName = userData[0].atcName;
      }
      return await Atcoder.getProfile(userName);
    })

  ctx.command('算法竞赛')
    .subcommand('Codeforces竞赛', '查看Codeforces最近竞赛').alias('cf')
    .usage('查询Codeforces竞赛的最近三场比赛')
    .action(async ({ session }) => {
      let contests: string[] = ['', '', ''];
      for (let i: number = 0; i < 3; i++) {
        contests[i] = await Codeforces.getContest(i);
      }

      return `最近的Codeforces竞赛：\n${contests[0]}\n\n${contests[1]}\n\n${contests[2]}`;
    });

  ctx.command('算法竞赛')
    .subcommand('Codeforces绑定 <userName:string>', '绑定Codeforces昵称').alias('cfbind')
    .usage('绑定成功后可以通过"/Codeforces个人信息"指令不传入参数查到对应信息')
    .action(async ({ session }, userName) => {
      if (userName == undefined) return `给个名字吧朋友，不然我查谁呢`
      let userId: string = session.event.user.id;
      await ctx.database.set('binding', { pid: userId }, { cfName: userName })
      return "绑定成功";
    })

  ctx.command('算法竞赛')
    .subcommand('Codeforces个人信息 <userName:string>', '查询Codeforces上指定用户的信息').alias('cfprofile')
    .action(async ({ session }, userName) => {
      if (userName === undefined) {
        let userId: string = session.event.user.id;
        let userData = await ctx.database.get('binding', { pid: userId })
        if (userData.length === 0 || userData[0].cfName === undefined || userData[0].cfName === '') {
          return `给个名字吧朋友，不然我查谁呢`;
        }
        userName = userData[0].cfName;
      }
      return Codeforces.getProfile(userName);
    })

  ctx.command('算法竞赛')
    .subcommand('洛谷竞赛', '查看洛谷最近竞赛').alias('luogu')
    .usage('查询洛谷的最近六场比赛')
    .action(async ({ session }) => {
      try {
        let page = await ctx.puppeteer.page();
        await page.setViewport({ width: 1060, height: 1080 });
        await page.goto('https://www.luogu.com.cn/')
        await page.waitForNetworkIdle();
        const contestBox = await (await page.$('.am-u-lg-9')).$(".lg-article");
        return segment.image(await contestBox.screenshot(), "image/png");
      } catch (e) {
        logger.error(e);
      }
    })
}
