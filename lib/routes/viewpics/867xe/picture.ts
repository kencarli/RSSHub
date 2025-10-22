import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';

// 定义漫画网站的主机地址和用户代理
const host = 'https://www.867xe.com/';
const ua = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36';

export const route: Route = {
    path: '/867xe/picture',
    example: '/viewpics/867xe/picture',
    parameters: { id: '漫画ID' },
    radar: [
        {
            source: ['867xe.com/867xe-tupianqu/YSE/*'],
            target: '/867xe-tupianqu',
        },
    ],
    name: '867xe',
    maintainers: ['K33k0'],
    categories: ['图片'],
    handler,
    url: 'https://www.867xe.com/',
};

async function handler(ctx) {
    const url = host + `/867xe-tupianqu/YSE/`;    
    // 发起HTTP请求获取详情页的内容
    const response = await got.get(url);
    const $ = load(response.data);
    
    // 获取列表
    const list = $('col-60 > li > a').get();
    
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
                    const src = $ele.attr('src');
                    if (src) {
                        picsArray.push(`<img src="${encodeURIComponent(src)}">`);
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
    const mainTitle = $('div.info > h1').text();
    return {
        title: '867xe ' + mainTitle,
        link: url,
        item: items,
    };
}
