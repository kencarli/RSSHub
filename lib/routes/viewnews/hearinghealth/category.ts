import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/hearinghealth/category/:listId?',
    categories: ['hearingnews'],
    example: '/hearinghealth/category/1/',
    parameters: { listId: '活动分类，见下表，默认为 `1`' },
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
    description: `| better-hearing-consumer | hearing-news-watch | hearing-economics | hearing-technologies |
 | -------- | -------- | ------ | -------- |
 | 1        | 2        | 3      | 4        |`,
};

async function handler(ctx) {
    const baseUrl = 'https://hearinghealthmatters.org';
    const listId = ctx.req.param('listId') || '1';
    const url = `${baseUrl}/category/${listId}/`;

    const { data: response } = await got(url);
    const $ = load(response);

    const selector = listId === '3' 
        ? '#sticky > div > div > div > div > div.x-col.e10758-e9.m8au-m.m8au-n > div > div > a'
        : 'article h2 a'; // 更通用的选择器作为默认值

    const list = $(selector)
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
