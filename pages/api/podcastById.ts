'use server'
import type { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../app/api/db';
// @ts-ignore
import { PodcastById } from 'podcastdx-client/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PodcastById[] | { message: string }> // 指定响应类型
) {
  try {
    if (req.method === 'GET') {
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      const result:PodcastById = await client.podcastById(Number(id));
      res.status(200).json(result);
    } else if (req.method === 'POST') {
      const newUser: PodcastById = req.body; // 注意：实际应用中需要验证请求体
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