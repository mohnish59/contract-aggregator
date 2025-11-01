import { NextResponse } from 'next/server';
import axios from 'axios';
import connectDB from '../../../lib/db';
import Contract from '../../../models/Contract';

export async function GET() {
  await connectDB();
  try {
    const today = new Date();
    const fromDate = new Date(today.setDate(today.getDate() - 90)); // 90 days
    const postedFrom = fromDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const postedTo = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    const response = await axios.get('https://api.sam.gov/opportunities/v2/search', {
      params: {
        api_key: 'SAM-2cc1fbee-2822-466f-b9ec-127c492f1ead', // Your key
        postedFrom,
        postedTo,
        limit: 1000, // Max per call
        offset: 0, // First page only
      },
    });

    const data = response.data.opportunitiesData;
    const ops = data.map(item => ({
      updateOne: {
        filter: { noticeId: item.noticeId },
        update: { $set: {
          noticeId: item.noticeId,
          title: item.title,
          postedDate: new Date(item.postedDate),
          type: item.type,
          setAside: item.setAside,
          naicsCode: item.naicsCode,
          award: { amount: item.award?.amount || 0 },
          placeOfPerformance: { state: { code: item.placeOfPerformance?.state?.code || '' } },
        }},
        upsert: true,
      }
    }));

    const result = await Contract.bulkWrite(ops);
    return NextResponse.json({ message: 'Data fetched', count: result.upsertedCount + result.modifiedCount });
  } catch (error) {
    console.error('Fetch error:', error.message, error.response?.data);
    return NextResponse.json({ error: 'Fetch failed', details: error.message }, { status: 500 });
  }
}