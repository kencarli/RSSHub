import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';

// Define the host address and user agent for the website
const host = 'https://www.24me.cc/';
const ua = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36';

export const route: Route = {
    path: '/24me/mc/:id',
    example: '/24me/mc/123',
    parameters: { id: '漫画ID' },
    radar: [
        {
            source: ['24me.cc/mc:id.aspx'],
            target: '/24me/mc/:id',
        },
    ],
    name: '24me',
    maintainers: ['K33k0'],
    categories: ['picture'],
    handler,
    url: 'https://www.24me.cc/',
};

async function handler(ctx) {
    // Get the manga ID from URL parameters
    const id = ctx.req.param('id');
    // Construct the manga detail page URL
    const url = `${host}mc${id}.aspx`;
    
    // Make HTTP request to get the content of the manga detail page
    const response = await got.get(url);
    // Parse HTML with Cheerio
    const $ = load(response.data);
    
    // Get the manga chapter list
    const list = $('ul.imglist > li > a').get();

    // Concurrently fetch detailed information for each chapter
    const items = await Promise.all(
        list.map(async (item) => {
            // Parse the link and title for each chapter
            item = $(item);
            const itemLink = host + item.attr('href');
            const simple = {
                title: item.text(),
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
                
                // Get all images within the chapter
                const imgs = $('img');
                let picsArray = [];
                
                // Construct image HTML string
                imgs.each((_, ele) => {
                    const $ele = $(ele);
                    const src = $ele.attr('original');
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
    return {
        title: '24FA ' + $('body > section.newshow > header > h1').text(),
        link: url,
        description: '24FA ' + $('body > section.newshow > header > h1').text(),
        item: items,
    };
}
