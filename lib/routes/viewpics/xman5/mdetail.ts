import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';

// 定义漫画网站的主机地址和用户代理
const host = 'https://xman5.com';
const ua = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36';

export const route: Route = {
    path: '/xman5/mdetail/:id',
    example: '/xman5/mdetail/123',
    parameters: { id: '漫画ID' },
    radar: [
        {
            source: ['xman5.com/mdetail/*'],
            target: '/mdetail/:id',
        },
    ],
    name: 'X漫',
    maintainers: ['K33k0'],
    categories: ['X漫'],
    handler,
    url: 'https://xman5.com',
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    const url = host + `/mdetail/${id}`;    
    // 发起HTTP请求获取漫画详情页的内容
    const response = await got.get(url);
    const $ = load(response.data);
    
    // 获取漫画章节列表，反转数组并取前10章
    const list = $('#playlistbox > ul > li > a').get().reverse().slice(0, 10);
    
    // 并发请求获取每个章节的详细信息
    const items = await Promise.all(
        list.map(async (item) => {
            // 解析每个章节的链接和标题
            item = $(item);
            const itemLink = host + item.attr('href');
            const simple = {
                title: item.text(),
                link: itemLink,
            };
            
            try {
                // 具体页面限制手机UA
                const response = await got.get(itemLink, {
                    headers: {
                        'user-agent': ua,
                    },
                });
                const $ = load(response.body);
                
                // 获取章节内的所有图片
                const imgs = $('img');
                let picsArray = [];
                
                // 构造图片HTML字符串
                imgs.each((_, ele) => {
                    const $ele = $(ele);
                    const src = $ele.attr('data-original');
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
                // 如果获取详细信息失败，至少返回基本信息
                return simple;
            }
        })
    );
    
    // 构造RSS feed的数据结构
    const mainTitle = $('body > div.hot_banner > div.detail_list_box > div > div > div.content_detail.content_top.fl > div.pannel_head.clearfix > h1').text();
    return {
        title: 'X漫' + mainTitle,
        link: url,
        item: items,
    };
}
