#!/usr/bin/env node

/**
 * scripts/notify-feishu.mjs
 *
 * 飞书通知集成助手：
 * 复用 Syno 管家已绑定的飞书机器人与 Owner 凭据，向主人推送研发流水线动态。
 */

import * as lark from '@larksuiteoapi/node-sdk';
import { FeishuCredentialStore } from '../packages/syno-core/feishu-channel.mjs';

let cachedClient = null;
let cachedOwnerId = null;

async function getLarkContext() {
  if (cachedClient && cachedOwnerId) {
    return { client: cachedClient, ownerOpenId: cachedOwnerId };
  }
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret || !cred?.ownerOpenId) {
    return null;
  }
  const client = new lark.Client({
    appId: cred.appId,
    appSecret: cred.appSecret,
    domain: lark.Domain.Feishu,
  });
  cachedClient = client;
  cachedOwnerId = cred.ownerOpenId;
  return { client, ownerOpenId: cred.ownerOpenId };
}

/**
 * 发送飞书富文本/卡片通知
 */
export async function sendFeishuNotification({ title, content, url, status = 'info' }) {
  try {
    const ctx = await getLarkContext();
    if (!ctx) {
      console.warn('[Feishu Warning] 飞书凭据未配置或未绑定 Owner，跳过飞书通知');
      return false;
    }

    const { client, ownerOpenId } = ctx;

    // 颜色配置
    const headerTemplate = status === 'success' ? 'green' : status === 'warning' ? 'orange' : status === 'error' ? 'red' : 'blue';

    const card = {
      config: { wide_screen_mode: true },
      header: {
        template: headerTemplate,
        title: { tag: 'plain_text', content: title }
      },
      elements: [
        {
          tag: 'markdown',
          content
        }
      ]
    };

    if (url) {
      card.elements.push({
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '查看 PR 详情' },
            type: 'primary',
            url
          }
        ]
      });
    }

    await client.im.v1.message.create({
      params: { receive_id_type: 'open_id' },
      data: {
        receive_id: ownerOpenId,
        msg_type: 'interactive',
        content: JSON.stringify(card)
      }
    });

    return true;
  } catch (err) {
    console.warn(`[Feishu Warning] 飞书通知发送失败: ${err.message}`);
    return false;
  }
}

// 命令行直接测试支持
if (process.argv[1] && process.argv[1].endsWith('notify-feishu.mjs')) {
  const title = process.argv[2] || '流水线通知';
  const content = process.argv[3] || '这是一条来自研发流水线的测试通知。';
  sendFeishuNotification({ title, content, status: 'info' })
    .then(ok => console.log('发送完成，状态:', ok))
    .catch(err => console.error(err));
}
