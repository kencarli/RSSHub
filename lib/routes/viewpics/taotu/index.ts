import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';

// Define the host address and user agent for the website
const host = 'https://taotu.org';
const ua = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36';

export const route: Route = {
    path: '/taotu/picture',
    example: '/taotu/picture',
    radar: [
        {
            source: ['taotu.org/*'],
            target: '/',
        },
    ],
    name: 'taotu',
    maintainers: ['K33k0'],
    categories: ['picture'],
    handler,
    url: 'https://taotu.org',
};

async function handler(ctx) {
    const url = host + '/';
    // Make HTTP request to get the content of the page
    const response = await got.get(url);
    const $ = load(response.data);
    
    // Get the list of items
    const list = $('#MainContent_piclist > div > a').get();
    
    // Concurrently fetch detailed information for each item
    const items = await Promise.all(
        list.map(async (item) => {
            // Parse the link and title for each item
            item = $(item);
            const itemLink = host + item.attr('href');
            const simple = {
                title: item.find('> img').attr('alt'),
                link: itemLink,
            };
            
            try {
                // Specific page requires mobile UA
                const response = await got.get(itemLink, {
                    headers: {
                        'user-agent': ua,
                    },
                });
                const $ = load(response.body);
                
                // Get all images within the item
                const imgs = $('#MainContent_piclist > a > img');
                let picsArray = [];
                
                // Construct image HTML string
                imgs.each((_, ele) => {
                    const $ele = $(ele);
                    const src = $ele.attr('src');
                    if (src) {
                        picsArray.push(`<img src="${src}">`);
                    }
                });
                
                const pics = picsArray.join('');
                return {
                    ...simple,
                    description: pics
                };
            } catch (err) {
                // If fetching detailed info fails, at least return basic info
                return simple;
            }
        })
    );
    
    // Construct RSS feed data structure
    const mainTitle = $('#MainContent_suit_title > h1').text();
    return {
        title: 'taotu ' + mainTitle,
        link: url,
        description: 'taotu ' + mainTitle,
        item: items,
    };
}
