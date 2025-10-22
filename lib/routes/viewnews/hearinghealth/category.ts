import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/hearinghealth/category/:listId?',
    categories: ['hearingnews'],
    example: '/hearinghealth/category',
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

    const list = $(listId === '1' ? '#sticky > div > div > div > div > div > div > div > a')
        .toArray()
        .map((item) => {
            item = $(item);
            return {
                title: item.find('> article > div > div > div > h2').text(),
                link: item.attr('href').startsWith('http') ? item.attr('href') : `${baseUrl}${item.attr('href')}`,
            };
        })
        //.filter((i) => !i.link.includes('m.0818tuan.com/tb1111.php'));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const { data: response } = await got(item.link);
                const $ = load(response);

                //$('.pageLink, .alert, p[style="margin:15px;"]').remove();

                item.description = $('.article').html();
                item.pubDate = timezone(parseDate($('.article > div > div > div > div > div > div > div > div').text().replace('时间:', ''), 'YYYY-MM-DD HH:mm:ss'), +8);

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
