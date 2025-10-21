import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';

// 定义网站的主机地址和用户代理
const ua = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36';

export const route: Route = {
    path: '/cninfo/announcement/:column/:code/:orgId/:category?/:search?',
    categories: ['finance'],
    example: '/financialview/cninfo/announcement/sse/688182/nssc1000567/all',
    parameters: {column:'漫画ID',code:'股票代码',orgId:'巨潮股票代码',category:'分类',searchKey:'标题关键字',},
    radar: [
    {
        source: ['www.cninfo.com.cn/*'],
        target: '/new/disclosure',
    },
    ],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '巨潮资讯',
    maintainers: ['YourName'],
    handler,
    url: 'http://www.cninfo.com.cn',
};

async function handler(ctx) {
    const column = ctx.params.column; // szse 深圳证券交易所; sse 上海证券交易所; hke 港股; fund 基金
    const code = ctx.params.code; //  股票代码
    const orgId = ctx.params.orgId;
    const category = ctx.params.category || 'all'; //  分类
    const searchKey = ctx.params.search || ''; //  标题关键字
    let plate = '';
  
    const rssUrl = `http://www.cninfo.com.cn/new/disclosure/stock?stockCode=${code}&orgId=${orgId}`;
    const apiUrl = `http://www.cninfo.com.cn/new/hisAnnouncement/query`;
    switch (column) {
        case 'szse':
            plate = 'sz';
            break;
        case 'sse':
            plate = 'sh';
            break;
        case 'third':
            plate = 'neeq';
            break;
        case 'hke':
            plate = 'hke';
            break;
        case 'fund':
            plate = 'fund';
            break;
    }
    const response = await got.post(apiUrl, {
        headers: {
            Referer: rssUrl,
        },
        form: {
            stock: `${code},${orgId}`,
            tabName: 'fulltext',
            pageSize: 30,
            pageNum: 1,
            column,
            category: category === 'all' ? '' : category,
            plate,
            seDate: '',
            searchkey: searchKey,
            secid: '',
            sortName: '',
            sortType: '',
            isHLtitle: true,
        },
    });
    // 获取列表
    const announcementsList = response.data.announcements;
    let name = '';   
    
    // 并发请求获取每个章节的详细信息
    let ecname = '';
    const out = announcementsList.map((item) => {
        const title = item.announcementTitle;
        const date = item.announcementTime;
        const announcementTime = new Date(item.announcementTime).toISOString().slice(0, 10);
        const link = 'http://www.cninfo.com.cn/new/disclosure/detail' + `?plate=${plate}` + `&orgId=${orgId}` + `&stockCode=${code}` + `&announcementId=${item.announcementId}` + `&announcementTime=${announcementTime}`;
        ecname = item.secName;

        const single = {
            title,
            link,
            pubDate: new Date(date).toUTCString(),
        };

        return single;
    });
    
    // 构造RSS feed的数据结构
    return {
        title: `${ecname}公告-巨潮资讯`,  //rsshub 订阅大标题
        link: rssUrl,  //rsshub 订阅链接
        item: items,  // rsshub 订阅链接 子项，页面展开
    };
}
