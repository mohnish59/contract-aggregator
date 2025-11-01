import { NextResponse } from 'next/server';
import axios from 'axios';
import connectDB from '../../../lib/db';
import Contract from '../../../models/Contract';

export async function GET() {
  await connectDB();
  try {
    const response = await axios.get('https://datacatalog.cookcountyil.gov/resource/qh8j-6k63.json', {
      params: {
        '$limit': 1000,
        '$order': 'award_date DESC'  // Recent first
      }
    });

    const data = response.data;
    const opportunities = data.map(item => ({
      title: item.contract_title || item.description,
      description: item.description || item.contract_title,
      postedDate: item.award_date ? new Date(item.award_date) : null,
      dueDate: item.end_date ? new Date(item.end_date) : null,
      award: { amount: item.contract_amount || 0 },
      link: item.contract_number ? `https://datacatalog.cookcountyil.gov/resource/qh8j-6k63?contract_number=${item.contract_number}` : '',
      source: 'il',
      placeOfPerformance: { state: { code: 'IL' } },
    }));

    const ops = opportunities.map(item => ({
      updateOne: {
        filter: { title: item.title, source: 'il' },
        update: { $set: item },
        upsert: true,
      }
    }));
    const result = await Contract.bulkWrite(ops);

    return NextResponse.json({ message: 'IL data fetched', count: result.upsertedCount + result.modifiedCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}