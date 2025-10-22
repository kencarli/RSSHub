import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/hearinghealth/category/better-hearing-consumer/',
    categories: ['hearingnews'],
    example: '/hearinghealth/category/better-hearing-consumer/',
    //parameters: { column: '板块代码: bhc better-hearing-consumer; hnw hearing-news-watch ; he hearing-economics; ht hearing-technologies', },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '分类',
    maintainers: ['TonyRL'],
    handler,
};

async function handler(ctx) {
    const baseUrl = 'https://hearinghealthmatters.org'; // bhc better-hearing-consumer; hnw hearing-news-watch ; he hearing-economics; ht hearing-technologies
    const column = ctx.req.param('column'); //  bhc better-hearing-consumer; hnw hearing-news-watch ; he hearing-economics; ht hearing-technologies
    const url = `${baseUrl}/category/better-hearing-consumer/`;

    const { data: response } = await got(url);
    const $ = load(response);
    
    const list = $('#sticky > div > div > div > div > div.x-col.e10758-e9.m8au-m.m8au-n > div > div > a')
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.text().trim(),
                link: $item.attr('href')?.startsWith('http') 
                    ? $item.attr('href') 
                    : `${baseUrl}${$item.attr('href')}`,
            };
        })
        .filter((item) => item.title && item.link); // 过滤掉空标题或链接的项目

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                try {
                    const { data: response } = await got(item.link);
                    const $ = load(response);

                    item.description = $('.article').html() || '';
                    
                    const pubDateText = $('.article .date-selector').text(); // 使用更通用的选择器
                    if (pubDateText) {
                        item.pubDate = timezone(
                            parseDate(pubDateText.replace('时间:', '').trim(), 'YYYY-MM-DD HH:mm:ss'), 
                            +8
                        ).toUTCString();
                    }
                } catch (err) {
                    // 错误处理，保持项目但不添加描述和日期
                }

                return item;
            })
        )
    );

    return {
        title: $('head > title').text(),
        link: url,
        image: 'https://hearinghealthmatters.org/wp-content/uploads/2021/08/2Hearing-Health-Technology-Matters-logo.png',
        item: items,
    };
}
