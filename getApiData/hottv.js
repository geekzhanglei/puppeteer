/**
 * function：获取本周浏览最多的数据作为数据源
 * author:zhanglei
 * date:2018.5.31
 */
const puppeteer = require('puppeteer');
const config = require('../config');

const {
    sleep,
    writeFileSync
} = require('../utils');

const globalVars = {
    url: `${config.renrenHost}/html/top/week_tv_list.html`,
    num: 50
}

async function getHotTv() {
    let result = [];
    console.log('Start visit 本周浏览最多剧集排行榜');

    // 启动一个浏览器
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        dumpio: false
    });
    console.log('--------启动浏览器成功--------')
    /* 第一个页面开启 */
    let page = await browser.newPage() // 开启一个新页面
    console.log('--------打开空白新页面成功--------')
    // 去人人影视每周排行榜页面
    await page.goto(globalVars.url, {
        waitUntil: 'networkidle2' // 网络空闲说明已加载完毕
    });
    console.log('--------进入人人影视每周排行榜页面--------')
    // 结果
    const _listResult = await page.evaluate((renrenhost) => {
        var $ = window.$;
        var items = $('.xy-list ul li');
        var res = [],
            it, cnName, enName, link, type, season, readNum, img, rank, year2kind, isRenew, level;

        if (items.length >= 1) {
            items.each((index, item) => {
                it = $(item)
                cnName = it.find('.info a strong').text();
                enName = it.find('.info a span').text();
                link = renrenhost + it.find('.info a').attr('href');
                console.log('link=',link)
                type = it.find('.info p').html().split('<br>')[0];
                season = it.find('.info p').html().split('<br>')[1].split('<span>')[0];
                readNum = it.find('.info p span').text();
                img = it.find('.img a img').attr('rel');

                rank = it.find('.a1 .f3').text();
                year2kind = it.find('.a1 p').text();
                res.push({
                    cnName,
                    enName,
                    link,
                    type,
                    season,
                    readNum,
                    img,
                    rank,
                    year2kind
                })
            });
        }
        return res;

    }, config.renrenHost).catch(e => e);

    console.log('--------输出数据：--------');
    console.dir(_listResult);

    // 关闭网页
    await page.close();
    console.log('--------页面已关闭---------')
    /* 轮询所有页面获得数据 */
    for (let i = 0, l = globalVars.num; i < l; i++) {
        page = await browser.newPage() // 开启一个新页面
        console.log(`--------即将跳转地址：${_listResult[i].link}---------`)
        await page.goto(_listResult[i].link, {
            waitUntil: 'networkidle2' // 网络空闲说明已加载完毕
        });
        console.log(`--------跳转${_listResult[i].link}成功---------`)

        // page.evaluate相当于页面注入js，所以内部console.log不会打印
        const _detailResult = await page.evaluate(async () => {
            let obj = {},
                director = [],
                cast = [];

            let img = $('.imglink img').attr('src');
            let tv = $('.fl-info .ib:eq(3) strong').text();
            $('.fl-info li:eq(9) a').each((index, ele) => {
                director.push(ele.text);
            })
            $('.fl-info .rel a').each((index, ele) => {
                cast.push(ele.text);
            })
            let resource = $('#resource-box .view-res-list a').attr('href');
            $('.resource-desc .con a').click();
            let des = $('.resource-desc .con span').text();
            let status = $('.resource-con .status dd span').text() || "未知";
            let isRenew = '未知';
            let level = '暂无';
            try {
                // 是否续订
                isRenew = $('.fl-info .tc span')[0].innerText;
            } catch {}
            try {
                // 分级
                level = $('.level-item img').attr('src').split('/').reverse()[0].slice(0, 1) || 'error';
            } catch {}
            obj = {
                isRenew,
                level,
                status,
                img,
                tv,
                director,
                cast,
                resource,
                des
            };
            return obj;
        }).catch(e => e);

        result[i] = Object.assign(_listResult[i], _detailResult);
        await page.close();
    }
    await sleep(3000);
    await browser.close();
    console.log("--------hottv最终数据：--------")
    console.dir(result);
    writeFileSync('./data/hottv.json', _listResult);
};

module.exports = {
    getHotTv
};
