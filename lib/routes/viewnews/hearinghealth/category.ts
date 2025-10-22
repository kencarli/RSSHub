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

    // Using the provided specific selector for link elements
    const linkSelector = '#sticky > div > div > div > div > div.x-col.e10758-e9.m8au-m.m8au-n > div > div > a';
    
    const list = $(linkSelector)
        .toArray()
        .map((item) => {
            const $item = $(item);
            // Using the provided specific selector for title elements
            const $titleElement = $item.find('article > div.x-text.x-text-headline.e10758-e16.m8au-x.m8au-6 > div > div > h2');
            
            return {
                title: $titleElement.text().trim(),
                link: $item.attr('href')?.startsWith('http') 
                    ? $item.attr('href') 
                    : `${baseUrl}${$item.attr('href')}`,
            };
        })
        .filter((i) => i.title && i.link);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                try {
                    const { data: response } = await got(item.link);
                    const $ = load(response);

                    $('.pageLink, .alert, p[style="margin:15px;"]').remove();

                    // Using the provided specific selector for description elements
                    // Path: #x-site > main > article
                    item.description = $('#x-site > main > article').html() || '';
                    
                    // Targeting the specific date element with classes 'x-text x-content e10756-e12 m8as-s m8as-t'
                    const $dateElement = $('.x-text.x-content.e10756-e12.m8as-s.m8as-t');
                    if ($dateElement.length > 0) {
                        const dateText = $dateElement.text().trim();
                        if (dateText) {
                            // Parse the date text "October 15, 2025"
                            item.pubDate = timezone(parseDate(dateText, 'MMMM D, YYYY'), +8);
                        }
                    }

                    return item;
                } catch (err) {
                    // Error handling - keep item but without description and date
                    return item;
                }
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
