import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/hearinghealth/category/:category?',
    categories: ['hearingnews'],
    example: '/hearinghealth/category/better-hearing-consumer',
    parameters: { category: 'Category slug, e.g. better-hearing-consumer, hearing-news-watch, hearing-economics, hearing-technologies' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'Category',
    maintainers: ['TonyRL'],
    handler,
    description: `| Better Hearing Consumer | Hearing News Watch | Hearing Economics | Hearing Technologies |
| -------------------- | ------------------ | ----------------- | ------------------ |
| better-hearing-consumer | hearing-news-watch | hearing-economics | hearing-technologies |`,
};

async function handler(ctx) {
    const baseUrl = 'https://hearinghealthmatters.org';
    const category = ctx.req.param('category') || 'better-hearing-consumer';
    const url = `${baseUrl}/category/${category}/`;

    const { data: response } = await got(url);
    const $ = load(response);

    const list = $('article')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const $link = $item.find('h2 a').first();
            
            return {
                title: $link.text().trim(),
                link: $link.attr('href') || '',
            };
        })
        .filter((i) => i.title && i.link);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const { data: response } = await got(item.link);
                const $ = load(response);

                $('.pageLink, .alert, p[style="margin:15px;"]').remove();

                item.description = $('.entry-content').html();
                item.pubDate = timezone(parseDate($('.entry-meta .updated').attr('datetime') || $('.entry-date').text().trim()), +8);

                return item;
            })
        )
    );

    return {
        title: $('head > title').text(),
        link: url,
        image: 'https://hearinghealthmatters.org/wp-content/uploads/2021/08/HHTM-Favicon-75x75.png',
        item: items,
    };
}
