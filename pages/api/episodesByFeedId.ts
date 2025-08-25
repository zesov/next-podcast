'use server'
import type { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../app/api/db';
import {Espisode,FeaturedItem} from '../../app/types';
// @ts-ignore
import { PIApiEpisodeInfo } from 'podcastdx-client/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PIApiEpisodeInfo[] | { message: string }> // 指定响应类型
) {
  try {
    if (req.method === 'GET') {
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      const result = await client.episodesByFeedId(Number(id),{max:10});
      const espisodes: PIApiEpisodeInfo[] = result.items;
      res.status(200).json(espisodes);
    } else if (req.method === 'POST') {
      const newUser: PIApiEpisodeInfo = req.body; // 注意：实际应用中需要验证请求体
      // 将 newUser 保存到数据库...
      res.status(201).json({ message: 'User created successfully.' });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
}